// Confirmación de pagos: se usa desde el aviso de Mercado Pago, desde el pago con tarjeta
// y cuando el cliente vuelve a la página. Es idempotente: confirmar dos veces no descuenta dos veces.
import { leerPedido, guardarPedido, marcarPremioUsado, planillaPago, planillaEstado, verPago, buscarPagos, sumarVendidos, reclamarConfirmacion } from "./servicios.mjs";
import { telefonoClave } from "./tienda.mjs";

// Descuenta el stock (planilla o, si no hay planilla, el registro interno). Si la planilla no respondió,
// queda marcado para reintentar con el próximo aviso de Mercado Pago o la próxima consulta.
async function descontarStock(o) {
  const r = await planillaPago(o);
  if (r && r.sinPlanilla) {
    if (!o.vendidoRegistrado) { await sumarVendidos(o.lineas); o.vendidoRegistrado = true; }
    o.stockPendiente = false;
  } else if (r && r.ok === true) {
    o.stockPendiente = false;
    if (r.sinStock) o.nota = [o.nota, "Stock insuficiente en: " + r.sinStock.join(", ")].filter(Boolean).join(" · ");
  } else o.stockPendiente = true;
  await guardarPedido(o);
}

export async function aplicarPago(pago) {
  if (!pago || !pago.external_reference) return null;
  let o = await leerPedido(pago.external_reference);
  if (!o) return null;
  if (o.estado === "pagado") {
    if (o.stockPendiente) await descontarStock(o);
    return o;
  }
  if (pago.status === "approved") {
    const monto = Number(pago.transaction_amount);
    if (pago.currency_id && pago.currency_id !== "ARS") { o.estado = "revisar"; o.nota = "Moneda distinta"; }
    else if (!(Math.abs(monto - o.total) <= 1)) { o.estado = "revisar"; o.nota = `Monto pagado ${monto} distinto del total ${o.total}`; }
    else o.estado = "pagado";
    o.pago = { id: pago.id, status: pago.status, detalle: pago.status_detail, monto, metodo: pago.payment_method_id, tipo: pago.payment_type_id, fecha: pago.date_approved || new Date().toISOString() };
    if (o.estado !== "pagado") {
      await guardarPedido(o); await planillaEstado(o, "Revisar: " + o.nota);
      return o;
    }
    // Solo un proceso confirma: si otro ya lo hizo, devolvemos lo guardado.
    if (!(await reclamarConfirmacion(o.codigo))) return (await leerPedido(o.codigo)) || o;
    const notas = [];
    if (o.metodo === "mercadopago" && pago.payment_type_id && pago.payment_type_id !== "account_money") notas.push(`REVISAR: pagó con ${pago.payment_type_id}, no con dinero en cuenta (tenía ${o.descuentoTransferencia ? "el 10% off" : "descuento"})`);
    if (o.premio && o.premio.codigo) {
      const ok = await marcarPremioUsado(o.premio.codigo, o.codigo, telefonoClave(o.comprador.telefono));
      if (!ok) notas.push(`REVISAR: el premio de la ruleta ${o.premio.codigo} ya se había usado en otro pedido`);
    }
    if (notas.length) o.nota = notas.join(" · ");
    await guardarPedido(o);
    await descontarStock(o);
    return o;
  }
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(pago.status)) {
    o.estado = "rechazado"; o.pago = { id: pago.id, status: pago.status, detalle: pago.status_detail };
    o.intentos = (o.intentos || 0) + 1;
    await guardarPedido(o); await planillaEstado(o, "Pago rechazado");
    return o;
  }
  if (o.estado === "esperando_pago" || o.estado === "rechazado") { o.estado = "pendiente"; o.pago = { id: pago.id, status: pago.status, detalle: pago.status_detail }; await guardarPedido(o); await planillaEstado(o, "Pago pendiente"); }
  return o;
}

export async function confirmarPorId(id) {
  return aplicarPago(await verPago(id));
}

// Si el aviso de Mercado Pago todavía no llegó, se busca el pago por número de pedido.
export async function actualizarDesdeMercadoPago(o) {
  if (!o) return o;
  if (o.estado === "pagado") return o.stockPendiente ? (await aplicarPago({ external_reference: o.codigo, status: "approved" })) || o : o;
  if (o.estado === "revisar") return o;
  const pagos = await buscarPagos(o.codigo);
  const aprobado = pagos.find((p) => p.status === "approved");
  const ultimo = aprobado || pagos[0];
  if (!ultimo || (o.pago && String(o.pago.id) === String(ultimo.id) && o.pago.status === ultimo.status)) return o;
  return (await aplicarPago(ultimo)) || o;
}
