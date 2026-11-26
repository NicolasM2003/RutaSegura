# Plan de pruebas y evidencia de ejecución — RutaSegura

## 1. Objetivo

Establecer qué funcionalidades de RutaSegura se verifican, en qué nivel se realizan las pruebas, qué herramientas se utilizan y cuáles son los criterios para considerar satisfactoria cada validación.

El plan considera pruebas unitarias, de integración y componentes, un recorrido manual de extremo a extremo en dispositivo móvil y validaciones de aceptación correspondientes a los tres sprints del proyecto.

## 2. Alcance

Se consideran las siguientes funcionalidades:

- Consulta y procesamiento de delitos y zonas de riesgo.
- Cálculo del riesgo temporal e histórico y clasificación de zonas.
- Clasificación de infraestructura peatonal y asociación del riesgo a segmentos y aristas.
- Obtención de la red peatonal desde Supabase y consultas mediante BBOX.
- Funcionamiento de la caché y su tiempo de expiración (TTL).
- Cálculo de rutas mediante A*, MinHeap y Yen.
- Perfiles de navegación y generación de rutas alternativas.
- Validación de origen, destino y rangos horarios.
- Endpoints de salud, delitos, rutas y alternativas.
- Construcción de contexto e interpretación de alternativas mediante el servicio de IA.
- Visualización de delitos, concentración, zonas de riesgo y rutas.
- Selección manual de puntos y obtención de ubicación GPS en dispositivo móvil.

No se incluyen en este plan las pruebas de carga y rendimiento ni los escaneos de seguridad, ya que se documentan específicamente en A6. Tampoco se dispone de una suite E2E automatizada; el flujo completo se verifica manualmente en un teléfono.

Cuando una prueba utiliza mocks o fixtures, valida el comportamiento del código bajo esas condiciones controladas y no la disponibilidad permanente del proveedor externo en producción.

## 3. Herramientas y planificación

### 3.1. Herramientas utilizadas

| Plataforma | Herramienta | Configuración | Uso |
|---|---|---|---|
| Backend | Jest | Versión declarada ^30.4.2 | Pruebas unitarias y de integración. |
| Backend | Supertest | ^7.2.2 | Pruebas HTTP de endpoints y contratos. |
| Frontend | Jest | 29.7.0 con jest-expo (~57.0.6) | Pruebas unitarias y de componentes. |
| Frontend | Testing Library React | ^16.3.3 | Renderizado e interacción de componentes. |
| Frontend | jest-environment-jsdom | ^30.5.2 | Entorno DOM para pruebas web. |

### 3.2. Comandos habituales

Los siguientes comandos permiten ejecutar las pruebas automatizadas desde sus respectivos directorios.

**Backend:**

```powershell
cd backend
npm test
```

**Frontend:**

```powershell
cd frontend
npm test
```

Para generar reportes de cobertura:

```powershell
npm test -- --coverage --coverageReporters=text --coverageReporters=html --coverageReporters=json-summary
```

La cobertura se genera por separado para backend y frontend.

### 3.3. Casos planificados por nivel

El inventario considera las instancias ejecutables de Jest y no solamente la cantidad de archivos. Las pruebas parametrizadas se contabilizan según sus casos ejecutables.

| Nivel | Casos planificados | Distribución |
|---|---:|---|
| Unitaria | 154 | 127 backend y 27 frontend. |
| Integración y componentes | 39 | 32 backend y 7 frontend. |
| E2E manual | 1 flujo | Recorrido principal en dispositivo móvil. |
| Aceptación | 3 validaciones | Una validación de cierre por cada sprint. |

Las pruebas automatizadas contemplan un total de **193 casos**. El flujo E2E y las validaciones de aceptación se contabilizan por separado porque son controles manuales y no forman parte de las ejecuciones de Jest.

### 3.4. Criterios de entrada

Antes de ejecutar las pruebas se requiere:

