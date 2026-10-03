# La ONCE Avellaneda

Prototipo de la tienda: stock local, camisetas por encargo y ruleta de demostración. Repositorio público de trabajo: **gggalooo/la-once-avellaneda**.

## Ver la página

Abrí `index.html` con doble clic. No hace falta instalar paquetes ni levantar un servidor. Las imágenes están incorporadas al HTML generado; las fuentes tienen alternativas locales.

## Editar entre los tres

| Archivo | Qué editar |
| --- | --- |
| `src/styles.css` | Colores, tipografía, distribución y animaciones |
| `src/app.js` | Tienda, filtros, carrito, navegación y panel |
| `src/ruleta.js` | Premios, probabilidades, espera, confeti y sonido |
| `src/catalogo.json` | Productos, precios, talles, contactos y banners |
| `assets/` | Imágenes; el catálogo las referencia por su ruta |
| `src/index.template.html` | Estructura HTML y metadatos |

Después de editar, con Node.js 20 o superior:

```sh
npm run build
npm run check
```

`build` arma un `index.html` independiente. No requiere `npm install`: solo usa funciones incluidas en Node. **No editen directamente el HTML generado**, porque se reemplaza al volver a compilar. El panel sigue descargando copias HTML para probar, pero sus cambios no actualizan los archivos `src`: para compartirlos en Git, editá también el catálogo fuente.

Trabajen cada uno en una rama, suban sus cambios y abran un pull request para que otro compañero los revise antes de unirlos a `main`. Si cambiaron archivos fuente, incluyan el `index.html` regenerado. No hace falta que los tres editen el mismo archivo a la vez.

## Colaborar desde GitHub

