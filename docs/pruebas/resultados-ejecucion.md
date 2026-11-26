# 3b. Resultados de ejecución y evidencia — RutaSegura

## 1. Resumen de cumplimiento

Las salidas de Jest compartidas muestran que las suites automatizadas de backend y frontend finalizaron sin pruebas fallidas. La cobertura se informa por separado para cada plataforma porque los reportes instrumentan conjuntos diferentes de archivos.

| Plataforma | Suites aprobadas | Suites fallidas | Pruebas aprobadas | Pruebas fallidas | Tiempo reportado |
|---|---:|---:|---:|---:|---:|
| Backend | 28 | 0 | 159 | 0 | 30,291 s |
| Frontend | 9 | 0 | 34 | 0 | 5,648 s |
| **Total automatizado** | **37** | **0** | **193** | **0** | — |

**Resultado de automatización:** 193 de 193 pruebas aprobadas (100% de los casos automatizados ejecutados). Este porcentaje corresponde a aprobación de pruebas, no a cobertura del código.

## 2. Cumplimiento del plan por nivel

Los casos planificados se comparan con los resultados recibidos. La distribución por nivel se obtuvo del inventario de los archivos de prueba; las cantidades por plataforma coinciden con los totales indicados por Jest.

| Nivel | Casos planificados | Casos ejecutados | Aprobados | No ejecutados | Cumplimiento |
|---|---:|---:|---:|---:|---:|
| Unitaria | 154 | 154 | 154 | 0 | 100% |
| Integración y componente | 39 | 39 | 39 | 0 | 100% |
| **Total automatizado** | **193** | **193** | **193** | **0** | **100%** |

Controles manuales de cierre:

| Control | Planificados | Ejecutados | No ejecutados | Resultado |
|---|---:|---:|---:|---|
| E2E manual en teléfono | 1 flujo | 1 flujo | 0 | Completado, según confirmación del equipo. |
| Aceptación de sprint | 3 cierres (sprints 1, 2 y 3) | 3 cierres | 0 | La profesora guía dio por cerrados los tres sprints. |

Los controles manuales se presentan separados del total automatizado porque no son casos de Jest ni se cuentan con la misma unidad de medición. No se reporta un total combinado entre pruebas automatizadas, un flujo manual y tres decisiones de cierre.

## 3. Resumen por nivel al cierre

| Nivel | Casos aprobados | Indicador | Evidencia disponible |
|---|---:|---|---|
| Unitaria | 154/154 | Cobertura de líneas: backend 73,35%; frontend 13,20%. | `evidencias/cobertura-backend.zip` y `evidencias/cobertura-frontend.zip`; salida de Jest backend. |
| Integración y componente | 39/39 | 10 suites de integración backend y 2 suites de integración/componente frontend aprobadas. | Salidas de Jest compartidas; archivos de prueba incluidos en el repositorio del proyecto. |
| E2E manual | 1/1 flujo | Recorrido de GPS, selección de destino, cálculo y visualización de rutas en teléfono. | Confirmación del equipo. No se adjuntó captura o video en este paquete. |
| Aceptación | 3/3 cierres | Sprints 1, 2 y 3 dados por cerrados por la profesora guía. | Confirmación del equipo. No se adjuntó acta, ticket o correo independiente. |

## 4. Resultados de cobertura

Los porcentajes se obtuvieron de los archivos `coverage/coverage-summary.json` incluidos en los ZIP entregados.

### 4.1 Backend

| Indicador | Cubiertos | Total | Cobertura |
|---|---:|---:|---:|
| Líneas | 1.627 | 2.218 | **73,35%** |
| Sentencias | 1.708 | 2.351 | **72,64%** |
| Funciones | 232 | 310 | **74,83%** |
| Ramas | 835 | 1.562 | **53,45%** |

**Qué se observa:** el reporte cubre cerca de tres cuartas partes de las líneas y funciones instrumentadas del backend. La cobertura de ramas es menor (53,45%), por lo que existen caminos condicionales que no fueron recorridos por las pruebas.

Entre los archivos con menor cobertura de líneas se encuentran `geocoding.controller.js` (8,69%), `geocoding.service.js` (13,63%), `riesgo-datos.service.js` (15,62%), `geografia.controller.js` (17,64%), `nodo-cercano.service.js` (21,42%) y `red-peatonal.service.js` (47,23%).

**Qué significa y qué se decidió:** las 159 pruebas aprobadas respaldan los comportamientos ejercitados, pero no significan que todo el backend esté cubierto. Se mantiene como mejora ampliar pruebas negativas y de ramas para geocodificación, datos de riesgo, geografía, nodos cercanos y recuperación de red peatonal.

### 4.2 Frontend

| Indicador | Cubiertos | Total | Cobertura |
|---|---:|---:|---:|
| Líneas | 73 | 553 | **13,20%** |
| Sentencias | 77 | 587 | **13,11%** |
| Funciones | 20 | 148 | **13,51%** |
| Ramas | 55 | 543 | **10,12%** |

