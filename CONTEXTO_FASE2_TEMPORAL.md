# Contexto completo para diseñar la Fase 2: dashboard de Netflix

> Documento temporal y autónomo. El agente que lo reciba no tiene acceso al repositorio ni a otros archivos del proyecto, así que todo el contexto necesario está incluido aquí. No forma parte de la documentación oficial y puede eliminarse cuando la Fase 2 esté resuelta.

## 0. Qué se espera de este documento

Este archivo sirve para que otro agente pueda tomar decisiones de diseño de la Fase 2 sin consultar el repositorio. Contiene:

- El encargo académico y la pila tecnológica obligatoria.
- Las decisiones ya cerradas en la Fase 1.
- El perfil real del dataset, con cifras verificadas.
- Los requisitos exactos de la Fase 2.
- Las decisiones que quedan abiertas y el material disponible para tomarlas.
- Las restricciones, los criterios de evaluación y las preguntas que dependen del profesor.

El agente debe producir una propuesta de Fase 2, no volver a hacer la Fase 1 ni inventar datos.

## 1. El encargo académico

El proyecto pertenece a la asignatura **Visualización de Datos**. Consiste en desarrollar un **dashboard dinámico con React**, siguiendo una metodología de desarrollo por fases.

La Fase 1 fue el análisis detallado de requisitos. La Fase 2 es el diseño del dashboard antes de programarlo. Las fases posteriores no están especificadas en el encargo; no hay que inventarlas.

Requisitos técnicos obligatorios:

- Dashboard desarrollado con **React**.
- Repositorio **público** en GitHub.
- Publicación visible en la web mediante **GitHub Pages** (decisión confirmada).
- Base de datos **PostgreSQL** (decisión confirmada).
- Arquitectura: PostgreSQL en el procesamiento, exportación a JSON estático y filtros en el navegador. Sin backend ni conexión viva a la base.
- Indicadores y gráficos definidos en el documento de requerimientos.

El entregable de la Fase 1 fue un documento de justificación en Word. Ya está terminado.

## 2. Proyecto elegido

**Proyecto 3: “La economía del entretenimiento: Netflix y tendencias globales”.**

- **Tema:** negocios y cultura digital.
- **Dataset:** Netflix Movies and TV Shows, de Kaggle.
- **Archivo:** `netflix_titles.csv`.
- **Tamaño:** 8,807 registros y 12 columnas.
- **Contenido:** catálogo de películas y series de Netflix, con título, director, reparto, país, fecha de ingreso al catálogo, año de estreno, clasificación, duración, géneros y descripción.

**Objetivo del dashboard:** visualizar las tendencias de producción, géneros y distribución geográfica del catálogo para identificar cómo cambian la oferta y los gustos de contenido por región y por año.

**Problema que resuelve:** el catálogo está en un archivo plano, con varios países y géneros en una misma celda, fechas como texto y datos faltantes. Eso dificulta responder preguntas simples como cuántos títulos aporta cada país o cómo evolucionó la producción. El dashboard convierte esos datos en indicadores comparables y filtrables.

**Conclusión esperada:** observar tendencias globales del entretenimiento digital y cómo los gustos varían por región y por año.

## 3. Fase 1: decisiones ya cerradas

### 3.1 Audiencia

El catálogo es información pública sobre un producto de consumo. El dashboard sirve para interpretar el mercado del streaming, no para operar Netflix desde dentro.

Perfiles identificados:

- **Analistas y estrategas de la industria del entretenimiento** (audiencia principal).
  - Decisiones: dónde se concentra la producción, qué géneros dominan, qué mercados crecen y cómo evoluciona el catálogo.
  - Nivel de detalle: alto, con totales, tendencias y filtros por país, tipo y año.
- **Responsables de contenido, adquisiciones o producción independiente.**
  - Decisiones: qué géneros o regiones están poco representados, a qué mercados dirigir una coproducción o licencia.
  - Nivel de detalle: medio, con rankings de países, géneros y directores, y comparativos entre regiones.
- **Público académico y general interesado en cultura digital.**
  - Decisiones: comprender cómo varían la oferta y los gustos por región y época.
  - Nivel de detalle: bajo a medio, con visualizaciones claras y sin conocimientos técnicos.

Las decisiones son de orientación y planeación, no de operación diaria. Ninguna requiere datos en tiempo real.

