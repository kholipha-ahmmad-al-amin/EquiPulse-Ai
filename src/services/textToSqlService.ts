import { generateAiContent } from '../utils/aiClient';

export interface SqlTranslationResult {
  sql: string;
  error?: string;
}

// Predefined database schemas for inventory, sales, and sales_items tables.
export const PREDEFINED_SCHEMAS = `
-- Inventory table containing products, current stock, cost price, selling price, thresholds, and metadata.
CREATE TABLE inventory (
  id VARCHAR PRIMARY KEY,                  -- Unique ID for the inventory item (often a UUID)
  sku VARCHAR,                            -- Stock Keeping Unit identifier
  barcode VARCHAR,                        -- Barcode number
  name VARCHAR NOT NULL,                  -- Name of the item
  quantity DOUBLE NOT NULL,               -- Current quantity in stock (can be negative if oversold)
  unit VARCHAR,                           -- Unit of measurement (e.g., 'pcs', 'kg', 'ltr', 'bag')
  minThreshold DOUBLE,                    -- Reorder threshold (alert if quantity <= minThreshold)
  price DOUBLE NOT NULL,                  -- Selling price (retail price)
  unitPrice DOUBLE,                       -- Base unit price
  costPrice DOUBLE,                       -- Cost price (wholesale cost to buy the item)
  wholesalePrice DOUBLE,                  -- Wholesale selling price
  retailPrice DOUBLE,                     -- Retail selling price (usually same as price)
  loyaltyPrice DOUBLE,                    -- Price for loyalty customers
  supplierName VARCHAR,                   -- Name of the supplier
  category VARCHAR,                       -- Category (e.g. 'grocery', 'pharmacy', 'electronics')
  expiryDate VARCHAR,                     -- Expiry date of the batch (YYYY-MM-DD)
  batchNo VARCHAR,                        -- Batch number
  taxRate DOUBLE,                         -- Tax percentage rate (e.g., 5.0 for 5%)
  size VARCHAR,                           -- Physical size
  color VARCHAR,                          -- Color
  lastRestockedAt VARCHAR,                -- Timestamp when last restocked
  warehouseQuantity DOUBLE,               -- Quantity stored in the main warehouse
  isBundle BOOLEAN,                       -- True if item is a bundle of other items
  hasSerial BOOLEAN                       -- True if item has serial numbers
);

-- Sales table containing transaction metadata.
CREATE TABLE sales (
  id VARCHAR PRIMARY KEY,                  -- Unique transaction ID (UUID)
  type VARCHAR,                           -- Type of transaction ('sale', 'expense', 'credit_payment', 'cash_in', 'cash_out')
  amount DOUBLE NOT NULL,                 -- Total transaction amount after discounts
  note VARCHAR,                           -- Transaction note
  paymentMethod VARCHAR,                  -- Payment method ('cash', 'bkash', 'nagad', 'rocket', 'bank', etc.)
  referenceId VARCHAR,                    -- Reference ID
  cashierId VARCHAR,                      -- ID of the cashier who processed the sale
  cashierName VARCHAR,                    -- Name of the cashier
  timestamp TIMESTAMP NOT NULL,           -- ISO 8601 timestamp of transaction (YYYY-MM-DDTHH:MM:SSZ)
  items STRUCT(                           -- Nested list of product line items (Alternative access)
    itemId VARCHAR,
    name VARCHAR,
    quantity DOUBLE,
    unitPrice DOUBLE,
    lineTotal DOUBLE
  )[],
  payments STRUCT(                        -- Nested list of payment details (Alternative access)
    method VARCHAR,
    amount DOUBLE,
    reference VARCHAR
  )[]
);

-- Sales Items table containing detailed line items for each transaction.
CREATE TABLE sales_items (
  id VARCHAR PRIMARY KEY,                  -- Unique line item ID
  sale_id VARCHAR REFERENCES sales(id),    -- Foreign key linking to sales table
  item_id VARCHAR REFERENCES inventory(id), -- Foreign key linking to inventory table
  name VARCHAR NOT NULL,                  -- Name of the item at the time of sale
  quantity DOUBLE NOT NULL,               -- Quantity sold in this transaction
  unit_price DOUBLE NOT NULL,             -- Price per unit sold (selling price)
  line_total DOUBLE NOT NULL,             -- Total for this line item (quantity * unit_price)
  serial_number VARCHAR                   -- Optional serial number if applicable
);
`;

