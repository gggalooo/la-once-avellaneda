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
| Camiseta gratis | 1% |

Un giro cada 72 horas en ese navegador. El código de prueba dura también 72 horas. Es una propuesta inicial para probar frecuencia de regreso; no es un resultado medido de ventas. El sorteo utiliza aleatoriedad criptográfica del navegador y probabilidades positivas para todos los premios. El 1% no garantiza un premio cada 100 giros.

La rueda desacelera, hace clics, muestra confeti y reproduce un festejo breve al ganar. Hay un control de sonido que se conserva en el navegador. Con movimiento reducido se omiten el giro largo y el confeti. No hay audio automático al cargar.

## Lo que falta antes de vender con esta página

- Cargar WhatsApp, Instagram, precios y stock reales; acordar pagos, envío y condiciones de compra.
- Elegir modelos de los proveedores y confirmar su disponibilidad. La selección inicial es manual, no una sincronización.
- Para cuentas, pedidos y premios reales: un servidor con acceso de socios, inventario compartido y validación del sorteo/canje. Borrar los datos locales permite repetir la demo; estos códigos no reducen el total ni son canjeables.
- Para evaluar el juego: medir entradas a la ruleta, consultas posteriores y ventas. Revisar su costo antes de activar premios reales.

El dominio propio puede esperar. GitHub Pages dispone de direcciones `github.io` para publicar una vista del prototipo; sus condiciones dependen del plan y de la visibilidad del repositorio. Guardar el código en GitHub no publica automáticamente la página. Más adelante pueden conectar un dominio propio. [Documentación de GitHub Pages](https://docs.github.com/en/pages/quickstart).

Las imágenes proceden del prototipo y de fichas de proveedores; no se agregó una licencia abierta sobre esos materiales.
