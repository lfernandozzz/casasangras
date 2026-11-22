import crypto from 'node:crypto';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { catalogById } from './catalog.js';
import { databaseReady, findOrder, findOrderByPaymentReference, initDatabase, insertOrder, setPayment, setPreference, type StoredOrder } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const root = process.cwd();
const memoryOrders = new Map<string, StoredOrder>();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function baseUrl(req: Request): string {
  const configured = text(process.env.APP_URL, 300);
  if (configured) return configured.replace(/\/$/, '');
  const forwardedProto = text(req.header('x-forwarded-proto'), 20) || req.protocol;
  const forwardedHost = text(req.header('x-forwarded-host'), 200) || req.get('host') || 'localhost:3000';
  return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
}

async function saveOrder(order: StoredOrder): Promise<void> {
  memoryOrders.set(order.id, order);
  if (databaseReady()) {
    try { await insertOrder(order); } catch (error) { console.error('Falha ao persistir pedido:', error); }
  }
}

async function updatePreference(id: string, preferenceId: string): Promise<void> {
  const memory = memoryOrders.get(id);
  if (memory) memory.preferenceId = preferenceId;
  if (databaseReady()) {
    try { await setPreference(id, preferenceId); } catch (error) { console.error('Falha ao salvar preferência:', error); }
  }
}

async function updatePayment(id: string, status: string, paymentId: string): Promise<void> {
  const memory = memoryOrders.get(id);
  if (memory) { memory.status = status; memory.paymentId = paymentId; }
  if (databaseReady()) {
    try { await setPayment(id, status, paymentId); } catch (error) { console.error('Falha ao atualizar pagamento:', error); }
  }
}

async function loadOrder(id: string): Promise<StoredOrder | undefined> {
  if (databaseReady()) {
    try {
      const order = await findOrder(id);
      if (order) return order;
    } catch (error) { console.error('Falha ao consultar pedido:', error); }
  }
  return memoryOrders.get(id);
}

async function loadOrderByPaymentReference(id: string): Promise<StoredOrder | undefined> {
  if (databaseReady()) {
    try {
      const order = await findOrderByPaymentReference(id);
      if (order) return order;
    } catch (error) { console.error('Falha ao consultar referência:', error); }
  }
  return memoryOrders.get(id);
}

function validateItems(input: unknown): { items: Array<{ id: string; quantity: number; title: string; unitPrice: number }>; totalCents: number } {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) throw new Error('Carrinho inválido.');
  const items: Array<{ id: string; quantity: number; title: string; unitPrice: number }> = [];
  let totalCents = 0;
  for (const raw of input) {
    const id = text((raw as any)?.id, 20);
    const quantity = Number((raw as any)?.quantity);
    const product = catalogById.get(id);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Produto ou quantidade inválida.');
    const unitCents = Math.round(product.price * 100);
    totalCents += unitCents * quantity;
    items.push({ id, quantity, title: product.name, unitPrice: product.price });
  }
  if (totalCents <= 0 || totalCents > 10_000_000) throw new Error('Valor do pedido inválido.');
  return { items, totalCents };
}

function parseSignature(value: string): Record<string, string> {
  return Object.fromEntries(value.split(',').map((part) => part.trim().split('=').map((piece) => piece.trim())).filter(([key, val]) => key && val));
}

function validWebhook(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  const signature = req.header('x-signature');
  const requestId = req.header('x-request-id');
  if (!secret || !signature || !requestId || !dataId) return false;
  const parsed = parseSignature(signature);
  if (!parsed.ts || !parsed.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  const given = Buffer.from(parsed.v1, 'utf8');
  const actual = Buffer.from(expected, 'utf8');
  return given.length === actual.length && crypto.timingSafeEqual(given, actual);
}

async function fetchPayment(paymentId: string): Promise<{ status?: string; external_reference?: string }> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('Mercado Pago não configurado.');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const data = await response.json() as { status?: string; external_reference?: string; message?: string };
  if (!response.ok) throw new Error(data.message || 'Não foi possível consultar o pagamento.');
  return data;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: databaseReady(), payment: Boolean(process.env.MP_ACCESS_TOKEN) }));

app.post('/api/checkout/preferences', async (req, res) => {
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return res.status(503).json({ error: 'O Mercado Pago ainda não foi configurado no servidor.' });
    const { items, totalCents } = validateItems(req.body?.items);
    const customerName = text(req.body?.customer?.name, 80);
    const city = text(req.body?.customer?.city, 80);
    if (customerName.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
    const orderId = crypto.randomUUID();
    await saveOrder({ id: orderId, customerName, city, itemsJson: JSON.stringify(items), totalCents, status: 'pending' });
    const origin = baseUrl(req);
    const preferencePayload = {
      items: items.map((item) => ({ title: item.title, quantity: item.quantity, unit_price: item.unitPrice, currency_id: 'BRL' })),
      external_reference: orderId,
      notification_url: `${origin}/api/payments/webhook`,
      back_urls: {
        success: `${origin}/?payment=success&order_id=${encodeURIComponent(orderId)}`,
        failure: `${origin}/?payment=failure&order_id=${encodeURIComponent(orderId)}`,
        pending: `${origin}/?payment=pending&order_id=${encodeURIComponent(orderId)}`
      },
      auto_return: 'approved',
      payer: { name: customerName }
    };
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(preferencePayload)
    });
    const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string; message?: string };
    if (!response.ok || !data.id) return res.status(502).json({ error: data.message || 'Mercado Pago recusou a preferência.' });
    await updatePreference(orderId, data.id);
    const checkoutUrl = process.env.MP_MODE === 'production' ? data.init_point : (data.sandbox_init_point || data.init_point);
    if (!checkoutUrl) return res.status(502).json({ error: 'Mercado Pago não retornou o endereço do checkout.' });
    return res.status(201).json({ orderId, checkoutUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.';
    return res.status(400).json({ error: message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const order = await loadOrder(text(req.params.id, 80));
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
  return res.json({ id: order.id, status: order.status, totalCents: order.totalCents });
});

app.post('/api/payments/webhook', async (req, res) => {
  const dataId = text(req.query['data.id'] ?? req.query.id ?? req.body?.data?.id, 100);
  if (!validWebhook(req, dataId)) return res.status(401).json({ error: 'Assinatura inválida.' });
  if (text(req.query.type ?? req.body?.type, 30) !== 'payment' && req.body?.type !== 'payment') return res.sendStatus(200);
  try {
    const payment = await fetchPayment(dataId);
    const orderId = text(payment.external_reference, 80);
    const order = await loadOrderByPaymentReference(orderId);
    if (order && payment.status) await updatePayment(order.id, payment.status, dataId);
    return res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Mercado Pago:', error);
    return res.sendStatus(500);
  }
});

app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/style.css', (_req, res) => res.sendFile(path.join(root, 'style.css')));
app.get('/app.js', (_req, res) => res.sendFile(path.join(root, 'app.js')));
app.get('/manus-routes.json', (_req, res) => res.sendFile(path.join(root, 'manus-routes.json')));
app.use('/img', express.static(path.join(root, 'img'), { dotfiles: 'deny', fallthrough: false }));

await initDatabase();
app.listen(port, '0.0.0.0', () => console.log(`Casas Angra server listening on ${port}`));
