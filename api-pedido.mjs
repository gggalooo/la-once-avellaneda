// Crea el pedido: valida stock y precios con el catálogo real, aplica descuentos y premio,
// lo guarda y, si es Mercado Pago, devuelve el link de pago con el monto ya cargado.
import { json, cargarCatalogo, calcularPedido, datosComprador, leerPremio, nuevoCodigo, telefonoClave, ErrorPedido, DURACION_PREMIO } from "./_lib/tienda.mjs";
import { guardarPedido, premioUsado, premioRecientePorTelefono, crearPreferencia, planillaNuevoPedido, aplicarVendidos } from "./_lib/servicios.mjs";

export const config = { path: "/api/pedido", method: ["POST"] };

export default async (req) => {
  let b;
  try { b = await req.json(); } catch (e) { return json({ error: "Pedido inválido." }, 400); }
  try {
    const metodo = b.metodo === "tarjeta" ? "tarjeta" : b.metodo === "mercadopago" ? "mercadopago" : null;
    if (!metodo) throw new ErrorPedido("Elegí un medio de pago.");
    const comprador = datosComprador(b.comprador);
    let premio = b.premioToken ? leerPremio(b.premioToken) : null;
    let avisoPremio = "";
    if (b.premioToken && !premio) avisoPremio = "El premio de la ruleta venció o no es válido.";
    if (premio && (await premioUsado(premio.c))) { premio = null; avisoPremio = "Ese premio de la ruleta ya se usó en otro pedido."; }
    if (premio && (await premioRecientePorTelefono(telefonoClave(comprador.telefono), DURACION_PREMIO))) { premio = null; avisoPremio = "Ya usaste un premio de la ruleta en los últimos 3 días."; }
    const cat = await aplicarVendidos(await cargarCatalogo());
    const calc = calcularPedido(cat, b.items, metodo, premio, comprador.entrega);
    const o = { codigo: nuevoCodigo(), creado: Date.now(), estado: "esperando_pago", metodo, comprador, ...calc };
    if (o.total < 1) throw new ErrorPedido("El total del pedido no es válido.");
    await guardarPedido(o);
    let pagoUrl = null;
    if (metodo === "mercadopago") pagoUrl = await crearPreferencia(o);
    await planillaNuevoPedido(o).catch(() => {});
    return json({ codigo: o.codigo, total: o.total, subtotal: o.subtotal, descuentoTransferencia: o.descuentoTransferencia, descuentoPremio: o.descuentoPremio, premio: o.premio, avisoPremio, pagoUrl });
  } catch (e) {
    if (e instanceof ErrorPedido) return json({ error: e.message }, e.status);
    console.error("pedido", e);
    return json({ error: "No pudimos iniciar el pago. Probá de nuevo en un momento." }, 502);
  }
};