**Alcance del reporte:** el `coverage-summary.json` del frontend incluye nueve archivos fuente del módulo de mapa. No representa la cobertura global de todos los archivos de la aplicación Expo.

**Qué se observa:** algunas funciones auxiliares tienen cobertura alta, como `visibilidad-capas.ts` (100% de líneas), `concentracion-delitos.ts` (95,23%) y `zonas.ts` nativo (94,11%). En cambio, componentes centrales presentan cobertura baja: `MapaRiesgoCliente.tsx` (4,04%), `UbicacionesMapa.web.tsx` (5,26%), `CapasMapa.native.tsx` (10,29%) y `CapasMapa.web.tsx` (11,26%).

**Qué significa y qué se decidió:** las 34 pruebas frontend pasan, pero ejercitan principalmente funciones auxiliares, concentración, capas y algunos comportamientos de componentes. No permiten afirmar que el mapa completo o la aplicación Expo estén ampliamente cubiertos. Se registra como deuda técnica ampliar pruebas de componentes web/nativos y de flujos de ubicación y visualización.

### 4.3 Lectura conjunta

No se calcula un porcentaje de cobertura combinado, porque los reportes corresponden a conjuntos de archivos distintos y el frontend solo instrumentó nueve archivos. Los porcentajes se conservan por plataforma para evitar ocultar esa diferencia.

## 5. Casos negativos: resultados

| ID | Qué se probó | Resultado obtenido | Qué significa |
|---|---|---|---|
| CP-NEG-01 | Solicitud de ruta entre nodos sin conexión, mediante `ruta-sin-conectividad.test.js`. | La suite finalizó aprobada; la prueba comprueba `encontrada=false` cuando no existe conexión. | El servicio no debe presentar un recorrido inexistente como válido. El comportamiento negativo previsto está cubierto por la prueba de integración. |
| CP-NEG-02 | Respuesta JSON inválida del servicio de IA, mediante `validar-respuesta.test.js`. | La suite finalizó aprobada. La salida de Jest muestra advertencias controladas para `IA_JSON_INVALIDO` y otras respuestas inválidas. | El servicio detecta respuestas que no cumplen el contrato y evita aceptarlas como recomendaciones válidas. Las advertencias corresponden al escenario ejercitado y no a fallos de la suite. |
| CP-NEG-03 | Rango horario vacío o no permitido, mediante `horario.test.js` del frontend. | La suite terminó aprobada dentro de las 9 suites frontend. | La validación de horario rechaza los valores inválidos contemplados en los casos automatizados. |
| CP-NEG-04 | Geometría de ruta inválida, mediante `visualizacion-ruta.test.js`. | La suite terminó aprobada dentro de las 9 suites frontend. | La normalización evita que una geometría inválida se trate como un recorrido representable. La prueba usa componentes del mapa simulados. |

## 6. Registro de defectos corregidos

Los identificadores siguientes son identificadores documentales para este informe; no sustituyen los identificadores originales de Jira si existen.

| ID | Defecto | Severidad | Corrección | Verificación relacionada |
|---|---|---|---|---|
| BUG-A5-01 | Cálculo incorrecto del riesgo de zonas/segmentos. | No registrada en los antecedentes recibidos. | Se ajustó el modelo híbrido para combinar componentes temporales e históricos con la ponderación definida de 70/30. | Existen pruebas relacionadas en `modelo-riesgo-hibrido.test.js`, `riesgo-service.test.js`, `interseccion-riesgo.test.js` y `riesgo-red.integration.test.js`; no se dispone del ticket o diff que identifique una prueba de regresión específica del defecto. |
| BUG-A5-02 | Visualización incorrecta de delitos cercanos a zonas de riesgo en el mapa. | No registrada en los antecedentes recibidos. | El equipo informa que el problema de visualización fue corregido. | Existen pruebas relacionadas con concentración y capas en `concentracion-delitos.test.ts`, `capas-concentracion.test.tsx` y `visibilidad-capas.test.ts`; no se dispone del ticket o diff que vincule una prueba específica con el defecto. |

Los dos defectos se reportan como corregidos por el equipo. No se asigna severidad ni se inventa un identificador previo porque esos datos no fueron proporcionados. No se reportan defectos críticos abiertos en los antecedentes de cierre recibidos; esto no equivale a una auditoría independiente del backlog de defectos.

## 7. Informe de resultados por tipo