El repositorio está en [gggalooo/la-once-avellaneda](https://github.com/gggalooo/la-once-avellaneda) y cualquiera puede verlo. Para que los otros dos socios editen directamente, el propietario puede ir a **Settings → Collaborators → Add people** e invitarlos por sus usuarios de GitHub. También pueden hacer una copia (fork) y proponer cambios con un pull request.

Cada socio debería trabajar en su propia rama y proponer los cambios con un pull request. Antes de subir cambios del código o catálogo, ejecuten `npm run build` y `npm run check` e incluyan el `index.html` generado. No compartan contraseñas ni tokens; cada uno usa su propia cuenta.

Referencias: [invitar colaboradores](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository) y [trabajar con ramas](https://docs.github.com/en/get-started/using-github/github-flow).

## Ruleta actual

| Premio | Probabilidad |
| --- | ---: |
| $3.000 OFF (se suma a la transferencia) | 59% |
| $6.000 OFF (se suma a la transferencia) | 25% |
| 15% | 10% |
| 25% | 3,5% |
| Envío gratis | 1,5% |
| Mystery Box (camiseta sorpresa de regalo) | 1% |

Un giro cada 72 horas en ese navegador. El código de prueba dura también 72 horas. Es una propuesta inicial para probar frecuencia de regreso; no es un resultado medido de ventas. El sorteo utiliza aleatoriedad criptográfica del navegador y probabilidades positivas para todos los premios. El 1% no garantiza un premio cada 100 giros.

La rueda desacelera, hace clics, muestra confeti y reproduce un festejo breve al ganar. Hay un control de sonido que se conserva en el navegador. Con movimiento reducido se omiten el giro largo y el confeti. No hay audio automático al cargar.

## Lo que falta antes de vender con esta página

- Cargar WhatsApp, Instagram, precios y stock reales; acordar pagos, envío y condiciones de compra.
- Elegir modelos de los proveedores y confirmar su disponibilidad. La selección inicial es manual, no una sincronización.
- Para cuentas, pedidos y premios reales: un servidor con acceso de socios, inventario compartido y validación del sorteo/canje. Borrar los datos locales permite repetir la demo; estos códigos no reducen el total ni son canjeables.
- Para evaluar el juego: medir entradas a la ruleta, consultas posteriores y ventas. Revisar su costo antes de activar premios reales.

El dominio propio puede esperar. GitHub Pages dispone de direcciones `github.io` para publicar una vista del prototipo; sus condiciones dependen del plan y de la visibilidad del repositorio. Guardar el código en GitHub no publica automáticamente la página. Más adelante pueden conectar un dominio propio. [Documentación de GitHub Pages](https://docs.github.com/en/pages/quickstart).

Las imágenes proceden del prototipo y de fichas de proveedores; no se agregó una licencia abierta sobre esos materiales.

## Planilla de Google (stock, fotos y pedidos)

La página puede leer el catálogo desde una planilla de Google y anotar ahí los pedidos y los avisos de stock.

1. Importar `planilla/La-ONCE-planilla.xlsx` a Google Drive y guardarla como Hoja de cálculo de Google.
2. Compartir → "Cualquier persona con el enlace" → Lector.
3. Extensiones → Apps Script: pegar `planilla/codigo-apps-script.txt` e implementarlo como Aplicación web (Ejecutar como: Yo · Acceso: Cualquier persona).
4. Cargar en `src/catalogo.json` → `config.planilla` el link de la planilla y en `config.planillaApp` la URL que termina en `/exec`. Después `npm run build`.

Pestaña **Productos**: en stock, los talles S–XXL son cantidades; en pedido, 1 = se puede encargar y 0 = no. `activo = NO` oculta la camiseta. Los cambios aparecen al recargar la página (Google puede demorar 1 o 2 minutos).

## Publicar en Netlify

- **Conectando el repositorio de GitHub (recomendado):** en Netlify, "Add new site" → "Import an existing project" → GitHub → este repositorio. Netlify lee `netlify.toml`: arma la página con `node scripts/netlify.cjs` y publica la carpeta `dist`. Cada cambio que se sube a GitHub se publica solo.
- **Arrastrando la carpeta:** ejecutar `npm run netlify` y arrastrar la carpeta `dist` a app.netlify.com/drop. Así **no** funcionan los pagos ni la ruleta validada: para eso hace falta conectar GitHub.

El script usa la dirección del sitio que da Netlify para los links de Google y de redes. Si usan un dominio propio, se puede fijar con la variable `SITE_URL` en la configuración del sitio en Netlify.

## Pagos con Mercado Pago

Con el sitio en Netlify conectado a GitHub, el checkout cobra online. Paso a paso en `COMO-ACTIVAR-LOS-PAGOS.txt`.

- **Mercado Pago (10% off):** el servidor crea el pago con el total ya calculado y el cliente sigue a la app o web de Mercado Pago para pagar con su dinero en cuenta.
- **Tarjeta (débito, crédito o prepaga):** formulario seguro de Mercado Pago (Card Payment Brick) dentro de la página. Los datos de la tarjeta no pasan por nuestro servidor.
- **Efectivo:** solo con retiro; sigue el circuito anterior (WhatsApp / planilla).

Cómo funciona: `netlify/functions` recalcula precios, stock, descuentos y premios con el catálogo real (nunca confía en el navegador), guarda el pedido en Netlify Blobs y recién cuando Mercado Pago confirma el pago (aviso a `/api/mp-webhook` o consulta al volver) marca el pedido como **Pagado** y descuenta el stock en la planilla. Si no hay planilla, lleva el stock vendido internamente. Confirmar dos veces no descuenta dos veces.

La ruleta, en el sitio publicado, la sortea el servidor y entrega el premio firmado; un premio vale para un pedido y para un teléfono cada 3 días.

Variables en Netlify: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `PRIZE_SECRET`, `SHEET_SECRET` y, opcional, `SHEET_APP_URL` y `SITE_URL`.

`npm run build` también genera `netlify/functions/_lib/catalogo.mjs` (el catálogo sin fotos que usa el servidor).
