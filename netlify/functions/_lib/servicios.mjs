// Conexiones del servidor: almacenamiento de pedidos (Netlify Blobs), Mercado Pago y la planilla.
import { env, sheetAppUrl, siteUrl, detallePedido, textoEntrega } from "./tienda.mjs";

// ---------- Almacenamiento ----------
// En Netlify se usa Netlify Blobs. En pruebas locales (TEST_MEMORY_STORE=1) se usa memoria.
// setJSON admite { onlyIfNew } y { onlyIfMatch: etag } para que dos avisos simultáneos no pisen datos.
const memoria = globalThis.__onceMem || (globalThis.__onceMem = new Map());
const etags = globalThis.__onceTags || (globalThis.__onceTags = new Map());
let tagN = 0;
async function store(nombre) {
  if (process.env.TEST_MEMORY_STORE) {
    const k = (x) => nombre + "/" + x;
    return {
      get: async (x) => (memoria.has(k(x)) ? JSON.parse(memoria.get(k(x))) : null),
      getMeta: async (x) => (memoria.has(k(x)) ? { data: JSON.parse(memoria.get(k(x))), etag: etags.get(k(x)) } : { data: null, etag: undefined }),
      setJSON: async (x, v, o = {}) => {
        if (o.onlyIfNew && memoria.has(k(x))) return { modified: false };
        if (o.onlyIfMatch && etags.get(k(x)) !== o.onlyIfMatch) return { modified: false };
        memoria.set(k(x), JSON.stringify(v)); etags.set(k(x), "e" + ++tagN); return { modified: true };
      },
    };
  }
  const { getStore } = await import("@netlify/blobs");
  const s = getStore({ name: nombre, consistency: "strong" });
  return {
    get: (k) => s.get(k, { type: "json" }),
    getMeta: async (k) => (await s.getWithMetadata(k, { type: "json" })) || { data: null, etag: undefined },
    setJSON: async (k, v, o = {}) => { const r = await s.setJSON(k, v, o); return { modified: r && r.modified !== undefined ? r.modified : true }; },
  };
}
export async function leerPedido(codigo) {
  if (!/^LO\d{6}-[0-9A-F]{6}$/.test(String(codigo || ""))) return null;
  return (await store("pedidos")).get(codigo);
}
export async function guardarPedido(o) {
  o.actualizado = Date.now();
  await (await store("pedidos")).setJSON(o.codigo, o);
}
// Solo un proceso puede "confirmar" cada pedido (evita descontar dos veces si llegan dos avisos juntos).
export async function reclamarConfirmacion(codigo) {
  return (await (await store("confirmados")).setJSON(codigo, { fecha: Date.now() }, { onlyIfNew: true })).modified;
}

// ---------- Premios de la ruleta ----------
export async function premioUsado(codigo) {
  return !!(await (await store("premios")).get(codigo));
}
// Devuelve false si ese premio ya estaba usado por OTRO pedido.
export async function marcarPremioUsado(codigo, pedido, tel) {
  const s = await store("premios");
  const r = await s.setJSON(codigo, { pedido, fecha: Date.now() }, { onlyIfNew: true });
  let ok = r.modified;
  if (!ok) { const prev = await s.get(codigo); ok = !!(prev && prev.pedido === pedido); }
  if (tel) {
    const t = await store("premios-tel");
    const prev = await t.get(tel);
    if (prev && prev.pedido !== pedido && Date.now() - prev.fecha < 3 * 24 * 3600 * 1000) ok = false;
    await t.setJSON(tel, { pedido, codigo, fecha: Date.now() });
  }
  return ok;
}
// Un premio de la ruleta por persona (teléfono) cada 3 días.
export async function premioRecientePorTelefono(tel, ms) {
  if (!tel) return false;
  const r = await (await store("premios-tel")).get(tel);
  return !!(r && Date.now() - r.fecha < ms);
}
// Giros por conexión (IP): hasta 3 cada 3 días; después devuelve el último premio en vez de sortear otro.
export async function girosDeIp(ipHash) {
  return (await (await store("ruleta-ip")).get(ipHash)) || { giros: [] };
}
export async function guardarGiro(ipHash, registro) {
  await (await store("ruleta-ip")).setJSON(ipHash, registro);
}