/**
 * Strips comments from SQL, respecting string literals and dollar quotes.
 */
export function stripComments(sql: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;
  let result = '';
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // Handle escapes inside quotes
    if (char === '\\' && (inSingleQuote || inDoubleQuote)) {
      result += char + nextChar;
      i += 2;
      continue;
    }

    if (inSingleQuote) {
      if (char === "'") inSingleQuote = false;
      result += char;
      i++;
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"') inDoubleQuote = false;
      result += char;
      i++;
      continue;
    }

    if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        result += '$$';
        i += 2;
      } else {
        result += char;
        i++;
      }
      continue;
    }

    // Check for comment starts
    if (char === '-' && nextChar === '-') {
      i += 2;
      while (i < sql.length && sql[i] !== '\n' && sql[i] !== '\r') {
        i++;
      }
      continue;
    }

    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && (sql[i + 1] || '') === '/')) {
        i++;
      }
      i += 2; // skip closing */
      continue;
    }

    // Entering quotes
    if (char === "'") {
      inSingleQuote = true;
      result += char;
      i++;
    } else if (char === '"') {
      inDoubleQuote = true;
      result += char;
      i++;
    } else if (char === '$' && nextChar === '$') {
      inDollarQuote = true;
      result += '$$';
      i += 2;
    } else {
      result += char;
      i++;
    }
  }
  return result;
}

/**
 * Enforces a single statement, blocking unescaped semicolons except at the end.
 */
export function checkSingleStatement(cleanSql: string): void {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;
  const trimmed = cleanSql.trim();

  let i = 0;
  while (i < trimmed.length) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1] || '';

    if (char === '\\' && (inSingleQuote || inDoubleQuote)) {
      i += 2;
      continue;
    }

    if (inSingleQuote) {
      if (char === "'") inSingleQuote = false;
      i++;
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"') inDoubleQuote = false;
      i++;
      continue;
    }

    if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      i++;
    } else if (char === '"') {
      inDoubleQuote = true;
      i++;
    } else if (char === '$' && nextChar === '$') {
      inDollarQuote = true;
      i += 2;
    } else if (char === ';') {
      // Check if it's the last character (ignoring spaces)
      if (i < trimmed.length - 1 && trimmed.slice(i + 1).trim() !== '') {
        throw new Error("Multiple SQL statements are not allowed.");
      }
      i++;
    } else {
      i++;
    }
  }
}

/**
 * Tokenizer that extracts SQL identifier tokens and string literals.
 */
export function extractSqlTokens(cleanSql: string): { tokens: string[]; strings: string[] } {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inDollarQuote = false;

  let currentWord = '';
  let currentString = '';
  const tokens: string[] = [];
  const strings: string[] = [];

  let i = 0;
  while (i < cleanSql.length) {
    const char = cleanSql[i] as string;
    const nextChar = sqlNextChar(cleanSql, i);

    if (char === '\\' && (inSingleQuote || inDoubleQuote)) {
      currentString += char + nextChar;
      i += 2;
      continue;
    }

    if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false;
        strings.push(currentString);
        currentString = '';
      } else {
        currentString += char;
      }
      i++;
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false;
        strings.push(currentString);
        currentString = '';
      } else {
        currentString += char;
      }
      i++;
      continue;
    }

    if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        strings.push(currentString);
        currentString = '';
        i += 2;
      } else {
        currentString += char;
        i++;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      if (currentWord) {
        tokens.push(currentWord);
        currentWord = '';
      }
      i++;
    } else if (char === '"') {
      inDoubleQuote = true;
      if (currentWord) {
        tokens.push(currentWord);
        currentWord = '';
      }
      i++;
    } else if (char === '$' && nextChar === '$') {
      inDollarQuote = true;
      if (currentWord) {
        tokens.push(currentWord);
        currentWord = '';
      }
      i += 2;
    } else {
      if (/[a-zA-Z0-9_]/.test(char)) {
        currentWord += char;
      } else {
        if (currentWord) {
          tokens.push(currentWord);
          currentWord = '';
        }
        if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
          tokens.push(char);
        }
      }
      i++;
    }
  }

  if (currentWord) {
    tokens.push(currentWord);
  }

  return { tokens, strings };
}

