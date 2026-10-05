// Lógica compartida de la tienda del lado del servidor: catálogo, precios, stock y premios.
// El servidor nunca confía en precios ni descuentos que mande el navegador: todo se recalcula acá.
import crypto from "node:crypto";
import catalogo from "./catalogo.mjs";

export const TALLES = ["S", "M", "L", "XL", "XXL"];

// Misma tabla que src/ruleta.js (mantener sincronizadas). weight sobre 10.000.
export const PREMIOS = [
  { label: "$3.000 OFF", weight: 5900, monto: 3000 },
  { label: "$6.000 OFF", weight: 2500, monto: 6000 },
  { label: "15% OFF", weight: 1000, pct: 15 },
  { label: "25% OFF", weight: 350, pct: 25 },
  { label: "Envío gratis", weight: 150, envio: true },
  { label: "Mystery Box", weight: 100, mystery: true },
];
export const BOLSILLOS = [5, 0, 2, 1, 0, 3, 1, 0, 4, 2, 0, 1, 3, 0, 1, 2, 0, 4];
export const DURACION_PREMIO = 3 * 24 * 60 * 60 * 1000;

export function env(name, def = "") {
  const v = (globalThis.Netlify && Netlify.env && Netlify.env.get(name)) || process.env[name];
  return v == null || v === "" ? def : String(v);
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });
}

export function siteUrl() {
  return env("SITE_URL") || env("URL") || "";
}

// ---------- Catálogo: planilla de Google (si está conectada) o el catálogo publicado ----------
function sheetId() {
  const v = String(catalogo.config.planilla || "").trim();
  const m = v.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : /^[a-zA-Z0-9_-]{20,}$/.test(v) ? v : "";
}
export function sheetAppUrl() {
  const v = env("SHEET_APP_URL") || String(catalogo.config.planillaApp || "");
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(v) ? v : "";
}

function bool(v, def) {
  if (v == null || v === "") return def;
  return !/^(no|n|false|0)$/i.test(String(v).trim());
}