Esquema de diseño: **“resumen primero, detalle bajo demanda”**. Vista inicial con KPIs y gráficos agregados, y filtros para bajar al detalle. La agregación mínima útil es año y país.

### 3.2 Tipo de dashboard

**Estratégico.**

Justificación:

- Horizonte de largo plazo: décadas de estrenos y años de ingreso al catálogo.
- Datos de captura fija, sin flujo en tiempo real: descarta el enfoque operativo.
- No hay metas ni un proceso que evaluar a medio plazo: descarta el enfoque táctico.
- La audiencia orienta estrategia, no gestiona tareas diarias.

Implicaciones de diseño:

- Pocos KPIs destacados.
- Gráficos de comparación y tendencia.
- Filtros globales, por ejemplo tipo de contenido, rango de años, región y género.
- Énfasis en tendencias y rankings, no en tablas de detalle.

### 3.3 KPIs y visualizaciones mínimas

Estos cinco indicadores son el mínimo y no deben sustituirse ni reducirse sin consultar:

- **Número de títulos por país** → mapa de calor por país. Variable: `country`.
- **Evolución de lanzamientos por año** → gráfico temporal. Variables: `release_year`, `date_added`.
- **Top 5 géneros** → barras y nube de palabras. Variable: `listed_in`.
- **Top 5 directores más productivos** → barras horizontales. Variable: `director`.
- **Películas vs. series** → gráfico circular. Variable: `type`.

Variables relevantes:

- `type`: Movie o TV Show. Se usa en el gráfico circular y como filtro.
- `country`: país o países de producción, separados por coma. Se usa en el mapa de calor.
- `release_year`: año de estreno original, numérico. Se usa en el gráfico temporal.
- `date_added`: fecha de ingreso a Netflix, originalmente texto con formato “September 25, 2021”. Se usa en el gráfico temporal.
- `listed_in`: uno o varios géneros separados por coma. Se usa en el top de géneros y en la nube de palabras.
- `director`: uno o varios directores separados por coma. Se usa en el top de directores.
- `duration` y `rating`: duración (“90 min” o “2 Seasons”) y clasificación por edad. Se usan como filtros.

`show_id`, `title`, `cast` y `description` son identificadores o información de apoyo; no intervienen en los KPIs.

### 3.4 Plan de preprocesamiento

La Fase 1 definió el plan, no lo ejecutó. La limpieza real corresponde a una fase posterior.

Problemas detectados y acciones planeadas:

- Celdas vacías en `director`, `country` y `cast`, más frecuentes en `director`: etiquetar como “Desconocido”, no eliminar filas. Así no se pierden títulos que cuentan en otros indicadores.
- Varios países, géneros o directores en una celda: separar por coma y guardar en tablas relacionadas. Así se cuenta cada valor sin duplicar títulos.
- `date_added` como texto y con posibles espacios sobrantes: limpiar y convertir a fecha para obtener año y mes de ingreso.
- `duration` mezcla minutos y temporadas: separar valor numérico y unidad para comparar según el tipo de contenido.
- Posibles errores de captura, con datos en la columna equivocada: revisar y corregir manualmente los casos evidentes, sin suponer datos.

Columnas derivadas previstas:

- Año y mes de ingreso.
- Década de estreno.
- País principal.
- Número de países por título.
- Duración numérica.
- Región geográfica, para comparar regiones.

Valores atípicos:

- Revisar duración de películas, número de temporadas y años de estreno muy antiguos.
- Eliminar o ajustar solo si es un error comprobable.
- Si es un dato real pero extremo, conservarlo y marcarlo para poder filtrarlo.

Integración de datos:

- Base de datos relacional: PostgreSQL (decisión confirmada), adecuada para relacionar títulos, países, géneros y directores.
- Despliegue: GitHub Pages (decisión confirmada). El sitio será estático: React carga JSON exportados desde PostgreSQL y aplica los filtros en el navegador. No hay backend ni conexión viva a la base.
- Proceso previsto: leer el CSV, aplicar limpieza y columnas derivadas, separar los campos multivalor en tablas relacionadas (`titles`, `countries`, `genres`, `directors` y tablas puente), cargar los datos y verificar que el total de títulos coincida con el archivo original. Después, exportar los datos necesarios a JSON.

### 3.5 Pendientes que no pertenecen a la Fase 2

