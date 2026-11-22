import mysql, { type Pool } from 'mysql2/promise';

export type StoredOrder = {
  id: string;
  customerName: string;
  city: string;
  itemsJson: string;
  totalCents: number;
  status: string;
  preferenceId?: string;
  paymentId?: string;
};

let pool: Pool | undefined;

export async function initDatabase(): Promise<boolean> {
  const url = process.env.DATABASE_URL ?? process.env.DRIZZLE_DATABASE_URL;
  if (!url) {
    console.warn('DATABASE_URL não configurada; o preview usará memória temporária.');
    return false;
  }
  try {
    pool = mysql.createPool(url);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(36) PRIMARY KEY,
        customer_name VARCHAR(80) NOT NULL,
        city VARCHAR(80) NOT NULL DEFAULT '',
        items_json LONGTEXT NOT NULL,
        total_cents INT NOT NULL,
        status VARCHAR(32) NOT NULL,
        preference_id VARCHAR(80) NULL,
        payment_id VARCHAR(80) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orders_payment_id (payment_id),
        INDEX idx_orders_preference_id (preference_id)
      )
    `);
    return true;
  } catch (error) {
    console.error('Não foi possível inicializar o banco:', error);
    pool = undefined;
    return false;
  }
}

export function databaseReady(): boolean {
  return Boolean(pool);
}

export async function insertOrder(order: StoredOrder): Promise<void> {
  if (!pool) throw new Error('Banco não configurado');
  await pool.execute(
    `INSERT INTO orders (id, customer_name, city, items_json, total_cents, status, preference_id, payment_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [order.id, order.customerName, order.city, order.itemsJson, order.totalCents, order.status, order.preferenceId ?? null, order.paymentId ?? null]
  );
}

export async function setPreference(id: string, preferenceId: string): Promise<void> {
  if (!pool) throw new Error('Banco não configurado');
  await pool.execute('UPDATE orders SET preference_id = ? WHERE id = ?', [preferenceId, id]);
}

export async function setPayment(id: string, status: string, paymentId: string): Promise<void> {
  if (!pool) throw new Error('Banco não configurado');
  await pool.execute('UPDATE orders SET status = ?, payment_id = ? WHERE id = ?', [status, paymentId, id]);
}

function mapRow(row: any): StoredOrder {
  return {
    id: row.id,
    customerName: row.customer_name,
    city: row.city,
    itemsJson: row.items_json,
    totalCents: Number(row.total_cents),
    status: row.status,
    preferenceId: row.preference_id ?? undefined,
    paymentId: row.payment_id ?? undefined
  };
}

export async function findOrder(id: string): Promise<StoredOrder | undefined> {
  if (!pool) throw new Error('Banco não configurado');
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  const row = (rows as any[])[0];
  return row ? mapRow(row) : undefined;
}

export async function findOrderByPaymentReference(id: string): Promise<StoredOrder | undefined> {
  if (!pool) throw new Error('Banco não configurado');
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? OR preference_id = ? LIMIT 1', [id, id]);
  const row = (rows as any[])[0];
  return row ? mapRow(row) : undefined;
}
