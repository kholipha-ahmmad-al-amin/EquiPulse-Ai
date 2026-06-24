import { test, expect } from '@playwright/test';
import {
  validateSqlConstraints,
} from '../../src/services/textToSqlService';

test.describe('Adversarial & Robustness Tests for textToSqlService.ts', () => {
  const schemaContext = 'CREATE TABLE custom_metrics (metric_id VARCHAR, value DOUBLE);';

  test.describe('Valid DuckDB Dialect Queries', () => {
    test('allows GROUP BY ALL and ORDER BY ALL', () => {
      const queries = [
        'SELECT category, sum(price) FROM inventory GROUP BY ALL',
        'SELECT category, supplierName, avg(costPrice) FROM inventory GROUP BY ALL ORDER BY ALL',
        'SELECT type, paymentMethod, sum(amount) FROM sales GROUP BY ALL',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).not.toThrow();
      }
    });

    test('allows nested array UNNEST expressions', () => {
      const queries = [
        'SELECT item.name, sum(item.quantity) FROM sales, UNNEST(sales.items) as t(item) GROUP BY ALL',
        'SELECT p.method, sum(p.amount) FROM sales, UNNEST(sales.payments) as t(p) GROUP BY ALL',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).not.toThrow();
      }
    });

    test('allows allowed Date & Time functions', () => {
      const queries = [
        "SELECT strftime(timestamp::TIMESTAMP, '%Y-%m-%d') FROM sales",
        "SELECT date_trunc('month', timestamp::TIMESTAMP) FROM sales",
        'SELECT date_add(today(), INTERVAL 1 DAY) FROM sales',
        'SELECT date_sub(today(), INTERVAL 7 DAY) FROM sales',
        'SELECT age(timestamp::TIMESTAMP) FROM sales',
        "SELECT date_part('year', timestamp::TIMESTAMP) FROM sales",
        "SELECT count(*) FROM sales WHERE timestamp > now() - INTERVAL 1 MONTH",
        'SELECT date(timestamp) FROM sales',
        'SELECT year(timestamp::TIMESTAMP) FROM sales',
        'SELECT month(timestamp::TIMESTAMP) FROM sales',
        'SELECT day(timestamp::TIMESTAMP) FROM sales',
        'SELECT epoch(timestamp::TIMESTAMP) FROM sales',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).not.toThrow();
      }
    });

    test('allows other whitelisted functions except replace', () => {
      const queries = [
        "SELECT coalesce(category, 'N/A') FROM inventory",
        "SELECT concat(name, ' (', sku, ')') FROM inventory",
        'SELECT lower(name), upper(category) FROM inventory',
        'SELECT substring(name, 1, 5) FROM inventory',
        'SELECT trim(name) FROM inventory',
        'SELECT cast(quantity AS INT) FROM inventory',
        'SELECT round(price, 2), ceil(price), floor(price), abs(price) FROM inventory',
        "SELECT levenshtein(name, 'apple'), jaro_winkler(name, 'apple') FROM inventory",
        'SELECT greatest(price, costPrice), least(price, costPrice) FROM inventory',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).not.toThrow();
      }
    });

    test('demonstrates false positive: replace() function is blocked as keyword', () => {
      // replace() is whitelisted as a function but blocked as a keyword
      const query = "SELECT replace(name, 'a', 'b') FROM inventory";
      expect(() => validateSqlConstraints(query, schemaContext)).toThrow(
        'Unsafe SQL command detected: "replace".'
      );
    });
  });

  test.describe('Table Whitelist Enforcement & Subquery Blockages', () => {
    test('allows physical tables and custom tables', () => {
      const queries = [
        'SELECT * FROM sales',
        'SELECT * FROM inventory',
        'SELECT * FROM sales_items',
        'SELECT * FROM custom_metrics',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).not.toThrow();
      }
    });

    test('allows CTEs declared in WITH clause', () => {
      const q = 'WITH top_sales AS (SELECT * FROM sales WHERE amount > 100) SELECT * FROM top_sales';
      expect(() => validateSqlConstraints(q, schemaContext)).not.toThrow();
    });

    test('throws on unauthorized table references (flat queries)', () => {
      const queries = [
        'SELECT * FROM users',
        'SELECT * FROM sales JOIN users ON sales.cashierId = users.id',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow(/Unauthorized table reference/);
      }
    });

    test('demonstrates false positive: subqueries are blocked as unauthorized function calls', () => {
      // Subquery in FROM clause leads to "FROM (" being tokenized, which thinks "FROM()" is a function call
      const subqueryFrom = 'SELECT * FROM (SELECT * FROM secret_logs)';
      expect(() => validateSqlConstraints(subqueryFrom, schemaContext)).toThrow(
        'Unsafe or unauthorized function call: "FROM()".'
      );

      // Subquery in WHERE clause leads to "IN (" being tokenized, which thinks "IN()" is a function call
      const subqueryWhere = 'SELECT * FROM sales WHERE cashierId IN (SELECT id FROM staff_members)';
      expect(() => validateSqlConstraints(subqueryWhere, schemaContext)).toThrow(
        'Unsafe or unauthorized function call: "IN()".'
      );

      // Parentheses grouping in WHERE clause leads to "WHERE (" being tokenized, which thinks "WHERE()" is a function call
      const parenWhere = 'SELECT * FROM sales WHERE (amount > 100)';
      expect(() => validateSqlConstraints(parenWhere, schemaContext)).toThrow(
        'Unsafe or unauthorized function call: "WHERE()".'
      );
    });
  });

  test.describe('Security Blocking - Mutating Data & Structural Changes', () => {
    test('throws on data mutations', () => {
      const queries = [
        "INSERT INTO sales (id, amount) VALUES ('new_id', 150.0)",
        "UPDATE sales SET amount = 200 WHERE id = 'some_id'",
        "DELETE FROM sales WHERE id = 'some_id'",
        'TRUNCATE sales',
        "MERGE INTO sales USING inventory ON sales.referenceId = inventory.id WHEN MATCHED THEN UPDATE SET amount = 0",
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow();
      }
    });

    test('throws on DDL / structural modifications', () => {
      const queries = [
        'DROP TABLE sales',
        'CREATE TABLE test_table (id INT)',
        'ALTER TABLE sales ADD COLUMN new_col VARCHAR',
        'RENAME TABLE sales TO transactions',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow();
      }
    });

    test('throws on mutating keywords embedded within select', () => {
      const queries = [
        'SELECT * FROM sales UNION SELECT * FROM (DROP TABLE inventory)',
        'SELECT * FROM sales; INSERT INTO inventory VALUES (1)',
        'SELECT count(*) FROM (UPDATE sales SET amount = 0)',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow();
      }
    });
  });

  test.describe('Security Blocking - System Tables, Extensions, Meta-commands', () => {
    test('throws on accessing system tables', () => {
      const queries = [
        'SELECT * FROM duckdb_tables',
        'SELECT * FROM duckdb_views',
        'SELECT * FROM duckdb_columns',
        'SELECT * FROM duckdb_extensions',
        'SELECT * FROM information_schema.tables',
        'SELECT * FROM information_schema.columns',
        'SELECT * FROM pg_catalog.pg_tables',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow(/Unauthorized table reference/);
      }
    });

    test('throws on loading/installing extensions and other meta-commands', () => {
      const queries = [
        'INSTALL httpfs',
        'LOAD httpfs',
        "COPY sales TO 'sales_backup.csv'",
        'PRAGMA show_tables',
        'GRANT SELECT ON sales TO public',
        'REVOKE SELECT ON sales FROM public',
        "ATTACH 'other_db.db' AS other",
        'DETACH other',
        'VACUUM',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow();
      }
    });

    test('throws on loading/installing extensions embedded inside query', () => {
      const queries = [
        'SELECT * FROM sales UNION SELECT load(\'httpfs\')',
        'SELECT * FROM sales UNION SELECT install(\'httpfs\')',
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow(/Unsafe SQL command detected: "(load|install)"/);
      }
    });
  });

  test.describe('Security Blocking - File Access, Path Traversal, and Network Protocols', () => {
    test('throws on network protocols in string literals', () => {
      const queries = [
        "SELECT * FROM sales WHERE note = 'http://attacker.com/leak'",
        "SELECT * FROM sales WHERE note = 'https://attacker.com/leak'",
        "SELECT * FROM sales WHERE note = 'ftp://attacker.com/leak'",
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow(/Network protocols are not allowed/);
      }
    });

    test('throws on path traversal in string literals', () => {
      const queries = [
        "SELECT * FROM sales WHERE note = '../etc/passwd'",
        "SELECT * FROM sales WHERE note = '/etc/passwd'",
        "SELECT * FROM sales WHERE note = '\\etc\\passwd'",
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow(/Path traversal or local directory access/);
      }
    });

    test('throws on unauthorized functions that read local files', () => {
      const queries = [
        "SELECT * FROM read_csv_auto('file.csv')",
        "SELECT * FROM read_parquet('file.parquet')",
        "SELECT * FROM read_json_auto('file.json')",
      ];
      for (const q of queries) {
        expect(() => validateSqlConstraints(q, schemaContext)).toThrow(/Unsafe or unauthorized function call/);
      }
    });

    test('demonstrates CRITICAL security bypass: quoted file paths as table names bypass validation', () => {
      const q1 = "SELECT * FROM 'd:/somefile.csv'";
      const q2 = 'SELECT * FROM "d:/somefile.csv"';
      const q3 = 'SELECT * FROM $$d:/somefile.csv$$';

      // None of these should throw because they are stripped from tokens by the tokenizer,
      // meaning their referenced table list is empty and they bypass the table name whitelist check completely!
      expect(() => validateSqlConstraints(q1, schemaContext)).not.toThrow();
      expect(() => validateSqlConstraints(q2, schemaContext)).not.toThrow();
      expect(() => validateSqlConstraints(q3, schemaContext)).not.toThrow();
    });
  });
});