// Lee las filas de la pestaña Productos. Primero por la app de la planilla (action=catalogo, lo mismo
// que usa la página); si no hay app, por el link público de la planilla.
async function productosDePlanilla() {
  const app = sheetAppUrl();
  if (app) {
    const url = app + (app.includes("?") ? "&" : "?") + "action=catalogo&callback=onceServidor";
    const r = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error("planilla app " + r.status);
    const t = (await r.text()).trim();
    const cuerpo = t.startsWith("{") ? t : t.slice(t.indexOf("(") + 1, t.lastIndexOf(")"));
    const j = JSON.parse(cuerpo);
    if (!j || !j.ok || !Array.isArray(j.productos)) throw new Error("planilla app sin productos");
    return { filas: j.productos, autoritativa: true };
  }
  const id = sheetId();
  if (!id) return null;
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=1&sheet=Productos`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error("planilla " + r.status);
  const t = await r.text();
  const j = JSON.parse(t.slice(t.indexOf("(") + 1, t.lastIndexOf(")")));
  const cols = j.table.cols.map((c) => String(c.label || "").trim());
  return {
    filas: (j.table.rows || []).map((row) => {
      const o = {};
      (row.c || []).forEach((c, i) => (o[cols[i]] = c ? (c.v != null ? c.v : c.f) : null));
      return o;
    }),
    autoritativa: false,
  };
}

// Devuelve un mapa id -> {id, club, titulo, precio, pedido(bool), stock{S..}, talles[]}
export async function cargarCatalogo() {
  const base = new Map();
  for (const p of catalogo.productos) {
    if (p.activo === false) continue;
    const pedido = p.modalidad === "pedido";
    base.set(p.id, {
      id: p.id, club: p.club, titulo: p.titulo, precio: Number(p.precio) || 0, pedido,
      stock: pedido ? {} : { ...p.stock },
      talles: pedido ? (p.tallesPedido || []) : TALLES.filter((t) => Number((p.stock || {})[t]) > 0),
    });
  }
  let hoja = null;
  try { hoja = await productosDePlanilla(); } catch (e) { console.error("catalogo planilla", e); hoja = null; }
  const filas = hoja && hoja.filas;
  if (filas) {
    // Igual que la página: con la app de la planilla, lo que no está en la planilla no se vende.
    if (hoja.autoritativa) {
      const ids = new Set(filas.map((r) => String(r.id || "").trim()));
      for (const id of [...base.keys()]) if (!ids.has(id)) base.delete(id);
    }
    for (const r of filas) {
      const id = String(r.id || "").trim();
      if (!id) continue;
      if (!bool(r.activo, true)) { base.delete(id); continue; }
      const pedido = String(r.modalidad || "").trim().toLowerCase() === "pedido";
      const prev = base.get(id) || { id, club: "", titulo: "" };
      const precio = Math.round(Number(r.precio));
      if (!Number.isFinite(precio) && !prev.precio) continue;
      const p = { ...prev, pedido, club: r.club ? String(r.club) : prev.club, titulo: r.titulo ? String(r.titulo) : prev.titulo, precio: precio > 0 ? precio : prev.precio || 0 };
      if (pedido) { p.stock = {}; p.talles = TALLES.filter((t) => Number(r[t]) > 0 || /^s[ií]$/i.test(String(r[t] || "").trim())); }
      else { p.stock = {}; TALLES.forEach((t) => (p.stock[t] = Math.max(0, Math.floor(Number(r[t]) || 0)))); p.talles = TALLES.filter((t) => p.stock[t] > 0); }
      if (p.club && p.precio > 0) base.set(id, p);
    }
  }
  return { productos: base, config: catalogo.config, dePlanilla: !!filas };
}

// ---------- Premios de la ruleta firmados por el servidor ----------
function secretoPremios() {
  const s = env("PRIZE_SECRET") || env("MP_ACCESS_TOKEN");
  if (!s) throw new Error("Falta PRIZE_SECRET");
  return s;
}
const b64 = (s) => Buffer.from(s).toString("base64url");
export function firmarPremio(data) {
  const body = b64(JSON.stringify(data));
  const sig = crypto.createHmac("sha256", secretoPremios()).update(body).digest("base64url");
  return body + "." + sig;
}
export function leerPremio(token) {
  if (typeof token !== "string" || token.length > 600 || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const ok = crypto.createHmac("sha256", secretoPremios()).update(body).digest("base64url");
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null;
  let d;
  try { d = JSON.parse(Buffer.from(body, "base64url").toString()); } catch (e) { return null; }
  if (!Number.isInteger(d.p) || !PREMIOS[d.p] || !Number.isFinite(d.t)) return null;
  if (Date.now() - d.t > DURACION_PREMIO || d.t > Date.now() + 60000) return null;
  return d;
}
export function sortearPremio() {
  const a = new Uint32Array(1), max = Math.floor(4294967296 / 10000) * 10000;
  do { crypto.getRandomValues(a); } while (a[0] >= max);
  const n = a[0] % 10000;
  let suma = 0, p = 0;
  for (let i = 0; i < PREMIOS.length; i++) { suma += PREMIOS[i].weight; if (n < suma) { p = i; break; } }
  const opciones = BOLSILLOS.map((x, k) => (x === p ? k : -1)).filter((k) => k >= 0);
  const k = opciones[crypto.randomInt(opciones.length)];
  const t = Date.now();
  const code = "ONCE-" + t.toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
  return { p, k, t, c: code };
}

// ---------- Armado y precio del pedido ----------
const limpiar = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

function limpiarPers(x) {
  if (!x || typeof x !== "object") return null;
  const nombre = String(x.nombre || "").toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ .'-]/g, "").replace(/\s+/g, " ").trim().slice(0, 12);
  const numero = String(x.numero == null ? "" : x.numero).replace(/\D/g, "").slice(0, 2);
  return nombre || numero ? { nombre, numero } : null;
}

export class ErrorPedido extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

// items: [{id, talle, cant, pers}] · metodo: "mercadopago" | "tarjeta"
export function calcularPedido(cat, items, metodo, premio, entrega) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw new ErrorPedido("El carrito está vacío.");
  const cfg = cat.config;
  const persPrecio = Math.max(0, Math.round(Number(cfg.precioPersonalizacion) || 0));
  const lineas = [];
  const usados = {};
  for (const it of items) {
    const p = cat.productos.get(String(it && it.id || ""));
    const talle = String(it && it.talle || "");
    const cant = Math.floor(Number(it && it.cant));
    if (!p) throw new ErrorPedido("Una de las camisetas ya no está disponible. Revisá el carrito.", 409);
    if (!TALLES.includes(talle) || !(cant >= 1 && cant <= 10)) throw new ErrorPedido("Revisá talles y cantidades.");
    if (!p.talles.includes(talle)) throw new ErrorPedido(`${p.club} ${p.titulo}: no hay talle ${talle} disponible.`, 409);
    const key = p.id + "|" + talle;
    usados[key] = (usados[key] || 0) + cant;
    const max = p.pedido ? 5 : p.stock[talle] || 0;
    if (usados[key] > max) throw new ErrorPedido(`${p.club} ${p.titulo}: quedan ${max} en talle ${talle}.`, 409);
    const pers = p.pedido ? limpiarPers(it.pers) : null;
    const unit = p.precio + (pers ? persPrecio : 0);
    lineas.push({ id: p.id, club: p.club, titulo: p.titulo, talle, cant, pers, pedido: p.pedido, unit, total: unit * cant });
  }
  const sub = lineas.reduce((a, l) => a + l.total, 0);
  const d = Number(cfg.descuentoTransferencia) || 0;
  const td = metodo === "mercadopago" ? Math.round((sub * d) / 100) : 0;
  let pd = 0, usaPremio = false, apila = false, envioGratis = false, mystery = false, premioInfo = null;
  if (premio) {
    const P = PREMIOS[premio.p];
    premioInfo = { codigo: premio.c, label: P.label };
    if (P.envio) envioGratis = entrega === "envio";
    else if (P.mystery) mystery = true;
    else {
      const stock = lineas.filter((l) => !l.pedido);
      if (stock.length) {
        const barata = stock.reduce((a, b) => (b.unit < a.unit ? b : a));
        const base = cat.productos.get(barata.id).precio;
        if (P.monto) { pd = Math.min(P.monto, base); apila = true; }
        else pd = Math.round((base * P.pct) / 100);
      }
    }
    usaPremio = pd > 0 && (apila || pd > td);
  }
  const descuento = apila ? td + pd : usaPremio ? pd : td;
  const total = Math.max(0, Math.round(sub - descuento));
  const premioAplicado = !!premio && (usaPremio || envioGratis || mystery);
  return {
    lineas, subtotal: sub, descuentoTransferencia: apila || !usaPremio ? td : 0, descuentoPremio: usaPremio ? pd : 0,
    total, envioGratisPremio: envioGratis, mysteryBox: mystery, premio: premioAplicado ? premioInfo : null,
  };
}

export function datosComprador(b) {
  const c = b && typeof b === "object" ? b : {};
  const email = limpiar(c.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErrorPedido("Revisá el email.");
  const nombre = limpiar(c.nombre, 80);
  if (nombre.length < 2) throw new ErrorPedido("Poné tu nombre.");
  const telefono = limpiar(c.telefono, 30);
  if (telefono.replace(/\D/g, "").length < 8) throw new ErrorPedido("Revisá el teléfono.");
  const entrega = c.entrega === "retiro" ? "retiro" : "envio";
  const out = { nombre, email, telefono, entrega, notas: limpiar(c.notas, 300) };
  if (entrega === "envio") {
    out.direccion = limpiar(c.direccion, 120); out.depto = limpiar(c.depto, 20); out.localidad = limpiar(c.localidad, 80); out.cp = limpiar(c.cp, 12);
    if (!out.direccion || !out.localidad || !out.cp) throw new ErrorPedido("Completá la dirección de entrega.");
  }
  return out;
}

// Teléfono solo con dígitos, sin 54/9/0/15, para limitar un premio por persona.
export function telefonoClave(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("54") && d.length >= 12) d = d.slice(2);
  if (d.length === 11 && d[0] === "9") d = d.slice(1);
  if (d[0] === "0") d = d.slice(1);
  return d.slice(-10);
}

export function textoEntrega(c) {
  return c.entrega === "envio" ? `Envío a ${c.direccion}${c.depto ? " (depto " + c.depto + ")" : ""}, ${c.localidad} (${c.cp})` : "Retiro a coordinar";
}

export function nuevoCodigo() {
  const d = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(2, 10).replace(/-/g, "");
  return "LO" + d + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

export function detallePedido(o) {
  const money = (n) => "$" + Math.round(n).toLocaleString("es-AR");
  const l = o.lineas.map((x) => `• ${x.cant} x ${x.club} ${x.titulo} [${x.pedido ? "POR PEDIDO" : "EN STOCK"}] (talle ${x.talle}${x.pers ? ", Nombre y número: " + [x.pers.nombre, x.pers.numero].filter(Boolean).join(" · ") : ""}) ${money(x.total)}`);
  return [
    `Pedido N° ${o.codigo} · Pago: ${o.metodo === "tarjeta" ? "Tarjeta" : "Mercado Pago"}`,
    ...l,
    `Subtotal: ${money(o.subtotal)}`,
    o.descuentoTransferencia ? `Descuento Mercado Pago: -${money(o.descuentoTransferencia)}` : "",
    o.descuentoPremio ? `Premio ruleta (${o.premio.codigo}): -${money(o.descuentoPremio)}` : "",
    o.envioGratisPremio ? `Envío gratis (premio ruleta ${o.premio.codigo})` : "",
    o.mysteryBox ? `Mystery Box de regalo (premio ruleta ${o.premio.codigo})` : "",
    `Total: ${money(o.total)}`,
    `Entrega: ${textoEntrega(o.comprador)}`,
    o.comprador.notas ? `Notas: ${o.comprador.notas}` : "",
  ].filter(Boolean).join("\n");
}
