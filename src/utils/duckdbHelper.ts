import * as duckdb from '@duckdb/duckdb-wasm';
import type { POSAnalysisRow } from '../hooks/usePOSData';

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm', import.meta.url).href,
    mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).href,
  },
  eh: {
    mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm', import.meta.url).href,
    mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).href,
  },
};

let db: duckdb.AsyncDuckDB | null = null;

export async function initDuckDB() {
  if (db) return db;

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return db;
}

// --- Fuzzy Schema Mapper ---
function fuzzyMapHeader(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h.includes('cat') || h.includes('type') || h.includes('dept')) return 'category';
  if (h.includes('price') || h.includes('sell') || h.includes('cost') || h.includes('amount')) return 'price';
  if (h.includes('qty') || h.includes('quant') || h.includes('count') || h.includes('vol')) return 'quantity';
  if (h.includes('sku') || h.includes('item') || h.includes('prod') || h.includes('name') || h.includes('title')) return 'sku';
  if (h.includes('date') || h.includes('time') || h.includes('day')) return 'date';
  return header; // fallback
}

export async function loadCSVAndAnalyze(csvText: string): Promise<POSAnalysisRow[]> {
  // 1. Extract and fuzzy-match the header row
  const newlineIdx = csvText.indexOf('\n');
  if (newlineIdx === -1) throw new Error('Invalid CSV: No newline found.');
  
  const rawHeader = csvText.substring(0, newlineIdx);
  const mappedHeader = rawHeader.split(',').map(col => fuzzyMapHeader(col.trim())).join(',');
  const transformedCsv = mappedHeader + csvText.substring(newlineIdx);

  const database = await initDuckDB();
  const importId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fileName = `sales_${importId}.csv`;
  const tableName = `sales_${importId}`;
  await database.registerFileText(fileName, transformedCsv);

  const conn = await database.connect();

  try {
    await conn.insertCSVFromPath(fileName, {
      schema: 'main',
      name: tableName,
      header: true,
      detect: true
    });

    const metricsResult = await conn.query(`
      SELECT 
        category, 
        SUM(price * quantity) as total_revenue,
        SUM(quantity) as total_quantity
      FROM ${tableName}
      GROUP BY category
      ORDER BY total_revenue DESC
    `);

    return metricsResult.toArray().map((row) => {
      const json = row.toJSON() as Record<string, unknown>
      return {
        category: String(json.category ?? 'Unknown'),
        total_revenue: Number(json.total_revenue ?? 0),
        total_quantity: Number(json.total_quantity ?? 0),
      }
    });
  } finally {
    await conn.query(`DROP TABLE IF EXISTS ${tableName}`);
    await conn.close();
    await database.dropFile(fileName);
  }
}
