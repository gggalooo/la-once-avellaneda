// Le dice a la página si los pagos online están activos y le pasa la clave PÚBLICA de Mercado Pago.
import { env, json } from "./_lib/tienda.mjs";

export const config = { path: "/api/config" };

export default async () => {
  const publicKey = env("MP_PUBLIC_KEY");
  return json({ pagos: !!(publicKey && env("MP_ACCESS_TOKEN")), publicKey, ruleta: !!(env("PRIZE_SECRET") || env("MP_ACCESS_TOKEN")) });
};