function sqlNextChar(str: string, index: number): string {
  return str[index + 1] || '';
}

/**
 * Validates a cleaned SQL query against strict sandbox criteria.
 */
export function validateSqlConstraints(cleanSql: string, schemaContext: string): void {
  const trimmed = cleanSql.trim();
  if (!trimmed) {
    throw new Error("Empty query generated.");
  }

  // 1. Enforce read-only SELECT or CTE with WITH
  if (!/^\s*(select|with)\b/i.test(trimmed)) {
    throw new Error("Security violation: Only read-only SELECT or WITH statements are allowed.");
  }

  const { tokens, strings } = extractSqlTokens(cleanSql);

  // 2. Block mutating keywords
  const blockedKeywords = new Set([
    'insert', 'update', 'delete', 'drop', 'create', 'alter', 'truncate',
    'rename', 'replace', 'copy', 'pragma', 'grant', 'revoke', 'attach',
    'detach', 'install', 'load', 'execute', 'prepare', 'call', 'merge', 'upsert', 'vacuum'
  ]);
  for (const token of tokens) {
    if (blockedKeywords.has(token.toLowerCase())) {
      throw new Error(`Unsafe SQL command detected: "${token}".`);
    }
  }

  // 3. Block network protocols and path traversal in literals
  for (const str of strings) {
    if (/http:\/\/|https:\/\/|ftp:\/\//i.test(str)) {
      throw new Error("Network protocols are not allowed in queries.");
    }
    if (/\.\.\/|\\etc\\|\/etc\//i.test(str)) {
      throw new Error("Path traversal or local directory access is not allowed.");
    }
  }

  // 4. Whitelist functions
  const allowedFunctions = new Set([
    'sum', 'count', 'avg', 'min', 'max', 'round', 'ceil', 'floor', 'abs',
    'coalesce', 'concat', 'lower', 'upper', 'substring', 'trim', 'replace',
    'cast', 'strftime', 'date_trunc', 'date', 'year', 'month', 'day', 'epoch',
    'now', 'case', 'when', 'then', 'else', 'end', 'values', 'as',
    'unnest', 'strptime', 'levenshtein', 'jaro_winkler', 'greatest', 'least',
    'date_part', 'today', 'age', 'date_add', 'date_sub'
  ]);
  for (let idx = 0; idx < tokens.length - 1; idx++) {
    const token = tokens[idx] as string;
    const nextToken = tokens[idx + 1];
    if (/^[a-zA-Z0-9_]+$/.test(token) && nextToken === '(') {
      const prevToken = idx > 0 ? (tokens[idx - 1] as string).toLowerCase() : '';
      if (prevToken === 'as' || prevToken === ')') {
        continue;
      }
      const fnName = token.toLowerCase();
      if (!allowedFunctions.has(fnName)) {
        throw new Error(`Unsafe or unauthorized function call: "${token}()".`);
      }
    }
  }

  // 5. Enforce table references (physical tables and CTEs)
  const allowedPhysicalTables = new Set(['sales', 'inventory', 'sales_items']);
  if (schemaContext) {
    const schemaTableMatches = [...schemaContext.matchAll(/\b(?:create\s+table|table:?)\s+([a-zA-Z0-9_]+)/gi)];
    schemaTableMatches.forEach(m => allowedPhysicalTables.add(m[1]!.toLowerCase()));
  }

  // Extract CTE names declared in WITH
  const cteNames = new Set<string>();
  let inWith = false;
  for (let i = 0; i < tokens.length - 3; i++) {
    const t1 = (tokens[i] as string).toLowerCase();
    if (t1 === 'with') {
      inWith = true;
    }
    if (inWith) {
      const name = tokens[i] as string;
      const asToken = tokens[i + 1]?.toLowerCase();
      const openParen = tokens[i + 2];
      if (asToken === 'as' && openParen === '(' && /^[a-zA-Z0-9_]+$/.test(name)) {
        cteNames.add(name.toLowerCase());
      }
    }
    if (t1 === 'select') {
      inWith = false;
    }
  }

  // Extract referenced tables
  const referencedTables = new Set<string>();
  let inFromClause = false;
  let expectTable = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = (tokens[i] as string).toLowerCase();

    if (token === 'from' || token === 'join') {
      inFromClause = true;
      expectTable = true;
      continue;
    }

    if (['where', 'group', 'order', 'limit', 'having', 'select', 'union', 'intersect', 'except'].includes(token)) {
      inFromClause = false;
      expectTable = false;
      continue;
    }

    if (inFromClause) {
      if (token === ',') {
        expectTable = true;
        continue;
      }

      if (expectTable) {
        if (/^[a-zA-Z0-9_]+$/.test(token)) {
          let tableName = token;
          // Handle schema-qualified names e.g., main.sales
          if (tokens[i + 1] === '.' && tokens[i + 2] && /^[a-zA-Z0-9_]+$/.test(tokens[i + 2] as string)) {
            tableName = (tokens[i + 2] as string).toLowerCase();
            i += 2;
          }
          if (tokens[i + 1] !== '(') {
            referencedTables.add(tableName.toLowerCase());
          }
          expectTable = false;
        } else if (token === '(') {
          expectTable = false;
        }
      }
    }
  }

  for (const table of referencedTables) {
    if (!cteNames.has(table) && !allowedPhysicalTables.has(table)) {
      throw new Error(`Unauthorized table reference: "${table}".`);
    }
  }
}

