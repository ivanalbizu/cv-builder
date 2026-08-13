# Fuentes incrustadas

Todas las familias de esta carpeta son **SIL Open Font License 1.1** (OFL),
que permite usarlas, modificarlas y **redistribuirlas junto a la aplicación**.
El texto completo de la licencia está en [`OFL.txt`](./OFL.txt).

Se descargan con `node scripts/descargar-fuentes.mjs`, que documenta la
procedencia exacta y regenera `src/assets/fuentes.css`. No editar a mano.

| Familia | Papel | Origen |
|---|---|---|
| Inter | Sans | https://fonts.google.com/specimen/Inter |
| Source Sans 3 | Sans | https://fonts.google.com/specimen/Source+Sans+3 |
| Manrope | Sans | https://fonts.google.com/specimen/Manrope |
| Lora | Serif | https://fonts.google.com/specimen/Lora |
| Playfair Display | Serif | https://fonts.google.com/specimen/Playfair+Display |
| EB Garamond | Serif | https://fonts.google.com/specimen/EB+Garamond |

## Por qué se alojan aquí y no se enlaza al CDN de Google

1. **El e2e de paginación dejaría de ser fiable.** La garantía de que el CV
   cabe en una página se mide sobre el PDF real; con las fuentes viniendo de
   fuera, el CI dependería de la red y una actualización de Google podría
   cambiar la maqueta sin que nadie tocara el repo.
2. **Privacidad.** Pedir la fuente al CDN envía la IP del visitante a Google
   en cada carga. En la UE eso ha dado sentencias.
3. **`pnpm pdf` funciona sin red.**

## Peso

Se piden como fuentes **variables** (`wght@400..700`): un archivo por familia
y subconjunto cubre todos los pesos, y pesa menos que los estáticos sueltos.
Los subconjuntos van separados con `unicode-range`, así que el navegador solo
descarga `latin-ext` si el CV lleva caracteres que lo necesiten.

**Nunca añadir aquí una fuente privativa.** Si hace falta parecerse a una
(p. ej. Graphik), se busca la alternativa libre más próxima.