1. Código disponible en la versión que se desea validar y dependencias instaladas.
2. Variables de entorno necesarias configuradas localmente, sin exponer secretos en los reportes.
3. Fixtures, mocks y datos de prueba disponibles para aislar dependencias externas cuando corresponda.
4. Servicios y configuración de pruebas accesibles para las pruebas de integración que los requieran.
5. Rama y hash del commit identificados para asociarlos al resultado de la ejecución.
6. Para el E2E manual, aplicación instalada en el teléfono, backend disponible, conexión de red y permisos de ubicación habilitados.

### 3.5. Criterios de salida

La validación se considera satisfactoria cuando:

- Los casos unitarios y de integración planificados se ejecutan sin pruebas fallidas.
- Los escenarios negativos rechazan o manejan las entradas inválidas según el resultado esperado.
- El flujo E2E manual puede completarse desde la ubicación u origen hasta la visualización de alternativas.
- La profesora guía revisa las funcionalidades comprometidas y da por cerrados los sprints correspondientes.
- Los defectos que impiden los flujos principales se corrigen antes del cierre. Los defectos restantes se documentan con su impacto y decisión.
- La cobertura se informa por líneas, sentencias, funciones y ramas.
- Los resultados se respaldan con reportes de herramientas y se asocian a la fecha y al commit de ejecución.

No se establece un porcentaje mínimo único de cobertura para ambas plataformas. Los sectores sin cobertura se identifican como limitaciones o deuda técnica.

## 4. Cumplimiento del plan de pruebas

La siguiente tabla compara los casos planificados con las ejecuciones registradas.

| Nivel | Casos planificados | Casos ejecutados | Aprobados | No ejecutados | Cumplimiento |
|---|---:|---:|---:|---:|---:|
| Unitaria | 154 | 154 | 154 | 0 | 100 % |
| Integración y componentes | 39 | 39 | 39 | 0 | 100 % |
| **Total automatizado** | **193** | **193** | **193** | **0** | **100 %** |

**Resultado de automatización:** 193 de 193 pruebas aprobadas, sin pruebas fallidas.

Los controles manuales se presentan por separado:

| Control | Planificados | Ejecutados | No ejecutados | Resultado |
|---|---:|---:|---:|---|
| E2E manual en teléfono | 1 flujo | 1 flujo | 0 | Completado según confirmación del equipo. Falta adjuntar captura o video. |
| Aceptación de sprint | 3 cierres | 3 cierres | 0 | Los tres sprints fueron dados por cerrados por la profesora guía, según confirmación del equipo. |

No se calcula un total combinado entre pruebas automatizadas, flujo manual y decisiones de aceptación, ya que corresponden a unidades de medición diferentes.

## 5. Resumen de resultados por nivel

| Nivel | Casos aprobados | Indicador | Evidencia |
|---|---:|---|---|
| Unitaria | 154/154 | Backend: 73,35 % de cobertura de líneas. Frontend: 13,20 % en los archivos instrumentados. | Reportes de cobertura y salidas de Jest. |
| Integración y componentes | 39/39 | 10 suites backend y 2 suites frontend aprobadas. | Salidas de Jest y archivos de pruebas del repositorio. |
| E2E manual | 1/1 flujo | Recorrido de GPS, selección de destino, cálculo y visualización de rutas. | Confirmación del equipo. Falta evidencia visual adjunta. |
| Aceptación | 3/3 cierres | Sprints 1, 2 y 3 dados por cerrados. | Confirmación del equipo. Faltan actas o tickets independientes adjuntos. |

## 6. Resultados de cobertura

Los porcentajes se obtuvieron de los archivos `coverage/coverage-summary.json` incluidos en los reportes de cobertura entregados.

### 6.1. Backend

| Indicador | Cubiertos | Total | Cobertura |
|---|---:|---:|---:|
| Líneas | 1.627 | 2.218 | 73,35 % |
| Sentencias | 1.708 | 2.351 | 72,64 % |
| Funciones | 232 | 310 | 74,83 % |
| Ramas | 835 | 1.562 | 53,45 % |

