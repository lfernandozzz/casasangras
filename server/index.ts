import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { catalog, catalogById, type CatalogItem } from './catalog.js';
import { databaseReady, findOrder, findOrderByPaymentReference, findProduct, initDatabase, insertOrder, insertProduct, listOrders, listProducts, setFulfillment, setPayment, setPreference, setProductActive, updateProduct, type ProductRecord, type StoredOrder } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const root = process.cwd();
const memoryOrders = new Map<string, StoredOrder>();
const memoryProducts = new Map(catalog.map((product) => [product.id, { ...product, active: true }]));
const allowedFulfillment = new Set(['waiting', 'preparing', 'ready', 'delivered', 'cancelled']);

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function text(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function baseUrl(req: Request): string { const configured = text(process.env.APP_URL, 300) || 'https://casasangra-te4foniu.manus.space'; if (configured) return configured.replace(/\/$/, ''); const proto = text(req.header('x-forwarded-proto'), 20) || req.protocol; const host = text(req.header('x-forwarded-host'), 200) || req.get('host') || 'localhost:3000'; return `${proto}://${host}`.replace(/\/$/, ''); }
function mapProduct(product: ProductRecord | CatalogItem): Record<string, unknown> { return { ...product, price: Number(product.price) }; }
async function saveOrder(order: StoredOrder): Promise<void> { memoryOrders.set(order.id, order); if (databaseReady()) { try { await insertOrder(order); } catch (error) { console.error('Falha ao persistir pedido:', error); } } }
async function updatePreference(id: string, preferenceId: string): Promise<void> { const memory = memoryOrders.get(id); if (memory) memory.preferenceId = preferenceId; if (databaseReady()) { try { await setPreference(id, preferenceId); } catch (error) { console.error('Falha ao salvar preferência:', error); } } }
async function updatePayment(id: string, status: string, paymentId: string): Promise<void> { const memory = memoryOrders.get(id); if (memory) { memory.paymentStatus = status; } if (databaseReady()) { try { await setPayment(id, status, paymentId); } catch (error) { console.error('Falha ao atualizar pagamento:', error); } } }
async function loadOrder(id: string): Promise<StoredOrder | undefined> { if (databaseReady()) { try { const order = await findOrder(id); if (order) return order; } catch (error) { console.error('Falha ao consultar pedido:', error); } } return memoryOrders.get(id); }
async function loadOrderByPaymentReference(id: string): Promise<StoredOrder | undefined> { if (databaseReady()) { try { const order = await findOrderByPaymentReference(id); if (order) return order; } catch (error) { console.error('Falha ao consultar referência:', error); } } return memoryOrders.get(id); }
async function activeProductList(): Promise<Array<Record<string, unknown>>> { if (databaseReady()) { try { return (await listProducts(true)).map(mapProduct); } catch (error) { console.error('Falha ao listar produtos:', error); } } return [...memoryProducts.values()].filter((product) => product.active).map(mapProduct); }
async function findTrustedProduct(id: string): Promise<ProductRecord | CatalogItem | undefined> { if (databaseReady()) { try { return await findProduct(id); } catch (error) { console.error('Falha ao consultar produto:', error); } } return memoryProducts.get(id) ?? catalogById.get(id); }

function normalizeProduct(body: any): CatalogItem {
  const id = text(body?.id, 20).toUpperCase(); const name = text(body?.name, 120); const category = text(body?.category, 50); const rawImage = text(body?.image, 500); const image = /^https:\/\//i.test(rawImage) ? rawImage : rawImage.replace(/\.webp$/i, ''); const description = text(body?.description, 500); const price = Number(String(body?.price ?? '').replace(',', '.'));
  if (!/^[A-Z0-9]{2,20}$/.test(id) || name.length < 2 || category.length < 2 || !(/^[a-z0-9-]+$/i.test(image) || /^https:\/\//i.test(image)) || description.length < 2 || !Number.isFinite(price) || price <= 0 || price > 100000) throw new Error('Preencha código, nome, preço, categoria, imagem e descrição válidos.');
  return { id, name, price: Math.round(price * 100) / 100, category, image, description };
}
async function validateItems(input: unknown): Promise<{ items: Array<{ id: string; quantity: number; title: string; unitPrice: number }>; totalCents: number }> {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) throw new Error('Carrinho inválido.');
  const items: Array<{ id: string; quantity: number; title: string; unitPrice: number }> = []; let totalCents = 0;
  for (const raw of input) { const id = text((raw as any)?.id, 20); const quantity = Number((raw as any)?.quantity); const product = await findTrustedProduct(id); if (!product || ('active' in product && !product.active) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Produto ou quantidade inválida.'); const unitCents = Math.round(product.price * 100); totalCents += unitCents * quantity; items.push({ id, quantity, title: product.name, unitPrice: product.price }); }
  if (totalCents <= 0 || totalCents > 10000000) throw new Error('Valor do pedido inválido.'); return { items, totalCents };
}
function parseSignature(value: string): Record<string, string> { const result: Record<string, string> = {}; for (const part of value.split(',')) { const [key, val] = part.trim().split('='); if (key && val) result[key] = val; } return result; }
function validWebhook(req: Request, dataId: string): boolean { const secret = process.env.MP_WEBHOOK_SECRET; const signature = req.header('x-signature'); const requestId = req.header('x-request-id'); if (!secret || !signature || !requestId || !dataId) return false; const parsed = parseSignature(signature); if (!parsed.ts || !parsed.v1) return false; const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`; const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex'); const given = Buffer.from(parsed.v1); const actual = Buffer.from(expected); return given.length === actual.length && crypto.timingSafeEqual(given, actual); }
async function fetchPayment(paymentId: string): Promise<{ status?: string; external_reference?: string }> { const token = process.env.MP_ACCESS_TOKEN; if (!token) throw new Error('Mercado Pago não configurado.'); const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }); const data = await response.json() as { status?: string; external_reference?: string; message?: string }; if (!response.ok) throw new Error(data.message || 'Não foi possível consultar o pagamento.'); return data; }

function adminPassword(): string { return text(process.env.ADMIN_PASSWORD, 200); }
function sessionToken(expiry: number): string { const password = adminPassword(); if (!password) return ''; const payload = String(expiry); return `${payload}.${crypto.createHmac('sha256', password).update(payload).digest('hex')}`; }
function adminSessionValid(req: Request): boolean { const password = adminPassword(); const raw = req.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith('admin_session='))?.slice('admin_session='.length); if (!password || !raw) return false; const [expiry, signature] = raw.split('.'); if (!expiry || !signature || Number(expiry) < Date.now()) return false; const expected = sessionToken(Number(expiry)).split('.')[1]; const given = Buffer.from(signature); const actual = Buffer.from(expected); return given.length === actual.length && crypto.timingSafeEqual(given, actual); }
function requireAdmin(req: Request, res: Response, next: NextFunction): void { if (!adminSessionValid(req)) { res.status(401).json({ error: 'Faça login para acessar o painel.' }); return; } next(); }
function publicOrder(order: StoredOrder): Record<string, unknown> { return { ...order, itemsJson: order.itemsJson }; }

app.get('/api/health', (_req, res) => res.json({ ok: true, database: databaseReady(), payment: Boolean(process.env.MP_ACCESS_TOKEN), admin: Boolean(process.env.ADMIN_PASSWORD) }));
app.get('/api/products', async (_req, res) => res.json(await activeProductList()));
app.post('/api/checkout/preferences', async (req, res) => {
  try {
    const token = process.env.MP_ACCESS_TOKEN; if (!token) return res.status(503).json({ error: 'O Mercado Pago ainda não foi configurado no servidor.' });
    const { items, totalCents } = await validateItems(req.body?.items); const customerName = text(req.body?.customer?.name, 80); const city = text(req.body?.customer?.city, 80); if (customerName.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
    const orderId = crypto.randomUUID(); await saveOrder({ id: orderId, customerName, city, itemsJson: JSON.stringify(items), totalCents, paymentStatus: 'pending', fulfillmentStatus: 'waiting' }); const origin = baseUrl(req);
    const preferencePayload = { items: items.map((item) => ({ title: item.title, quantity: item.quantity, unit_price: item.unitPrice, currency_id: 'BRL' })), external_reference: orderId, notification_url: `${origin}/api/payments/webhook`, back_urls: { success: `${origin}/?payment=success&order_id=${encodeURIComponent(orderId)}`, failure: `${origin}/?payment=failure&order_id=${encodeURIComponent(orderId)}`, pending: `${origin}/?payment=pending&order_id=${encodeURIComponent(orderId)}` }, auto_return: 'approved', payer: { name: customerName } };
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(preferencePayload) }); const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string; message?: string }; if (!response.ok || !data.id) return res.status(502).json({ error: data.message || 'Mercado Pago recusou a preferência.' }); await updatePreference(orderId, data.id); const testMode = process.env.MP_MODE === 'test' || token.startsWith('TEST-'); const checkoutUrl = testMode ? (data.sandbox_init_point || data.init_point) : data.init_point; if (!checkoutUrl) return res.status(502).json({ error: 'Mercado Pago não retornou o endereço do checkout.' }); return res.status(201).json({ orderId, checkoutUrl });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.' }); }
});
app.get('/api/orders/:id', async (req, res) => { const order = await loadOrder(text(req.params.id, 80)); if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' }); return res.json({ id: order.id, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus, totalCents: order.totalCents }); });
app.post('/api/payments/webhook', async (req, res) => { const dataId = text(req.query['data.id'] ?? req.query.id ?? req.body?.data?.id, 100); if (!validWebhook(req, dataId)) return res.status(401).json({ error: 'Assinatura inválida.' }); if (text(req.query.type ?? req.body?.type, 30) !== 'payment' && req.body?.type !== 'payment') return res.sendStatus(200); try { const payment = await fetchPayment(dataId); const order = await loadOrderByPaymentReference(text(payment.external_reference, 80)); if (order && payment.status) await updatePayment(order.id, payment.status, dataId); return res.sendStatus(200); } catch (error) { console.error('Webhook Mercado Pago:', error); return res.sendStatus(500); } });

app.post('/api/admin/login', (req, res) => { const configured = adminPassword(); const supplied = text(req.body?.password, 200); if (!configured) return res.status(503).json({ error: 'A senha administrativa ainda não foi configurada.' }); const expected = Buffer.from(configured); const actual = Buffer.from(supplied); if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return res.status(401).json({ error: 'Senha inválida.' }); const expiry = Date.now() + 1000 * 60 * 60 * 12; res.setHeader('Set-Cookie', `admin_session=${sessionToken(expiry)}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=43200`); return res.json({ ok: true }); });
app.post('/api/admin/logout', (_req, res) => { res.setHeader('Set-Cookie', 'admin_session=; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/admin/me', requireAdmin, (_req, res) => res.json({ ok: true }));
app.get('/api/admin/products', requireAdmin, async (_req, res) => { if (!databaseReady()) return res.status(503).json({ error: 'Banco indisponível.' }); return res.json(await listProducts()); });
app.post('/api/admin/products', requireAdmin, async (req, res) => { try { if (!databaseReady()) return res.status(503).json({ error: 'Banco indisponível.' }); const product = normalizeProduct(req.body); if (await findProduct(product.id)) return res.status(409).json({ error: 'Esse código já existe.' }); await insertProduct(product); return res.status(201).json(mapProduct({ ...product, active: true })); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Produto inválido.' }); } });
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => { try { if (!databaseReady()) return res.status(503).json({ error: 'Banco indisponível.' }); const id = text(req.params.id, 20).toUpperCase(); const product = normalizeProduct({ ...req.body, id }); await updateProduct(id, product); return res.json(mapProduct({ ...product, active: true })); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Produto inválido.' }); } });
app.patch('/api/admin/products/:id/active', requireAdmin, async (req, res) => { if (!databaseReady()) return res.status(503).json({ error: 'Banco indisponível.' }); await setProductActive(text(req.params.id, 20).toUpperCase(), Boolean(req.body?.active)); return res.json({ ok: true }); });
app.get('/api/admin/orders', requireAdmin, async (req, res) => { if (!databaseReady()) return res.status(503).json({ error: 'Banco indisponível.' }); const status = text(req.query.status, 30); return res.json((await listOrders(status || undefined)).map(publicOrder)); });
app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => { if (!databaseReady()) return res.status(503).json({ error: 'Banco indisponível.' }); const id = text(req.params.id, 80); if (typeof req.body?.fulfillmentStatus === 'string') { const status = text(req.body.fulfillmentStatus, 30); if (!allowedFulfillment.has(status)) return res.status(400).json({ error: 'Status de entrega inválido.' }); await setFulfillment(id, status); } if (typeof req.body?.paymentStatus === 'string') { const status = text(req.body.paymentStatus, 30); if (!['pending', 'approved', 'authorized', 'rejected', 'refunded', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Status de pagamento inválido.' }); await setPayment(id, status, 'admin'); } return res.json({ ok: true }); });

app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(root, 'admin.html')));
app.get('/style.css', (_req, res) => res.sendFile(path.join(root, 'style.css')));
app.get('/app.js', (_req, res) => res.sendFile(path.join(root, 'app.js')));
app.get('/admin.css', (_req, res) => res.sendFile(path.join(root, 'admin.css')));
app.get('/admin.js', (_req, res) => res.sendFile(path.join(root, 'admin.js')));
app.get('/manus-routes.json', (_req, res) => res.sendFile(path.join(root, 'manus-routes.json')));
app.use('/img', express.static(path.join(root, 'img'), { dotfiles: 'deny', fallthrough: false }));

if (process.env.VERCEL !== '1') {
  await initDatabase();
  app.listen(port, '0.0.0.0', () => console.log(`Casas Angra server listening on ${port}`));
} else {
  void initDatabase();
}

export default app;