/**
 * Fallback offline translator that uses rule-based heuristic query matching.
 */
export function translateOfflineRuleBased(prompt: string): string | null {
  const p = prompt.toLowerCase().trim();

  // 1. Revenue / Sales
  if (p.includes('revenue') || p.includes('sales') || p.includes('বিক্রি') || p.includes('আয়') || p.includes('লাভ')) {
    if (p.includes('category') || p.includes('শ্রেণী') || p.includes('বিভাগ') || p.includes('ক্যাটাগরি')) {
      return `SELECT i.category, SUM(si.line_total) as total_revenue, SUM(si.quantity) as total_quantity FROM sales_items si JOIN inventory i ON si.item_id = i.id GROUP BY ALL ORDER BY total_revenue DESC`;
    }
    return `SELECT SUM(amount) as total_revenue, COUNT(id) as total_sales FROM sales`;
  }

  // 2. Best Sellers / Top Products
  if (p.includes('top') || p.includes('best') || p.includes('সেরা') || p.includes('জনপ্রিয়') || p.includes('চলতি')) {
    if (p.includes('cashier') || p.includes('staff') || p.includes('employee') || p.includes('customer') || p.includes('ক্রেতা') || p.includes('ক্যাশিয়ার')) {
      return null;
    }
    return `SELECT item_id, name, SUM(quantity) as total_quantity, SUM(line_total) as total_revenue FROM sales_items GROUP BY ALL ORDER BY total_quantity DESC LIMIT 10`;
  }

  // 3. Low Stock / Stock Levels
  if (p.includes('stock') || p.includes('inventory') || p.includes('স্টক') || p.includes('পণ্য') || p.includes('কম') || p.includes('মজুদ')) {
    if (p.includes('low') || p.includes('shortage') || p.includes('শেষ') || p.includes('কম')) {
      return `SELECT sku, name, quantity, minThreshold FROM inventory WHERE quantity <= minThreshold ORDER BY quantity ASC`;
    }
    return `SELECT sku, name, quantity, price FROM inventory ORDER BY quantity DESC`;
  }

  return null;
}