**Qué se observa:** el reporte cubre aproximadamente tres cuartas partes de las líneas y funciones instrumentadas del backend. La cobertura de ramas es menor, con un 53,45 %, lo que indica que existen caminos condicionales que no fueron recorridos por las pruebas.

Entre los archivos con menor cobertura de líneas se encuentran:

- `geocoding.controller.js`: 8,69 %.
- `geocoding.service.js`: 13,63 %.
- `riesgo-datos.service.js`: 15,62 %.
- `geografia.controller.js`: 17,64 %.
- `nodo-cercano.service.js`: 21,42 %.
- `red-peatonal.service.js`: 47,23 %.

**Qué significa y qué se decidió:** las 159 pruebas backend aprobadas respaldan los comportamientos ejercitados, pero no significan que todo el backend esté cubierto. Se mantiene como mejora ampliar las pruebas negativas y de ramas para geocodificación, datos de riesgo, geografía, nodos cercanos y recuperación de red peatonal.

### 6.2. Frontend

| Indicador | Cubiertos | Total | Cobertura |
|---|---:|---:|---:|
| Líneas | 73 | 553 | 13,20 % |
| Sentencias | 77 | 587 | 13,11 % |
| Funciones | 20 | 148 | 13,51 % |
| Ramas | 55 | 543 | 10,12 % |

**Alcance del reporte:** el `coverage-summary.json` del frontend incluye nueve archivos fuente del módulo de mapa. No representa la cobertura global de todos los archivos de la aplicación Expo.

Algunas funciones auxiliares presentan cobertura alta:

- `visibilidad-capas.ts`: 100 % de líneas.
- `concentracion-delitos.ts`: 95,23 %.
- `zonas.ts` nativo: 94,11 %.

En cambio, algunos componentes centrales presentan cobertura baja:

- `MapaRiesgoCliente.tsx`: 4,04 %.
- `UbicacionesMapa.web.tsx`: 5,26 %.
- `CapasMapa.native.tsx`: 10,29 %.
- `CapasMapa.web.tsx`: 11,26 %.

**Qué significa y qué se decidió:** las 34 pruebas frontend pasan, pero ejercitan principalmente funciones auxiliares, concentración, capas y algunos comportamientos de componentes. No permiten afirmar que el mapa completo o la aplicación Expo estén ampliamente cubiertos.

Se registra como deuda técnica ampliar las pruebas de componentes web/nativos y los flujos de ubicación y visualización.

### 6.3. Lectura conjunta

No se calcula un porcentaje de cobertura combinado, porque los reportes corresponden a conjuntos de archivos distintos y el frontend solo instrumentó nueve archivos. Los porcentajes se mantienen separados para evitar ocultar esa diferencia.

## 7. Casos negativos

Los casos negativos verifican que el sistema controle situaciones inválidas y no entregue resultados incorrectos.

### CP-NEG-01 — Ruta sin conectividad

| Campo | Contenido |
|---|---|
| ID | CP-NEG-01 |
| Requerimiento y HU | RF-09; SEG-45 y SEG-2. |
| Tipo | Negativo — integración backend. |
| Precondición | El grafo de prueba contiene nodos de origen y destino sin conexión entre sí. |
| Pasos | 1) Preparar el grafo desconectado. 2) Solicitar el cálculo entre el origen y el destino. 3) Revisar el indicador de resultado y el recorrido retornado. |
| Resultado esperado | El servicio indica que no se encontró ruta (`encontrada=false`) y no entrega un recorrido inexistente como válido. |
| Resultado obtenido | Prueba aprobada. Se comprueba que el servicio devuelve `encontrada=false` cuando no existe conexión. |
| Evidencia | `tests/Integracion/ruta-sin-conectividad.test.js`. |

### CP-NEG-02 — Respuesta JSON inválida del servicio de IA