- Implementar el ETL, el esquema relacional en PostgreSQL y la exportación a JSON.
- Ejecutar el preprocesamiento definitivo y la carga en PostgreSQL.
- Inicializar la aplicación React y comprobar los filtros en el navegador.
- Preparar el despliegue en GitHub Pages.

## 4. Perfil real del dataset

Estas cifras se calcularon directamente sobre el CSV. Son la base para elegir KPIs y justificarlos.

### 4.1 Estructura

- 8,807 títulos y 12 columnas.
- 6,131 películas (69.6 %) y 2,676 series (30.4 %).
- No hay `show_id`, títulos ni filas completas duplicadas.
- Columnas: `show_id`, `type`, `title`, `director`, `cast`, `country`, `date_added`, `release_year`, `rating`, `duration`, `listed_in`, `description`.

### 4.2 Valores faltantes

- `director`: 2,634 nulos (29.9 %).
- `country`: 831 nulos (9.4 %).
- `cast`: 825 nulos (9.4 %).
- `date_added`: 10 nulos (0.1 %).
- `rating`: 4 nulos.
- `duration`: 3 nulos.
- `show_id`, `type`, `title`, `release_year`, `listed_in` y `description`: sin nulos.

### 4.3 Fechas

- `release_year` va de 1925 a 2021.
- Año de estreno con más títulos: 2018, con 1,147.
- La década de 2010 concentra 5,927 títulos (67.3 %).
- Títulos anteriores a 1950: 16.
- `date_added` va de 2008-01-01 a 2021-09-25.
- Altas por año: 2008 (2), 2009 (2), 2010 (1), 2011 (13), 2012 (3), 2013 (11), 2014 (24), 2015 (82), 2016 (429), 2017 (1,188), 2018 (1,649), 2019 (2,016), 2020 (1,879), 2021 (1,498, año incompleto).
- 88 cadenas de `date_added` tienen espacios sobrantes. Después de quitarlos, las 10 restantes son nulos reales.
- Los 10 títulos sin `date_added` son series.

### 4.4 Países

- 7,976 títulos tienen país; 831 no lo tienen.
- 123 países únicos después de separar los valores.
- 1,320 títulos tienen más de un país. El máximo es 12.
- Top 10 por número de títulos:
  - Estados Unidos: 3,690.
  - India: 1,046.
  - Reino Unido: 806.
  - Canadá: 445.
  - Francia: 393.
  - Japón: 318.
  - España: 232.
  - Corea del Sur: 231.
  - Alemania: 226.
  - México: 169.

Estados Unidos representa 46.3 % de los títulos que tienen país, no 46.3 % del total del catálogo.

### 4.5 Géneros

- 42 géneros únicos.
- 6,787 títulos tienen más de un género. El máximo es 3.
- Top 10 por número de títulos:
  - International Movies: 2,752.
  - Dramas: 2,427.
  - Comedies: 1,674.
  - International TV Shows: 1,351.
  - Documentaries: 869.
  - Action & Adventure: 859.
  - TV Dramas: 763.
  - Independent Movies: 756.
  - Children & Family Movies: 641.
  - Romantic Movies: 616.

Un título puede aparecer en varios géneros, así que los porcentajes por género no suman 100 %.

### 4.6 Directores y reparto

- 4,993 directores únicos después de separar los valores.
- 614 títulos tienen más de un director.
- Top 10 directores:
  - Rajiv Chilaka: 22.
  - Jan Suter: 21.
  - Raúl Campos: 19.
  - Suhas Kadav: 16.
  - Marcus Raboy: 16.
  - Jay Karas: 15.
  - Cathy Garcia-Molina: 13.
  - Youssef Chahine: 12.
  - Martin Scorsese: 12.
  - Jay Chapman: 12.
- 36,439 personas únicas en el reparto.
- Top 5 del reparto:
  - Anupam Kher: 43.
  - Shah Rukh Khan: 35.
  - Julie Tejwani: 33.
  - Naseeruddin Shah: 32.
  - Takahiro Sakurai: 32.

El top de directores solo puede calcularse sobre los títulos que tienen director: 6,173.

### 4.7 Duración

Películas:

- 6,128 películas tienen duración válida.
- Mediana: 98 minutos.
- Media: 99.6 minutos.
- Mínimo: 3 minutos (`Silent`).
- Máximo: 312 minutos (`Black Mirror: Bandersnatch`).
- Percentiles: 25 % en 87 minutos, 75 % en 114 minutos.

Series:

- 2,676 series tienen temporadas.
- Mediana: 1 temporada.
- Media: 1.8 temporadas.
- Máximo: 17 temporadas (`Grey's Anatomy`).
- Percentiles: 25 % en 1 temporada, 75 % en 2 temporadas.

### 4.8 Errores de captura

- Tres filas traen los minutos en `rating` y dejan `duration` vacío: `s5542`, `s5795` y `s5814` (especiales de Louis C.K.).
- Son exactamente las tres filas con `duration` nulo.
- Otras cuatro filas no tienen `rating`.
- Nada de esto se ha corregido en el CSV.

### 4.9 Bases de cálculo que hay que declarar

- Títulos por país: porcentaje sobre 7,976 títulos con país, no sobre 8,807.
- Títulos por género: cada título puede aportar varios géneros; los porcentajes no suman 100 %.
- Top de directores: base de 6,173 títulos con director.
- Evolución por año: `release_year` y `date_added` miden cosas distintas.
- 2021 está incompleto en `date_added` porque el archivo llega hasta el 25 de septiembre.

## 5. Requisitos exactos de la Fase 2

La Fase 2 es el diseño del dashboard antes de programarlo. No se necesitan datos reales todavía; se define la estructura visual.

El entregable es un **reporte con wireframe**. Debe incluir:

### 5.1 KPI principal

- Revisar el dataset y la pregunta central del proyecto.
- Seleccionar **1 KPI principal**, el más relevante del análisis.
- Justificar por qué se eligió y qué aporta a la comprensión del fenómeno.

### 5.2 KPIs secundarios

- Seleccionar **de 2 a 4 KPIs secundarios** que ayuden a contextualizar y explicar el principal.
- Deben complementar, no repetir, al KPI principal.

### 5.3 Tipo de gráfico para cada KPI

- Elegir la visualización más adecuada para cada indicador y justificarla.
- Incluir una tabla **KPI → tipo de gráfico → justificación breve**.
- Guía:
  - Línea o área: tendencias en el tiempo.
  - Barras o columnas: comparaciones entre categorías.
  - Pastel o anillo: proporciones simples; no se recomienda con más de 5 categorías.
  - Dispersión: relación entre variables.
  - Mapa: distribución espacial o geográfica.

### 5.4 Paleta de colores

- Elegir de **2 a 4 colores principales**.
- Considerar visibilidad y contraste.
- Considerar coherencia temática; por ejemplo, sustentabilidad con verdes, felicidad con tonos cálidos.
- Considerar accesibilidad, evitando combinaciones que confundan a personas daltónicas, como rojo y verde sin contraste suficiente.
- Documentar la paleta y por qué funciona para el tema.

### 5.5 Wireframe

- Boceto de baja o alta fidelidad.
- Herramientas admitidas: papel y lápiz con foto legible, Canva, Figma, PowerPoint/Jamboard, FigJam o Draw.io.
- Debe incluir:
  - Título general.
  - Panel de KPIs, preferiblemente en la parte superior.
  - Gráficos principales.
  - Mapa, si aplica.
  - Leyendas, etiquetas y filtros.
  - Proporciones y tamaños aproximados en una cuadrícula.

### 5.6 Cuadrícula y jerarquía visual

- Indicar qué áreas serán más destacadas.
- El KPI principal debe ser el más visible.
- Usar una cuadrícula básica, por ejemplo 3 columnas × 3 filas.
- Señalar tres niveles:
  - **Nivel 1:** KPI principal y título.
  - **Nivel 2:** gráficos principales.
  - **Nivel 3:** información complementaria.
- Incluir un boceto con la cuadrícula marcada.

### 5.7 Reporte final

- Reunir todos los puntos anteriores en un documento claro.
- El formato y la fecha de entrega no están especificados en las indicaciones; hay que preguntarlos.

## 6. Decisiones por tomar

### 6.1 KPI principal

**Pregunta:** ¿cuál de los indicadores disponibles es el más relevante para el objetivo del dashboard?

**Candidatos y qué muestra cada uno:**

- **Evolución de lanzamientos por año.**
  - Muestra crecimiento, picos y cambios de ritmo de la producción.
  - Datos: 2018 es el año con más estrenos (1,147); la década de 2010 concentra 67.3 % del catálogo.
  - Cuidado: `release_year` no es lo mismo que `date_added`; 2021 está incompleto en altas.