// ---------- Stock sin planilla ----------
// Sin planilla conectada, el stock se lleva acá: se descuenta lo vendido del catálogo publicado.
export async function sumarVendidos(lineas) {
  const s = await store("stock");
  for (let i = 0; i < 8; i++) {
    const { data, etag } = await s.getMeta("vendidos");
    const v = data || {};
    for (const l of lineas) if (!l.pedido) v[l.id + "|" + l.talle] = (v[l.id + "|" + l.talle] || 0) + l.cant;
    const r = await s.setJSON("vendidos", v, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (r.modified) return true;
    await new Promise((ok) => setTimeout(ok, 60 + Math.random() * 140));
  }
  throw new Error("No se pudo actualizar el stock vendido");
}
export async function aplicarVendidos(cat) {
  if (cat.dePlanilla) return cat;
  const v = (await (await store("stock")).get("vendidos")) || {};
  for (const [k, n] of Object.entries(v)) {
    const [id, talle] = k.split("|");
    const p = cat.productos.get(id);
    if (!p || p.pedido) continue;
    p.stock[talle] = Math.max(0, (p.stock[talle] || 0) - n);
    p.talles = p.talles.filter((t) => p.stock[t] > 0);
  }
  return cat;
}

// ---------- Mercado Pago ----------
const MP = "https://api.mercadopago.com";
function token() {
  const t = env("MP_ACCESS_TOKEN");
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN");
  return t;
}
async function mp(path, opts = {}) {
  const r = await fetch(MP + path, {
    ...opts,
    headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!r.ok) { const err = new Error("Mercado Pago " + r.status + ": " + (data && (data.message || data.error) || text).toString().slice(0, 200)); err.mp = data; err.status = r.status; throw err; }
  return data;
}

function urls(o) {
  const site = siteUrl().replace(/\/+$/, "");
  const back = (r) => `${site}/?pedido=${encodeURIComponent(o.codigo)}&r=${r}`;
  return { site, back, notif: site + "/api/mp-webhook" };
}

// Checkout Pro solo con dinero en cuenta de Mercado Pago (la opción con descuento).
export async function crearPreferencia(o) {
  const u = urls(o);
  const pref = await mp("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [{ id: o.codigo, title: `La ONCE Kits · Pedido ${o.codigo}`, description: o.lineas.map((l) => `${l.cant}x ${l.club} ${l.talle}`).join(", ").slice(0, 250), quantity: 1, currency_id: "ARS", unit_price: o.total }],
      payer: { name: o.comprador.nombre, email: o.comprador.email },
      external_reference: o.codigo,
      notification_url: u.notif,
      back_urls: { success: u.back("ok"), failure: u.back("error"), pending: u.back("pendiente") },
      auto_return: "approved",
      binary_mode: true,
      statement_descriptor: "LA ONCE KITS",
      payment_methods: {
        excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "prepaid_card" }, { id: "ticket" }, { id: "atm" }],
        installments: 1,
      },
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      metadata: { pedido: o.codigo },
    }),
  });
  return pref.init_point;
}

export async function pagarConTarjeta(o, card) {
  const u = urls(o);
  const payer = card && card.payer ? card.payer : {};
  return mp("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": o.codigo + "-intento-" + (o.intentos || 0) },
    body: JSON.stringify({
      transaction_amount: o.total,
      token: card.token,
      description: `La ONCE Kits · Pedido ${o.codigo}`,
      installments: Math.max(1, Math.floor(Number(card.installments) || 1)),
      payment_method_id: card.payment_method_id,
      issuer_id: card.issuer_id || undefined,
      payer: { email: payer.email || o.comprador.email, identification: payer.identification && payer.identification.number ? payer.identification : undefined },
      external_reference: o.codigo,
      notification_url: u.notif,
      statement_descriptor: "LA ONCE KITS",
      binary_mode: true,
      metadata: { pedido: o.codigo },
    }),
  });
}

export const verPago = (id) => mp("/v1/payments/" + encodeURIComponent(id));
export async function buscarPagos(codigo) {
  const r = await mp("/v1/payments/search?sort=date_created&criteria=desc&external_reference=" + encodeURIComponent(codigo));
  return (r && r.results) || [];
}

// ---------- Planilla (Apps Script) ----------
async function planilla(body) {
  const url = sheetAppUrl();
  const clave = env("SHEET_SECRET");
  if (!url || !clave) return { ok: false, sinPlanilla: true };
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body, clave }), redirect: "follow", signal: AbortSignal.timeout(6000) });
    const t = await r.text();
    try { const j = JSON.parse(t); return j && typeof j === "object" ? j : { ok: false }; } catch (e) { return { ok: false, error: "respuesta no válida de la planilla" }; }
  } catch (e) { return { ok: false, error: String(e) }; }
}
function filaPedido(o) {
  return { codigo: o.codigo, nombre: o.comprador.nombre, telefono: o.comprador.telefono, email: o.comprador.email, entrega: textoEntrega(o.comprador), pago: o.metodo === "tarjeta" ? "Tarjeta (online)" : "Mercado Pago (online)", total: o.total, detalle: detallePedido(o) };
}
export function planillaNuevoPedido(o) {
  return planilla({ tipo: "pedido_online", ...filaPedido(o), estado: "Esperando pago" });
}
// Lleva también los datos del pedido: si la fila no existía, la planilla la crea ya como "Pagado".
export function planillaPago(o) {
  return planilla({ tipo: "pago", ...filaPedido(o), nota: o.nota || "", pago_id: String(o.pago && o.pago.id || ""), items: o.lineas.filter((l) => !l.pedido).map((l) => ({ id: l.id, talle: l.talle, cant: l.cant })) });
}
export function planillaEstado(o, estado) {
  return planilla({ tipo: "estado", codigo: o.codigo, estado });
}
