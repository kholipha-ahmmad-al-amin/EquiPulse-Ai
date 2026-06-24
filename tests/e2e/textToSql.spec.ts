import { test, expect } from '@playwright/test';
import {
  translateTextToSql,
  stripComments,
  checkSingleStatement,
  validateSqlConstraints,
  translateOfflineRuleBased,
} from '../../src/services/textToSqlService';

test.describe('Text-to-SQL - Comment Stripping', () => {
  test('strips single-line comments', () => {
    const sql = 'SELECT * FROM sales -- get all transactions';
    const cleaned = stripComments(sql);
    expect(cleaned.trim()).toBe('SELECT * FROM sales');
  });

  test('strips multi-line comments', () => {
    const sql = 'SELECT /* get all transactions */ * FROM sales';
    const cleaned = stripComments(sql);
    expect(cleaned.trim()).toBe('SELECT  * FROM sales');
  });

  test('does not strip comments inside single quotes', () => {
    const sql = "SELECT '-- not a comment' FROM sales";
    const cleaned = stripComments(sql);
    expect(cleaned.trim()).toBe("SELECT '-- not a comment' FROM sales");
  });

  test('does not strip comments inside double quotes', () => {
    const sql = 'SELECT "-- not a comment" FROM sales';
    const cleaned = stripComments(sql);
    expect(cleaned.trim()).toBe('SELECT "-- not a comment" FROM sales');
  });

  test('does not strip comments inside dollar quotes', () => {
    const sql = 'SELECT $$-- not a comment$$ FROM sales';
    const cleaned = stripComments(sql);
    expect(cleaned.trim()).toBe('SELECT $$-- not a comment$$ FROM sales');
  });
});

test.describe('Text-to-SQL - Single Statement Enforcement', () => {
  test('allows single statement with trailing semicolon', () => {
    expect(() => checkSingleStatement('SELECT * FROM sales;')).not.toThrow();
  });

  test('allows single statement without trailing semicolon', () => {
    expect(() => checkSingleStatement('SELECT * FROM sales')).not.toThrow();
  });

  test('allows semicolon inside string literals', () => {
    expect(() => checkSingleStatement("SELECT * FROM sales WHERE note = 'hello; world'")).not.toThrow();
  });

  test('throws on multiple statements separated by semicolon', () => {
    expect(() => checkSingleStatement('SELECT * FROM sales; DROP TABLE inventory;')).toThrow(
      'Multiple SQL statements are not allowed.'
    );
  });
});

test.describe('Text-to-SQL - Static Sandbox Constraints', () => {
  const schemaContext = '';

  test('allows read-only SELECT query', () => {
    expect(() => validateSqlConstraints('SELECT * FROM sales', schemaContext)).not.toThrow();
  });

  test('allows read-only SELECT with CTE', () => {
    expect(() =>
      validateSqlConstraints(
        'WITH monthly_sales AS (SELECT * FROM sales) SELECT * FROM monthly_sales',
        schemaContext
      )
    ).not.toThrow();
  });

  test('throws on mutating statements (INSERT, UPDATE, DELETE, etc.)', () => {
    expect(() => validateSqlConstraints('INSERT INTO sales VALUES (1, 100)', schemaContext)).toThrow(
      'Only read-only SELECT or WITH statements are allowed.'
    );
    expect(() => validateSqlConstraints('UPDATE sales SET amount = 0', schemaContext)).toThrow(
      'Only read-only SELECT or WITH statements are allowed.'
    );
    expect(() => validateSqlConstraints('DROP TABLE inventory', schemaContext)).toThrow(
      'Only read-only SELECT or WITH statements are allowed.'
    );
    expect(() => validateSqlConstraints('ALTER TABLE sales ADD COLUMN tax DOUBLE', schemaContext)).toThrow(
      'Only read-only SELECT or WITH statements are allowed.'
    );
    // Test mutating keyword inside a SELECT query structure
    expect(() => validateSqlConstraints('SELECT * FROM sales UNION SELECT * FROM (DROP TABLE inventory)', schemaContext)).toThrow(
      'Unsafe SQL command detected: "DROP".'
    );
  });

  test('allows mutating keywords inside string literals', () => {
    expect(() =>
      validateSqlConstraints("SELECT * FROM sales WHERE note = 'do not drop or delete this'", schemaContext)
    ).not.toThrow();
  });

  test('throws on path traversal in string literals', () => {
    expect(() =>
      validateSqlConstraints("SELECT * FROM sales WHERE note = '../etc/passwd'", schemaContext)
    ).toThrow('Path traversal or local directory access is not allowed.');
  });

  test('throws on network protocols in string literals', () => {
    expect(() =>
      validateSqlConstraints("SELECT * FROM sales WHERE note = 'https://attacker.com/leak'", schemaContext)
    ).toThrow('Network protocols are not allowed in queries.');
  });

  test('allows whitelisted functions', () => {
    expect(() =>
      validateSqlConstraints('SELECT sum(amount), count(id), avg(amount) FROM sales', schemaContext)
    ).not.toThrow();
    expect(() =>
      validateSqlConstraints('SELECT strftime(timestamp::TIMESTAMP, \'%Y-%m-%d\') FROM sales', schemaContext)
    ).not.toThrow();
    expect(() =>
      validateSqlConstraints(
        'SELECT item.name, SUM(item.quantity) FROM sales, UNNEST(sales.items) AS t(item) GROUP BY ALL',
        schemaContext
      )
    ).not.toThrow();
  });

  test('throws on disallowed functions', () => {
    expect(() => validateSqlConstraints("SELECT read_csv('test.csv')", schemaContext)).toThrow(
      'Unsafe or unauthorized function call: "read_csv()".'
    );
    expect(() => validateSqlConstraints("SELECT copy_to('test.csv')", schemaContext)).toThrow(
      'Unsafe or unauthorized function call: "copy_to()".'
    );
  });

  test('allows referenced tables from whitelist', () => {
    expect(() => validateSqlConstraints('SELECT * FROM sales', schemaContext)).not.toThrow();
    expect(() => validateSqlConstraints('SELECT * FROM inventory', schemaContext)).not.toThrow();
    expect(() => validateSqlConstraints('SELECT * FROM sales_items', schemaContext)).not.toThrow();
  });

  test('throws on unauthorized table references', () => {
    expect(() => validateSqlConstraints('SELECT * FROM users', schemaContext)).toThrow(
      'Unauthorized table reference: "users".'
    );
    expect(() =>
      validateSqlConstraints('SELECT * FROM sales JOIN users ON sales.cashierId = users.id', schemaContext)
    ).toThrow('Unauthorized table reference: "users".');
  });

  test('allows custom tables dynamically parsed from schemaContext', () => {
    const customSchema = 'CREATE TABLE custom_log (id VARCHAR, message VARCHAR);';
    expect(() => validateSqlConstraints('SELECT * FROM custom_log', customSchema)).not.toThrow();
  });
});

