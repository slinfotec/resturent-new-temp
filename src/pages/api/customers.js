import { getPool } from '../../../lib/mysql';

export default async function handler(req, res) {
  const pool = getPool();
  let conn;

  try {
    conn = await pool.getConnection();

    if (req.method === 'GET') {
      // List customers with optional search
      const search = req.query.q?.trim();
      let where = '';
      const params = [];
      
      if (search) {
        where = 'WHERE name LIKE ? OR phone LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }

      const [rows] = await conn.query(
        `SELECT id, name, phone, notes, credit_balance 
         FROM customers ${where} 
         ORDER BY CASE WHEN id = 1 THEN 0 ELSE 1 END, name`,
        params
      );
      
      res.status(200).json({ customers: rows });
    } 
    else if (req.method === 'POST') {
      // Create new customer
      const { name, phone, notes } = req.body;
      
      if (!name?.trim()) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }

      const [result] = await conn.query(
        `INSERT INTO customers (name, phone, notes) 
         VALUES (?, ?, ?)`,
        [name.trim(), phone?.trim() || null, notes?.trim() || null]
      );

      const [newCustomer] = await conn.query(
        'SELECT id, name, phone, notes, credit_balance FROM customers WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({ customer: newCustomer[0] });
    }
    else {
      res.status(405).end(); // Method not allowed
    }
  } catch (error) {
    console.error('Customers API error:', error);
    res.status(500).json({ error: 'Database error' });
  } finally {
    if (conn) conn.release();
  }
}