| Tipo | Qué se probó | Resultado | Qué significa / decisión |
|---|---|---|---|
| Unitaria | A*, MinHeap, Yen, perfiles, costos, riesgo temporal/histórico, intersección con zonas, caché TTL, validaciones de horarios y respuestas de IA; además, concentración, proximidad y visibilidad de capas en frontend. | 154 de 154 aprobadas: 127 backend y 27 frontend. La cobertura fue 73,35% de líneas en backend y 13,20% en los nueve archivos instrumentados del frontend. | La lógica central ejercitada pasa. La cobertura de ramas backend (53,45%) y la cobertura frontend baja muestran sectores que todavía requieren pruebas. La suite frontend `origen-destino.test.js` necesita corrección porque define una función auxiliar dentro del test y no importa la implementación productiva. |
| Integración y componente | Endpoints, contratos HTTP, red peatonal, riesgo por segmento, horarios, perfiles, cálculo de rutas y alternativas; selección de puntos y normalización de geometría en frontend con mocks. | 39 de 39 aprobadas: 32 backend y 7 frontend. | Los flujos entre servicios y componentes incluidos en las suites funcionan con sus fixtures y mocks. Las suites frontend simulan componentes del mapa y no sustituyen un E2E de la aplicación completa ni demuestran disponibilidad permanente de servicios externos. |
| E2E manual | Flujo en teléfono desde la ubicación GPS hasta selección de destino, cálculo y visualización de alternativas. | 1 de 1 flujo completado, según confirmación del equipo. | El flujo principal fue verificado manualmente. Para que la evidencia sea auditable debe conservarse la grabación o capturas con fecha y versión de la aplicación. |
| Aceptación | Revisión de funcionalidades desarrolladas durante los sprints 1, 2 y 3. | 3 de 3 cierres confirmados por la profesora guía. | Se considera cerrado el alcance funcional de los tres sprints según lo informado por el equipo. Conviene conservar el acta, ticket o correo de aceptación como respaldo verificable. |

## 8. Trazabilidad de fecha, commit y reportes

El commit de referencia informado por el equipo es:

`7b0ca452d05867f9ba05ac9b66cfb723c4dfaae4`

Los ZIP de cobertura registran las siguientes fechas de modificación para `coverage/coverage-summary.json`:

| Evidencia | Fecha/hora registrada en el ZIP | Zona horaria |
|---|---|---|
| `cobertura-backend.zip` | 25-11-2026 23:17:02 | No especificada en los metadatos del ZIP. |
| `cobertura-frontend.zip` | 25-11-2026 23:16:20 | No especificada en los metadatos del ZIP. |

La salida de consola backend informa 28 suites aprobadas, 159 pruebas aprobadas y 30,291 segundos. La salida frontend compartida informa 9 suites aprobadas, 34 pruebas aprobadas y 5,648 segundos. Los logs no incorporan por sí mismos la fecha ni el hash del commit. El hash indicado se conserva como commit de referencia informado, pero no queda embebido en los reportes originales; por eso la asociación exacta de cada reporte con ese commit no puede verificarse solamente con los archivos disponibles.

Además, las ejecuciones de pruebas se compartieron antes de consolidar esta versión del plan. Por esa razón, no se afirma que este archivo 3a estuviera versionado antes de las ejecuciones históricas. Para satisfacer estrictamente la trazabilidad del criterio A5, debe guardarse una nueva ejecución después de versionar el plan, incorporando fecha, commit y reporte de Jest.

## 9. Evidencias disponibles

| Archivo | Contenido | Qué respalda |
|---|---|---|
| `evidencias/cobertura-backend.zip` | Reporte HTML y `coverage-summary.json` de backend. | Porcentajes de líneas, sentencias, funciones y ramas del backend. |
| `evidencias/cobertura-frontend.zip` | Reporte HTML y `coverage-summary.json` de frontend. | Porcentajes de líneas, sentencias, funciones y ramas de los nueve archivos instrumentados. |
| `evidencias/ejecucion-backend-consola.txt` | Salida de consola backend compartida por el equipo. | Resultado de 28 suites y 159 pruebas aprobadas. No incorpora fecha/commit. |
| Salida frontend compartida | Resultado de `npm test` pegado por el equipo durante la consolidación. | Resultado de 9 suites y 34 pruebas aprobadas; no se adjuntó un archivo original de log separado. |
| Evidencia E2E y aceptación | Confirmación del equipo de recorrido manual y cierre de sprints. | Respaldo declarativo del E2E y aceptación; faltan captura/video y acta/ticket/correo adjuntos. |

## 10. Resultado de cierre y limitaciones

Las ejecuciones automatizadas disponibles registran 193 de 193 pruebas aprobadas. Se informa que el recorrido principal se completó manualmente en un teléfono y que la profesora guía dio por cerrados los sprints 1, 2 y 3. Los reportes de cobertura de backend y frontend se incorporan como archivos adjuntos.

Los resultados muestran dos limitaciones cuantitativas: cobertura de ramas backend de 53,45% y cobertura de líneas frontend de 13,20% sobre nueve archivos instrumentados. Además, la prueba frontend `origen-destino.test.js` debe ajustarse para comprobar la implementación productiva. Estas limitaciones se registran como deuda de pruebas; no cambian el resultado de aprobación de las suites ejecutadas.

Para completar la trazabilidad estricta solicitada por A5 quedan por adjuntar un reporte de Jest generado con fecha y commit después de versionar el plan, capturas o video del recorrido E2E y un registro documental de aceptación de la profesora. No se presentan esos elementos como evidencia adjunta porque no forman parte de los archivos recibidos.
