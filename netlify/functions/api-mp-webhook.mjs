// Aviso de Mercado Pago: cada vez que cambia un pago, consultamos el pago real en Mercado Pago
// (no confiamos en lo que llega en el aviso) y, si está aprobado, confirmamos el pedido y descontamos stock.
import { json } from "./_lib/tienda.mjs";
import { confirmarPorId } from "./_lib/cobro.mjs";

export const config = { path: "/api/mp-webhook", method: ["POST", "GET"] };

export default async (req) => {
  const url = new URL(req.url);
  let b = {};
  if (req.method === "POST") { try { b = await req.json(); } catch (e) { b = {}; } }
  const tipo = b.type || b.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const id = (b.data && b.data.id) || url.searchParams.get("data.id") || (tipo === "payment" ? url.searchParams.get("id") : null);
  if (tipo !== "payment" || !id || !/^\d+$/.test(String(id))) return json({ ok: true, ignorado: true });
  try {
    const o = await confirmarPorId(id);
    return json({ ok: true, pedido: o ? o.codigo : null, estado: o ? o.estado : null });
  } catch (e) {
    console.error("webhook", e);
    return json({ ok: false }, 500);
  }
};