- **Número de títulos por país.**
  - Muestra concentración geográfica y mercados dominantes.
  - Datos: Estados Unidos 3,690, India 1,046, Reino Unido 806; 123 países; 1,320 títulos con más de un país.
  - Cuidado: 831 títulos sin país y porcentajes sobre 7,976, no sobre 8,807.
- **Top 5 géneros.**
  - Muestra qué tipo de contenido predomina.
  - Datos: 42 géneros; International Movies 2,752, Dramas 2,427, Comedies 1,674; 6,787 títulos con más de un género.
  - Cuidado: los porcentajes por género no suman 100 %.
- **Top 5 directores.**
  - Muestra concentración de producción por autor.
  - Datos: 4,993 directores; Rajiv Chilaka 22, Jan Suter 21, Raúl Campos 19.
  - Cuidado: 29.9 % de nulos en `director`; el ranking cubre solo 6,173 títulos.
- **Películas vs. series.**
  - Muestra la composición del catálogo por formato.
  - Datos: 6,131 películas y 2,676 series.
  - Cuidado: es una proporción simple y no explica por sí sola tendencias ni geografía.

**Criterios para elegir:**

- Debe responder a la pregunta central del proyecto.
- Debe sostenerse con datos disponibles y una base declarada.
- Debe permitir que los KPIs secundarios lo contextualicen.
- Debe ser visualmente claro para la audiencia principal.
- Debe aportar una conclusión, no solo describir una columna.

### 6.2 KPIs secundarios

**Pregunta:** ¿qué 2 a 4 indicadores acompañan al principal y qué relación tienen con él?

**Criterios:**

- Deben contextualizar el principal desde ángulos distintos: tiempo, geografía, género, formato o autor.
- No deben repetir la misma información con otro gráfico.
- Deben poder calcularse con las cifras disponibles.
- Deben declarar su base de cálculo cuando haya valores múltiples o faltantes.

### 6.3 Tipos de gráfico

**Pregunta:** ¿qué gráfico corresponde a cada KPI y por qué?

**Criterios:**

- Línea o área para evolución temporal.
- Barras o columnas para comparar categorías.
- Pastel o anillo solo para proporciones simples, con pocas categorías.
- Mapa para distribución geográfica.
- Dispersión para relación entre dos variables numéricas.
- Evitar pasteles con países o géneros: hay demasiadas categorías.
- Evitar gráficos que oculten los valores faltantes o las bases de cálculo.

### 6.4 Paleta

**Pregunta:** ¿qué 2 a 4 colores principales se usan y por qué?

**Criterios:**

- Contraste suficiente entre texto y fondo.
- Coherencia con el tema del entretenimiento y el streaming.
- Accesibilidad para daltonismo; no depender solo de rojo y verde.
- Distinguir categorías con más de un recurso, por ejemplo color y etiqueta.
- Verificar legibilidad en pantalla y en proyector.

**Direcciones posibles, no decisiones:**

- Inspirada en Netflix: rojo, negro y grises, con un acento claro.
- Accesible y categórica: azul, naranja, verde y magenta con contraste suficiente.
- Neutra con un acento: grises para la estructura y un color para los datos principales.

Cualquier paleta debe documentarse con códigos hexadecimales y una justificación de contraste, tema y accesibilidad.

### 6.5 Wireframe

**Pregunta:** ¿cómo se organiza visualmente el dashboard?

**Decisiones:**

- Fidelidad: baja o alta.
- Herramienta: papel, Canva, Figma, PowerPoint/Jamboard, FigJam o Draw.io.
- Distribución de título, KPIs, gráficos, mapa, leyendas, filtros y etiquetas.
- Proporciones y tamaños aproximados.

**Elementos obligatorios:**

- Título general.
- KPIs, preferiblemente en la parte superior.
- Gráficos principales.
- Mapa, si el KPI principal o los secundarios lo justifican.
- Leyendas y etiquetas.
- Filtros.
- Cuadrícula marcada.

### 6.6 Cuadrícula y jerarquía

**Pregunta:** ¿qué área domina y cómo se ordena la lectura?

**Criterios:**

- Cuadrícula básica, por ejemplo 3 × 3.
- Nivel 1: título y KPI principal, lo más visible.
- Nivel 2: gráficos principales.
- Nivel 3: información complementaria.
- El boceto debe mostrar la cuadrícula y la prioridad visual.

### 6.7 Formato y fecha del reporte

**Pregunta:** ¿en qué formato y cuándo se entrega?

