import { getPool } from '../../../lib/mysql';

// GET /api/items?page=1&pageSize=50&q=milk
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const pool = getPool();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const maxPageSize = process.env.MAX_PAGE_SIZE ? Number(process.env.MAX_PAGE_SIZE) : 200;
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(req.query.pageSize || process.env.DEFAULT_PAGE_SIZE || '50', 10)));
  const q = (req.query.q || '').trim();

  const offset = (page - 1) * pageSize;
  let conn;
  try {
    conn = await pool.getConnection();

    // Build where clause and params
    let where = '';
    const params = [];
    if (q) {
      where = 'WHERE product_name LIKE ?';
      params.push(`%${q}%`);
    }

    // Count total matching rows (for pagination UI)
    const countSql = `SELECT COUNT(*) AS total FROM product_batches ${where}`;
    const [countRows] = await conn.query(countSql, params);
    const total = countRows[0]?.total || 0;

    // Fetch page of rows
    const dataSql = `SELECT id, product_name AS productName, price, stock, expiry FROM product_batches ${where} ORDER BY id LIMIT ? OFFSET ?`;
    const dataParams = params.concat([pageSize, offset]);
    const [rows] = await conn.query(dataSql, dataParams);

    res.status(200).json({ items: rows, total, page, pageSize });
  } catch (e) {
    console.error('Failed to fetch items', e);
    res.status(500).json({ error: 'DB error' });
  } finally {
    if (conn) conn.release();
  }
}