test.describe('Text-to-SQL - Offline Rule-Based Fallback', () => {
  test('maps revenue/sales queries', () => {
    const result1 = translateOfflineRuleBased('what was our revenue today?');
    expect(result1).toContain('SUM(amount)');
    expect(result1).toContain('sales');

    const result2 = translateOfflineRuleBased('revenue by category');
    expect(result2).toContain('category');
    expect(result2).toContain('sales_items');
  });

  test('maps best sellers / top products queries', () => {
    const result = translateOfflineRuleBased('who are our best sellers?');
    expect(result).toContain('SUM(quantity)');
    expect(result).toContain('sales_items');
    expect(result).toContain('LIMIT 10');
  });

  test('maps low stock / inventory queries', () => {
    const result1 = translateOfflineRuleBased('show me low stock products');
    expect(result1).toContain('quantity <= minThreshold');
    expect(result1).toContain('inventory');

    const result2 = translateOfflineRuleBased('check our inventory levels');
    expect(result2).toContain('price');
    expect(result2).toContain('inventory');
  });

  test('returns null for unmapped prompts', () => {
    const result = translateOfflineRuleBased('who is our top cashier?');
    expect(result).toBeNull();
  });
});

test.describe('Text-to-SQL - translateTextToSql Integration', () => {
  const schemaContext = '';

  test.afterEach(() => {
    delete (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__;
    try {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
      });
    } catch {
      // Ignore
    }
  });

  test('translates via mocked AI JSON response', async () => {
    (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__ = JSON.stringify({
      sql: 'SELECT * FROM sales',
    });

    const result = await translateTextToSql('show sales', schemaContext);
    expect(result.sql).toBe('SELECT * FROM sales');
    expect(result.error).toBeUndefined();
  });

  test('translates via mocked AI Markdown Code Block response', async () => {
    (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__ = '```json\n{\n  "sql": "SELECT * FROM sales"\n}\n```';

    const result = await translateTextToSql('show sales', schemaContext);
    expect(result.sql).toBe('SELECT * FROM sales');
    expect(result.error).toBeUndefined();
  });

  test('translates via mocked AI Raw SQL response', async () => {
    (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__ = 'SELECT * FROM sales';

    const result = await translateTextToSql('show sales', schemaContext);
    expect(result.sql).toBe('SELECT * FROM sales');
    expect(result.error).toBeUndefined();
  });

  test('uses offline rule-based fallback when navigator is offline', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    const result = await translateTextToSql('what is our revenue?', schemaContext);
    expect(result.sql).toContain('SUM(amount)');
    expect(result.error).toBeUndefined();
  });

  test('falls back to rule-based queries if AI returns offline fallback metrics JSON', async () => {
    // This replicates generateLocalFallbackContent response structure
    (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__ = JSON.stringify({
      id: 'task-local-opt-12345',
      metrics: { confidence: '94%' },
      logic: ['local analysis'],
    });

    const result = await translateTextToSql('what is our revenue?', schemaContext);
    expect(result.sql).toContain('SUM(amount)');
    expect(result.error).toBeUndefined();
  });

  test('returns error if AI fails and no rule-based query matches', async () => {
    (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__ = JSON.stringify({
      error: 'Model overloaded',
    });

    const result = await translateTextToSql('who is our top cashier?', schemaContext);
    expect(result.sql).toBe('');
    expect(result.error).toBe('Model overloaded');
  });

  test('returns validation error if generated query is unsafe', async () => {
    (globalThis as unknown as { __MOCK_AI_RESPONSE__?: string }).__MOCK_AI_RESPONSE__ = JSON.stringify({
      sql: 'DROP TABLE sales',
    });

    const result = await translateTextToSql('delete everything', schemaContext);
    expect(result.sql).toBe('');
    expect(result.error).toMatch(/Unsafe SQL command detected|Only read-only SELECT or WITH statements are allowed/i);
  });
});
