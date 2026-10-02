// Estado del pedido para la pantalla de "volviste de Mercado Pago".
import { json } from "./_lib/tienda.mjs";
import { leerPedido } from "./_lib/servicios.mjs";
import { actualizarDesdeMercadoPago } from "./_lib/cobro.mjs";

export const config = { path: "/api/pedido-estado", method: ["GET"] };

export default async (req) => {
  const codigo = new URL(req.url).searchParams.get("codigo");
  let o = await leerPedido(codigo);
  if (!o) return json({ error: "No encontramos el pedido." }, 404);
  if (o.estado !== "pagado" || o.stockPendiente) { try { o = await actualizarDesdeMercadoPago(o); } catch (e) { console.error("estado", e); } }
  return json({ codigo: o.codigo, estado: o.estado, total: o.total, metodo: o.metodo });
};
