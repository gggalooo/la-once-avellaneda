// Cobra con tarjeta usando el token que genera el formulario seguro de Mercado Pago.
// El monto sale del pedido guardado, nunca del navegador.
import { json } from "./_lib/tienda.mjs";
import { leerPedido, pagarConTarjeta, buscarPagos } from "./_lib/servicios.mjs";
import { aplicarPago } from "./_lib/cobro.mjs";

export const config = { path: "/api/pagar-tarjeta", method: ["POST"] };

const MOTIVOS = {
  cc_rejected_insufficient_amount: "La tarjeta no tiene fondos suficientes.",
  cc_rejected_bad_filled_security_code: "Revisá el código de seguridad.",
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento.",
  cc_rejected_bad_filled_card_number: "Revisá el número de la tarjeta.",
  cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
  cc_rejected_call_for_authorize: "Tenés que autorizar el pago con tu banco.",
  cc_rejected_card_disabled: "La tarjeta no está habilitada. Llamá a tu banco para activarla.",
  cc_rejected_duplicated_payment: "Ya hiciste un pago por ese monto. Si necesitás pagar de nuevo, usá otra tarjeta.",
  cc_rejected_high_risk: "El pago fue rechazado. Probá con otra tarjeta o con Mercado Pago.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos. Probá con otra tarjeta.",
  cc_rejected_blacklist: "No pudimos procesar el pago. Probá con otra tarjeta.",
};

export default async (req) => {
  let b;
  try { b = await req.json(); } catch (e) { return json({ error: "Datos inválidos." }, 400); }
  const o = await leerPedido(b && b.codigo);
  if (!o || o.metodo !== "tarjeta") return json({ error: "No encontramos el pedido." }, 404);
  if (o.estado === "pagado") return json({ estado: "pagado", codigo: o.codigo, total: o.total });
  if (o.estado === "revisar") return json({ estado: "revisar", codigo: o.codigo, total: o.total });
  const card = b.card || {};
  if (!card.token || !card.payment_method_id) return json({ error: "Faltan datos de la tarjeta." }, 400);
  if (card.transaction_amount != null && Math.abs(Number(card.transaction_amount) - o.total) > 1) return json({ error: "El total del pedido cambió. Volvé a cargar el checkout." }, 409);
  // Antes de cobrar: si ya hay un pago aprobado o en proceso para este pedido, no se cobra otra vez.
  let previos = [];
  try { previos = await buscarPagos(o.codigo); } catch (e) { return json({ estado: "error", error: "No pudimos procesar el pago. Probá de nuevo en un momento." }, 502); }
  const vivo = previos.find((p) => p.status === "approved") || previos.find((p) => ["in_process", "pending", "authorized"].includes(p.status));
  if (vivo) {
    const r = (await aplicarPago(vivo)) || o;
    return json({ estado: vivo.status === "approved" ? (r.estado === "revisar" ? "revisar" : "pagado") : "pendiente", codigo: o.codigo, total: o.total });
  }
  let pago;
  try { pago = await pagarConTarjeta(o, card); }
  catch (e) { console.error("tarjeta", e); return json({ estado: "error", error: "No pudimos procesar el pago. Probá de nuevo." }, 502); }
  let r = o;
  try { r = (await aplicarPago(pago)) || o; } catch (e) { console.error("confirmar tarjeta", e); }
  const estado = pago.status === "approved" ? (r.estado === "revisar" ? "revisar" : "pagado") : ["in_process", "pending", "authorized"].includes(pago.status) ? "pendiente" : "rechazado";
  return json({ estado, codigo: o.codigo, total: o.total, motivo: estado === "rechazado" ? MOTIVOS[pago.status_detail] || "El pago fue rechazado. Probá con otra tarjeta o con Mercado Pago." : "" });
};
