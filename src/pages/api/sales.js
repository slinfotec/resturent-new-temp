import { getPool } from '../../../lib/mysql';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const pool = getPool();
    const { items, total, customerId, createdAt } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query(
        'INSERT INTO sales (customer_id, total, created_at) VALUES (?, ?, ?)',
        [customerId, total, new Date(createdAt)]
      );
      const saleId = result.insertId;
      // Insert line items
      const itemPromises = items.map(it => conn.query(
        'INSERT INTO sale_items (sale_id, product_batch_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [saleId, it.product_batch_id, it.productName, it.price, it.quantity]
      ));
      await Promise.all(itemPromises);
      await conn.commit();
      res.status(201).json({ ok: true, saleId });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: 'DB error' });
    } finally {
      conn.release();
    }
  } else {
    res.status(405).end();
  }
}