| Campo | Contenido |
|---|---|
| ID | CP-NEG-02 |
| Requerimiento y HU | RF-11; SEG-46. |
| Tipo | Negativo — unitaria backend. |
| Precondición | El servicio recibe una respuesta del modelo que no contiene JSON válido o no cumple la estructura requerida. |
| Pasos | 1) Simular una respuesta inválida. 2) Ejecutar la validación. 3) Comprobar que no se genere una interpretación válida a partir de datos incorrectos. |
| Resultado esperado | La respuesta se rechaza o se normaliza como error controlado; no se acepta una recomendación inválida. |
| Resultado obtenido | Prueba aprobada. La salida de Jest registra advertencias controladas asociadas a respuestas inválidas, incluyendo `IA_JSON_INVALIDO`. |
| Evidencia | `tests/unitarias/validar-respuesta.test.js`. |

### CP-NEG-03 — Rango horario no permitido

| Campo | Contenido |
|---|---|
| ID | CP-NEG-03 |
| Requerimiento y HU | RF-05; SEG-3. |
| Tipo | Negativo — unitaria frontend. |
| Precondición | La función de validación recibe un rango vacío o con formato no permitido. |
| Pasos | 1) Entregar un valor horario vacío o inválido. 2) Ejecutar la validación. 3) Revisar el resultado. |
| Resultado esperado | El valor inválido es rechazado y no se utiliza como filtro válido. |
| Resultado obtenido | Prueba aprobada dentro de las suites unitarias del frontend. |
| Evidencia | `frontend/tests/unitarias/horario.test.js`. |

### CP-NEG-04 — Geometría de ruta inválida

| Campo | Contenido |
|---|---|
| ID | CP-NEG-04 |
| Requerimiento y HU | RF-10; SEG-129. |
| Tipo | Negativo — integración de componente/frontend. |
| Precondición | La función de presentación recibe una geometría ausente o con estructura inválida. |
| Pasos | 1) Entregar una geometría inválida. 2) Ejecutar la normalización. 3) Comprobar la geometría resultante y la distancia presentada. |
| Resultado esperado | La geometría inválida se rechaza o se transforma en un resultado vacío controlado; no se dibuja un recorrido incorrecto. |
| Resultado obtenido | Prueba aprobada. La normalización controla las geometrías inválidas. |
| Evidencia | `frontend/tests/integracion/visualizacion-ruta.test.js`. |

## 8. Prueba manual de extremo a extremo

**ID:** E2E-MAN-01 — Consulta de ruta en dispositivo móvil.

**Tipo:** Extremo a extremo manual.

**Precondición:** aplicación instalada en el teléfono, backend disponible, conexión de red y permiso GPS concedido.

**Pasos:**

1. Abrir RutaSegura en el teléfono.
2. Obtener la ubicación actual mediante GPS.
3. Seleccionar un destino en el mapa.
4. Solicitar el cálculo de rutas.
5. Esperar la respuesta del backend y visualizar las alternativas.
6. Revisar los recorridos y sus indicadores de distancia y riesgo.

**Resultado esperado:** el usuario completa el flujo desde la ubicación de origen hasta la visualización de rutas alternativas sin bloqueos.

**Resultado obtenido:** flujo completado manualmente en el teléfono, según confirmación del equipo.

**Evidencia:** confirmación del equipo. No se adjuntó captura o grabación en el paquete de resultados.

No se dispone de una suite E2E automatizada. El recorrido se considera una validación manual del flujo principal.

## 9. Pruebas de aceptación

Se consideran tres puntos de control, uno por cada sprint finalizado.

| ID | Alcance | Responsable | Criterio de aprobación | Resultado |
|---|---|---|---|---|
| AC-01 | Revisión de funcionalidades del Sprint 1. | Profesora guía. | Confirmación de que las funcionalidades revisadas cumplen lo esperado. | Cerrado según confirmación del equipo. |
| AC-02 | Revisión de funcionalidades del Sprint 2. | Profesora guía. | Confirmación de que las funcionalidades revisadas cumplen lo esperado. | Cerrado según confirmación del equipo. |
| AC-03 | Revisión de funcionalidades del Sprint 3. | Profesora guía. | Confirmación de que las funcionalidades revisadas cumplen lo esperado. | Cerrado según confirmación del equipo. |

