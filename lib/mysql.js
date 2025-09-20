// lib/mysql.js
import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DATABASE_HOST || '108.181.197.181',
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 19970,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  return pool;
}