**Estado:** no está especificado en las indicaciones. Hay que preguntar al profesor o a Manuel.

Posibles formatos: Word, PDF, PowerPoint u otro. No asumir ninguno.

## 7. Restricciones

- Todo el contenido debe estar en español.
- No inventar cifras, métricas ni requisitos.
- Toda cifra nueva debe salir del CSV y ser reproducible.
- No modificar el entregable de la Fase 1.
- PostgreSQL y GitHub Pages ya están decididos; no cambiarlos sin consultar. La ruta actual es PostgreSQL en el procesamiento, exportación a JSON y filtros en el navegador; no añadir backend ni conexión viva sin autorización.
- No sustituir ni reducir los cinco KPIs mínimos sin consultar.
- No eliminar títulos por datos faltantes; se etiquetan como “Desconocido”.
- Declarar siempre la base de los porcentajes cuando haya valores múltiples o nulos.
- No confundir año de estreno con año de ingreso al catálogo.
- El reporte de Fase 2 sí debe incluir una tabla KPI → gráfico → justificación, porque la indicación la pide expresamente.
- Fuera de esa tabla, se prefiere texto y listas claras.
- No commitear, publicar ni modificar documentación sin autorización.

## 8. Criterios de evaluación de la Fase 2

- Justificación del KPI principal: **20 puntos**.
- Selección adecuada de tipos de gráficos: **20 puntos**.
- Paleta de colores y coherencia visual: **20 puntos**.
- Wireframe claro y bien estructurado: **30 puntos**.
- Presentación y claridad del documento: **10 puntos**.
- **Total: 100 puntos.**

El wireframe es el rubro con más peso. La justificación del KPI y los tipos de gráfico suman otros 40 puntos.

## 9. Preguntas abiertas que dependen del profesor o de Manuel

- ¿Cuál es el formato de entrega del reporte?
- ¿Cuál es la fecha de entrega?
- ¿Hay una herramienta obligatoria para el wireframe o se puede elegir entre las admitidas?
- ¿El reporte debe incluir la base de datos y el plan de despliegue ya decididos, o eso corresponde a otra fase?
- ¿El profesor exige que el dashboard consulte PostgreSQL en vivo? La ruta actual es JSON estático; si lo exige, habría que replantear con una API o un servicio como Supabase.
- ¿Los cinco KPIs de la Fase 1 son un conjunto cerrado o se pueden añadir otros?
- ¿Se espera que el wireframe sea de baja o alta fidelidad?
- ¿Hay preferencia por una identidad visual inspirada en Netflix o por una paleta neutral?

## 10. Entregables esperados del agente

El agente debe producir una propuesta de Fase 2 que incluya:

1. **KPI principal elegido**, con justificación y explicación de su aporte.
2. **2 a 4 KPIs secundarios**, con su relación con el principal.
3. **Tabla KPI → tipo de gráfico → justificación**.
4. **Paleta de 2 a 4 colores**, con códigos hexadecimales y justificación de contraste, tema y accesibilidad.
5. **Wireframe** con título, KPIs, gráficos, mapa si aplica, leyendas, etiquetas, filtros, proporciones y cuadrícula.
6. **Explicación de la jerarquía visual** y de los tres niveles.
7. **Borrador del reporte** en español, con la estructura necesaria para entregar.
8. **Lista de supuestos y preguntas abiertas** que no se puedan resolver con este documento.

El agente debe presentar las decisiones con su justificación, no solo una lista de elecciones.

## 11. Resumen mínimo para orientarse

- Es un dashboard estratégico sobre el catálogo de Netflix.
- React, repositorio público, GitHub Pages y PostgreSQL son obligatorios y ya están decididos.
- PostgreSQL se usa en el procesamiento; el frontend carga JSON estáticos y filtra en el navegador. No hay conexión viva.
- La Fase 1 ya está hecha; la Fase 2 es diseño, no programación.
- Hay 8,807 títulos: 6,131 películas y 2,676 series.
- Los cinco KPIs mínimos son: país, evolución anual, géneros, directores y formato.
- El reto es elegir uno como principal, 2 a 4 secundarios, asignar gráficos, elegir 2 a 4 colores accesibles y dibujar un wireframe con cuadrícula y jerarquía.
- No hay que inventar datos: todas las cifras necesarias están en este documento.
- El formato y la fecha del reporte siguen pendientes de confirmación.