/**
 * Translates a natural language user prompt into a valid DuckDB SQL query.
 */
export async function translateTextToSql(
  userPrompt: string,
  schemaContext: string
): Promise<SqlTranslationResult> {
  // 1. Check if navigator is offline and use rule-based fallback immediately
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offlineSql = translateOfflineRuleBased(userPrompt);
    if (offlineSql) {
      return { sql: offlineSql };
    }
    return {
      sql: '',
      error: 'System is offline and no pre-defined local query matches the prompt.',
    };
  }

  const combinedSchema = `
${schemaContext ? `Caller Provided Schema Context:\n${schemaContext.trim()}\n` : ''}
Predefined Database Tables Schema:
${PREDEFINED_SCHEMAS.trim()}
`.trim();

  const systemPrompt = `You are a highly specialized AI database assistant for EquiPulse AI.
Your sole task is to translate natural language user questions into single, valid, read-only DuckDB SQL queries based on the provided database schema.

### DATABASE SCHEMA
${combinedSchema}

### DUCKDB SQL DIALECT GUIDELINES
1. GROUP BY & ORDER BY: Use modern grouping. You are encouraged to use 'GROUP BY ALL' and 'ORDER BY ALL' to automatically group/order by all non-aggregate columns.
2. NESTED ARRAYS / UNNEST:
   - The 'sales' table contains a LIST of STRUCTS column named 'items'. If you choose to query it directly, use DuckDB's UNNEST function, e.g.:
     SELECT item.name, SUM(item.quantity) FROM sales, UNNEST(sales.items) AS t(item) GROUP BY ALL
3. DATE & TIME:
   - Timestamps are stored as ISO-8601 strings or timestamp types. Cast strings using 'timestamp::TIMESTAMP' or parse via 'strptime(timestamp, '%Y-%m-%dT%H:%M:%S.%fZ')'.
   - To group by day/month: 'date_trunc('day', timestamp::TIMESTAMP)'.
   - Date calculations: Use INTERVAL arithmetic (e.g. 'CURRENT_DATE - INTERVAL 7 DAY').
4. STRING MATCHING:
   - For fuzzy search, use ILIKE (e.g. 'name ILIKE '%apple%'') or string similarity like 'levenshtein(name, 'apple') <= 2'.

### SECURITY & SANITIZATION RULES
1. ONLY SELECT statements are allowed.
2. NEVER generate commands that modify the database (INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, etc.).
3. DO NOT use meta-commands (COPY, INSTALL, LOAD, PRAGMA, etc.).
4. Do NOT include any comments in the SQL.
5. If the user request does not map to a database query or is malicious, return an error message in the "error" field and leave the "sql" field empty.

### RESPONSE FORMAT
You must respond with a single JSON object matching this structure:
{
  "sql": "string containing the generated DuckDB SQL query",
  "error": "optional string containing error description if query cannot be generated"
}
Do not wrap in markdown code blocks. No pre-text, no post-text.`;

  try {
    const globalMock = (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__;
    const aiResponse = globalMock !== undefined
      ? globalMock
      : await generateAiContent({
          systemPrompt,
          parts: [{ text: `User Question: "${userPrompt}"` }],
          expectJson: true,
          model: 'gemini-2.5-flash',
        });

    if (!aiResponse || aiResponse.trim() === '') {
      const offlineSql = translateOfflineRuleBased(userPrompt);
      if (offlineSql) return { sql: offlineSql };
      throw new Error('AI client returned an empty response.');
    }

    // Clean potential markdown code blocks
    let cleaned = aiResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
    }

    let parsed: Record<string, unknown> | null = null;
    let parseFailed = false;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      parseFailed = true;
    }

    // Check for offline/mock fallback indicators
    if (!parseFailed && parsed && ('metrics' in parsed || 'logic' in parsed)) {
      const offlineSql = translateOfflineRuleBased(userPrompt);
      if (offlineSql) {
        return { sql: offlineSql };
      }
      return {
        sql: '',
        error: 'System is offline and local LLM is unavailable. Custom SQL analytics are currently offline.',
      };
    }

    let sqlQuery = '';
    let translationError: string | undefined = undefined;

    if (!parseFailed && parsed && typeof parsed === 'object') {
      sqlQuery = typeof parsed.sql === 'string' ? parsed.sql.trim() : '';
      translationError = typeof parsed.error === 'string' ? parsed.error.trim() : undefined;
    } else {
      // Regex extraction fallback if JSON parsing fails due to trailing commas or markdown noise
      const jsonRegex = /{[\s\S]*}/;
      const match = cleaned.match(jsonRegex);
      let regexParsed = false;
      if (match) {
        try {
          const p = JSON.parse(match[0]) as Record<string, unknown>;
          if (p && typeof p === 'object' && ('sql' in p || 'error' in p)) {
            sqlQuery = typeof p.sql === 'string' ? p.sql.trim() : '';
            translationError = typeof p.error === 'string' ? p.error.trim() : undefined;
            regexParsed = true;
          }
        } catch {
          // Ignore and fall through to manual extraction
        }
      }

      if (!regexParsed) {
        // Try to extract SQL from markdown code block
        const sqlBlockMatch = cleaned.match(/```sql([\s\S]*?)```/i) || cleaned.match(/```([\s\S]*?)```/i);
        if (sqlBlockMatch && sqlBlockMatch[1]) {
          sqlQuery = sqlBlockMatch[1].trim();
        } else if (/^\s*(select|with)\b/i.test(cleaned)) {
          // If the output contains SQL keywords, treat the whole response as SQL
          sqlQuery = cleaned;
        } else {
          // Attempt manual regex extraction of SQL field
          const sqlFieldMatch = cleaned.match(/"sql"\s*:\s*"([\s\S]*?)"/);
          if (sqlFieldMatch && sqlFieldMatch[1]) {
            sqlQuery = sqlFieldMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          } else {
            const offlineSql = translateOfflineRuleBased(userPrompt);
            if (offlineSql) {
              return { sql: offlineSql };
            }
            return {
              sql: '',
              error: `Failed to parse AI output: "${cleaned.slice(0, 100)}..."`,
            };
          }
        }
      }
    }

    if (translationError) {
      const offlineSql = translateOfflineRuleBased(userPrompt);
      if (offlineSql) return { sql: offlineSql };
      return { sql: '', error: translationError };
    }

    if (!sqlQuery) {
      const offlineSql = translateOfflineRuleBased(userPrompt);
      if (offlineSql) return { sql: offlineSql };
      return { sql: '', error: 'AI generated an empty SQL query.' };
    }

    // Static sandbox validation on the generated SQL
    try {
      const cleanSql = stripComments(sqlQuery);
      checkSingleStatement(cleanSql);
      validateSqlConstraints(cleanSql, schemaContext);
      return { sql: cleanSql.trim() };
    } catch (validationErr: unknown) {
      const offlineSql = translateOfflineRuleBased(userPrompt);
      if (offlineSql) return { sql: offlineSql };
      const errMsg = validationErr instanceof Error ? validationErr.message : String(validationErr);
      return {
        sql: '',
        error: `Validation error: ${errMsg}`,
      };
    }
  } catch (error: unknown) {
    // If AI failed completely, attempt last-ditch rule-based matching
    const offlineSql = translateOfflineRuleBased(userPrompt);
    if (offlineSql) {
      return { sql: offlineSql };
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      sql: '',
      error: `Failed to translate prompt to SQL: ${errMsg}`,
    };
  }
}