Los tres sprints fueron dados por cerrados por la profesora guía, según lo informado por el equipo. No se adjuntaron actas, tickets o correos independientes que permitan verificar documentalmente cada aceptación.

Estas validaciones de cierre no sustituyen el registro de aprobación individual de las historias de usuario en sus respectivos tickets de A3.

## 10. Registro de defectos corregidos

Los siguientes defectos fueron identificados y reportados como corregidos durante el desarrollo.

| ID | Defecto | Severidad | Corrección | Verificación relacionada |
|---|---|---|---|---|
| SEG-183 | Cálculo incorrecto del riesgo de zonas y segmentos. | No registrada. | Se ajustó el modelo híbrido, estableciendo 70 % para el componente temporal y 30 % para el histórico. Dentro del temporal se considera 70 % para zonas de riesgo y 30 % para delitos aislados. | `modelo-riesgo-hibrido.test.js`, `riesgo-service.test.js`, `interseccion-riesgo.test.js` y `riesgo-red.integration.test.js`. |
| SEG-144 | Visualización incorrecta de delitos y zonas de riesgo, incluyendo circunferencias que se extendían sobre el agua. | No registrada. | Se ajustó la ubicación de las zonas y el radio de representación utilizado por el sistema. | `concentracion-delitos.test.ts`, `capas-concentracion.test.tsx` y `visibilidad-capas.test.ts`. |

Los dos defectos se reportan como corregidos por el equipo. Las pruebas indicadas están relacionadas con los comportamientos afectados, pero no se dispone de una identificación independiente de la prueba de regresión específica para cada defecto.

No se asignan severidades que no se encuentren registradas en los antecedentes del proyecto.

No se reportan defectos críticos abiertos en los antecedentes de cierre recibidos. Esto no equivale a una auditoría independiente del backlog de defectos.

## 11. Informe de resultados por tipo

| Tipo | Qué se probó | Resultado | Qué significa / decisión |
|---|---|---|---|
| Unitaria | A*, MinHeap, Yen, perfiles, costos, modelo de riesgo, intersección con zonas, caché TTL, horarios y validaciones de respuestas de IA. También se verificaron concentración y visibilidad de capas en frontend. | 154 de 154 aprobadas: 127 backend y 27 frontend. Cobertura de líneas: 73,35 % backend y 13,20 % frontend instrumentado. | La lógica ejercitada pasa. La cobertura de ramas backend y la baja cobertura frontend muestran sectores que requieren pruebas adicionales. Se mantiene como deuda técnica la ampliación de pruebas. |
| Integración y componentes | Endpoints, contratos HTTP, red peatonal, riesgo por segmento, horarios, perfiles, cálculo de rutas y alternativas. También selección de puntos y normalización de geometría en frontend. | 39 de 39 aprobadas: 32 backend y 7 frontend. | Los flujos incluidos en las suites funcionan bajo las condiciones controladas. Las pruebas frontend utilizan mocks y no sustituyen un E2E completo de la aplicación. |
| E2E manual | Flujo en teléfono desde la ubicación GPS hasta selección de destino, cálculo y visualización de alternativas. | 1 de 1 flujo completado, según confirmación del equipo. | El flujo principal fue verificado manualmente. Falta conservar una grabación o capturas con fecha y versión de la aplicación. |
| Aceptación | Revisión de funcionalidades desarrolladas durante los sprints 1, 2 y 3. | 3 de 3 cierres confirmados por la profesora guía. | Se considera cerrado el alcance de los tres sprints según lo informado. Falta conservar actas, tickets o correos como respaldo verificable. |

## 12. Trazabilidad de fecha, commit y reportes

El commit de referencia informado por el equipo es:

`7b0ca452d05867f9ba05ac9b66cfb723c4dfaae4`

Los archivos ZIP de cobertura registran las siguientes fechas de modificación para `coverage/coverage-summary.json`:

| Evidencia | Fecha y hora registrada | Zona horaria |
|---|---|---|
| `evidencias/cobertura-backend.zip` | 25-11-2026 23:17:02 | No especificada. |
| `evidencias/cobertura-frontend.zip` | 25-11-2026 23:16:20 | No especificada. |

La salida de consola backend informa 28 suites aprobadas, 159 pruebas aprobadas y un tiempo de 30,291 segundos.

La salida frontend compartida informa 9 suites aprobadas, 34 pruebas aprobadas y un tiempo de 5,648 segundos.

Los logs originales no incorporan por sí mismos la fecha ni el hash del commit. El hash indicado se conserva como commit de referencia informado por el equipo, pero no se encuentra embebido en los reportes originales. Por lo tanto, no se puede verificar únicamente con esos archivos que cada ejecución corresponda exactamente a dicho commit.

Además, las ejecuciones se compartieron antes de consolidar esta versión del plan. Por ello, no se afirma que este documento estuviera versionado antes de las ejecuciones históricas.

Para completar estrictamente la trazabilidad solicitada por la rúbrica, se debe conservar una nueva ejecución después de versionar el plan, incorporando fecha, hash del commit y reportes generados por Jest.

## 13. Evidencias disponibles

| Archivo o registro | Contenido | Qué respalda |
|---|---|---|
| `evidencias/cobertura-backend.zip` | Reporte HTML y `coverage-summary.json` de backend. | Porcentajes de cobertura de líneas, sentencias, funciones y ramas. |
| `evidencias/cobertura-frontend.zip` | Reporte HTML y `coverage-summary.json` de frontend. | Porcentajes de cobertura de los nueve archivos instrumentados. |
| `evidencias/ejecucion-backend-consola.txt` | Salida de consola backend compartida por el equipo. | Resultado de 28 suites y 159 pruebas aprobadas. |
| Salida frontend compartida | Resultado de `npm test` entregado durante la consolidación. | Resultado de 9 suites y 34 pruebas aprobadas. No se adjuntó un log independiente. |
| Confirmación de E2E | Confirmación del equipo sobre la ejecución en teléfono. | Respalda declarativamente el recorrido manual. Falta captura o video. |
| Confirmación de aceptación | Confirmación del equipo sobre el cierre de los tres sprints. | Respalda declarativamente la aceptación. Faltan actas o tickets independientes. |

## 14. Resultado de cierre y limitaciones

Las ejecuciones automatizadas disponibles registran 193 de 193 pruebas aprobadas, sin pruebas fallidas. También se informa que el recorrido principal se completó manualmente en un teléfono y que la profesora guía dio por cerrados los tres sprints.

Los reportes de cobertura muestran dos limitaciones cuantitativas importantes: cobertura de ramas backend de 53,45 % y cobertura de líneas frontend de 13,20 % sobre nueve archivos instrumentados.

Además, la suite frontend `origen-destino.test.js` requiere revisión porque define una función auxiliar dentro del propio test y no importa directamente la implementación productiva.

Estas limitaciones se mantienen como deuda técnica y no modifican el resultado de aprobación de las suites ejecutadas.

Para completar la evidencia exigida por la rúbrica quedan pendientes:

- Generar nuevos reportes de Jest después de versionar el plan, con fecha y commit identificables.
- Incorporar capturas o video del recorrido E2E en dispositivo.
- Conservar un respaldo documental de las aprobaciones de la profesora guía.
- Vincular las aprobaciones individuales de las HU con sus respectivos tickets en A3.

La aprobación de las pruebas automatizadas demuestra que los casos ejecutados finalizaron correctamente, pero no implica que todos los componentes del sistema tengan cobertura completa ni que los escenarios de seguridad y eficiencia estén validados. Estos últimos se documentan en A6.