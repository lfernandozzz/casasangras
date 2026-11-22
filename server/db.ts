import mysql, { type Pool } from 'mysql2/promise';
import { catalog, type CatalogItem } from './catalog.js';

export type ProductRecord = CatalogItem & { active: boolean };
export type StoredOrder = {
  id: string;
  customerName: string;
  city: string;
  itemsJson: string;
  totalCents: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  preferenceId?: string;
  paymentId?: string;
  createdAt?: string;
};

let pool: Pool | undefined;

export async function initDatabase(): Promise<boolean> {
  const url = process.env.DATABASE_URL ?? process.env.DRIZZLE_DATABASE_URL;
  if (!url) { console.warn('DATABASE_URL não configurada; o preview usará memória temporária.'); return false; }
  try {
    pool = mysql.createPool(url);
    await pool.query(`CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(20) PRIMARY KEY, name VARCHAR(120) NOT NULL, price_cents INT NOT NULL,
      category VARCHAR(50) NOT NULL, image VARCHAR(120) NOT NULL, description TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY, customer_name VARCHAR(80) NOT NULL, city VARCHAR(80) NOT NULL DEFAULT '',
      items_json LONGTEXT NOT NULL, total_cents INT NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'pending',
      payment_status VARCHAR(32) NOT NULL DEFAULT 'pending', fulfillment_status VARCHAR(32) NOT NULL DEFAULT 'waiting',
      preference_id VARCHAR(80) NULL, payment_id VARCHAR(80) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_orders_payment_id (payment_id), INDEX idx_orders_preference_id (preference_id)
    )`);
    for (const statement of [
      "ALTER TABLE orders ADD COLUMN payment_status VARCHAR(32) NOT NULL DEFAULT 'pending'",
      "ALTER TABLE orders ADD COLUMN fulfillment_status VARCHAR(32) NOT NULL DEFAULT 'waiting'"
    ]) { try { await pool.query(statement); } catch (error) { if (!String(error).includes('Duplicate column')) throw error; } }
    await pool.query("UPDATE orders SET payment_status = status WHERE payment_status = 'pending' AND status <> 'pending'");
    for (const item of catalog) {
      await pool.execute(`INSERT IGNORE INTO products (id,name,price_cents,category,image,description,active) VALUES (?,?,?,?,?,?,TRUE)`, [item.id, item.name, Math.round(item.price * 100), item.category, item.image, item.description]);
    }
    return true;
  } catch (error) { console.error('Não foi possível inicializar o banco:', error); pool = undefined; return false; }
}
export function databaseReady(): boolean { return Boolean(pool); }
function requirePool(): Pool { if (!pool) throw new Error('Banco não configurado'); return pool; }
function mapProduct(row: any): ProductRecord { return { id: row.id, name: row.name, price: Number(row.price_cents) / 100, category: row.category, image: row.image, description: row.description, active: Boolean(row.active) }; }
function mapOrder(row: any): StoredOrder { return { id: row.id, customerName: row.customer_name, city: row.city, itemsJson: row.items_json, totalCents: Number(row.total_cents), paymentStatus: row.payment_status ?? row.status, fulfillmentStatus: row.fulfillment_status ?? 'waiting', preferenceId: row.preference_id ?? undefined, paymentId: row.payment_id ?? undefined, createdAt: row.created_at?.toISOString?.() ?? String(row.created_at ?? '') }; }
export async function listProducts(activeOnly = false): Promise<ProductRecord[]> { const [rows] = await requirePool().query(`SELECT * FROM products ${activeOnly ? 'WHERE active = TRUE' : ''} ORDER BY created_at DESC, name ASC`); return (rows as any[]).map(mapProduct); }
export async function findProduct(id: string): Promise<ProductRecord | undefined> { const [rows] = await requirePool().query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]); const row = (rows as any[])[0]; return row ? mapProduct(row) : undefined; }
export async function insertProduct(product: CatalogItem): Promise<void> { await requirePool().execute('INSERT INTO products (id,name,price_cents,category,image,description,active) VALUES (?,?,?,?,?,?,TRUE)', [product.id, product.name, Math.round(product.price * 100), product.category, product.image, product.description]); }
export async function updateProduct(id: string, product: CatalogItem): Promise<void> { await requirePool().execute('UPDATE products SET name=?,price_cents=?,category=?,image=?,description=? WHERE id=?', [product.name, Math.round(product.price * 100), product.category, product.image, product.description, id]); }
export async function setProductActive(id: string, active: boolean): Promise<void> { await requirePool().execute('UPDATE products SET active=? WHERE id=?', [active, id]); }
export async function insertOrder(order: StoredOrder): Promise<void> { await requirePool().execute(`INSERT INTO orders (id,customer_name,city,items_json,total_cents,status,payment_status,fulfillment_status,preference_id,payment_id) VALUES (?,?,?,?,?,?,?,?,?,?)`, [order.id, order.customerName, order.city, order.itemsJson, order.totalCents, order.paymentStatus, order.paymentStatus, order.fulfillmentStatus, order.preferenceId ?? null, order.paymentId ?? null]); }
export async function setPreference(id: string, preferenceId: string): Promise<void> { await requirePool().execute('UPDATE orders SET preference_id=? WHERE id=?', [preferenceId, id]); }
export async function setPayment(id: string, status: string, paymentId: string): Promise<void> { await requirePool().execute('UPDATE orders SET status=?,payment_status=?,payment_id=? WHERE id=?', [status, status, paymentId, id]); }
export async function setFulfillment(id: string, status: string): Promise<void> { await requirePool().execute('UPDATE orders SET fulfillment_status=? WHERE id=?', [status, id]); }
export async function findOrder(id: string): Promise<StoredOrder | undefined> { const [rows] = await requirePool().query('SELECT * FROM orders WHERE id=? LIMIT 1', [id]); const row = (rows as any[])[0]; return row ? mapOrder(row) : undefined; }
export async function findOrderByPaymentReference(id: string): Promise<StoredOrder | undefined> { const [rows] = await requirePool().query('SELECT * FROM orders WHERE id=? OR preference_id=? LIMIT 1', [id, id]); const row = (rows as any[])[0]; return row ? mapOrder(row) : undefined; }
export async function listOrders(status?: string): Promise<StoredOrder[]> { const [rows] = await requirePool().query(status ? 'SELECT * FROM orders WHERE fulfillment_status=? ORDER BY created_at DESC' : 'SELECT * FROM orders ORDER BY created_at DESC', status ? [status] : []); return (rows as any[]).map(mapOrder); }
