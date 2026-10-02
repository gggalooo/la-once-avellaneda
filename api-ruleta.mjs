// Gira la ruleta en el servidor y devuelve el premio firmado (no se puede inventar desde el navegador).
// Para que no se pueda girar mil veces hasta sacar el mejor premio: hasta 3 giros por conexión cada 3 días;
// después devuelve el último premio sorteado. Además, al pagar se permite un premio por teléfono cada 3 días.
import crypto from "node:crypto";
import { json, sortearPremio, firmarPremio, env, DURACION_PREMIO } from "./_lib/tienda.mjs";
import { girosDeIp, guardarGiro } from "./_lib/servicios.mjs";

export const config = { path: "/api/ruleta", method: ["POST"] };
const MAX_GIROS = 3;

export default async (req, context) => {
  try {
    const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "";
    const clave = ip ? crypto.createHmac("sha256", env("PRIZE_SECRET") || env("MP_ACCESS_TOKEN") || "x").update(ip).digest("hex").slice(0, 32) : "";
    let reg = { giros: [] };
    if (clave) {
      reg = await girosDeIp(clave);
      reg.giros = (reg.giros || []).filter((g) => Date.now() - g.t < DURACION_PREMIO);
      if (reg.giros.length >= MAX_GIROS) {
        const d = reg.giros[reg.giros.length - 1];
        return json({ premio: d.p, bolsillo: d.k, at: d.t, codigo: d.c, token: firmarPremio(d), repetido: true });
      }
    }
    const d = sortearPremio();
    if (clave) { reg.giros.push(d); await guardarGiro(clave, reg); }
    return json({ premio: d.p, bolsillo: d.k, at: d.t, codigo: d.c, token: firmarPremio(d) });
  } catch (e) {
    console.error("ruleta", e);
    return json({ error: "No pudimos girar la ruleta. Probá de nuevo." }, 500);
  }
};
