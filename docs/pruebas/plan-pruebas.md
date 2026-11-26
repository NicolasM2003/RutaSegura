# 3a. Plan de pruebas — RutaSegura

## 1. Objetivo

Establecer qué funcionalidades de RutaSegura se verifican, en qué nivel se realizan las pruebas, qué herramientas se utilizan y cuáles son los criterios para considerar satisfactoria cada validación. El plan considera pruebas automatizadas del backend y frontend, un recorrido manual de extremo a extremo en dispositivo móvil y la aceptación funcional de los tres sprints.

## 2. Alcance

Se consideran las siguientes funcionalidades:

- Consulta y procesamiento de delitos y zonas de riesgo.
- Cálculo del riesgo temporal e histórico, clasificación de zonas y clasificación de infraestructura peatonal.
- Asociación del riesgo a segmentos y aristas de la red peatonal.
- Obtención de la red peatonal desde Supabase, consulta por BBOX y funcionamiento de la caché TTL.
- Cálculo de rutas mediante A*, MinHeap y Yen; perfiles de navegación y generación de alternativas.
- Validación de origen, destino y rangos horarios.
- Endpoints de salud, delitos, rutas y alternativas, además de sus contratos HTTP.
- Construcción de contexto, validación e interpretación de alternativas mediante el servicio de IA.
- Visualización de delitos, concentración, zonas de riesgo, capas y rutas en la interfaz web/móvil.
- Selección manual de puntos y obtención de ubicación GPS en dispositivo móvil.

No se incluyen pruebas de carga/rendimiento ni pruebas de penetración o seguridad. Tampoco se dispone de una suite E2E automatizada; el flujo completo se valida manualmente en un teléfono. Cuando una prueba utiliza mocks o fixtures, valida el comportamiento del código bajo esas condiciones controladas y no la disponibilidad permanente del proveedor externo en producción.

## 3. Niveles, herramientas y planificación

### 3.1 Herramientas

| Plataforma | Herramienta | Configuración identificada | Uso |
|---|---|---|---|
| Backend | Jest | Versión declarada `^30.4.2`; ejecución `jest --runInBand`; no existe `jest.config.js` | Pruebas unitarias y de integración. |
| Backend | Supertest | `^7.2.2` | Pruebas HTTP de endpoints y contratos. |
| Frontend | Jest | Versión `29.7.0` identificada en `package-lock.json`; preset `jest-expo` (`~57.0.6`) | Pruebas unitarias y de componentes. |
| Frontend | Testing Library React | `^16.3.3` | Renderizado e interacción de componentes. |
| Frontend | jest-environment-jsdom | `^30.5.2` | Entorno DOM para pruebas web. |

Comandos habituales:

```powershell
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

Para generar cobertura en cada plataforma:

```powershell
npm test -- --coverage --coverageReporters=text --coverageReporters=html --coverageReporters=json-summary
```

### 3.2 Casos planificados por nivel

El inventario se cuenta por instancias de pruebas de Jest, no solamente por archivos. Las pruebas parametrizadas con `test.each` se cuentan según sus filas ejecutables. La distribución coincide con los totales de las salidas de Jest compartidas.

| Nivel | Casos planificados | Distribución de suites |
|---|---:|---|
| Unitaria | 154 | 127 backend (18 suites) y 27 frontend (7 suites). |
| Integración y componente | 39 | 32 backend (10 suites) y 7 frontend (2 suites). |
| E2E manual | 1 flujo | Recorrido principal en teléfono. |
| Aceptación | 3 validaciones | Una validación de cierre por cada sprint: 1, 2 y 3. |

Las pruebas automatizadas planificadas suman **193 casos**. El flujo E2E y las tres validaciones de sprint se registran por separado porque son controles manuales y no forman parte del total de Jest.

### 3.3 Criterios de entrada

Antes de ejecutar las pruebas se requiere:

1. Código disponible en la versión que se desea validar y dependencias instaladas.
2. Variables de entorno necesarias configuradas localmente, sin exponer secretos en los reportes.
3. Fixtures, mocks y datos de prueba disponibles para aislar dependencias externas cuando corresponda.
4. Servicios y configuración de test accesibles para las pruebas de integración que los requieran.
5. Rama y hash del commit identificados para asociarlos al resultado de la ejecución.
6. Para el E2E manual, aplicación instalada en el teléfono, backend disponible, conexión de red y permisos de ubicación habilitados.

### 3.4 Criterios de salida

La validación se considera satisfactoria cuando:

- Los casos unitarios y de integración planificados se ejecutan y no presentan fallos.
- Los escenarios negativos rechazan o manejan las entradas inválidas según el resultado esperado.
- El flujo E2E manual puede completarse desde la ubicación/origen hasta la visualización de alternativas.
- La profesora guía revisa las funcionalidades comprometidas y da por cerrados los sprints correspondientes.
- Los defectos que impiden los flujos principales se corrigen antes del cierre; los defectos conocidos restantes se documentan con su impacto y decisión.
- La cobertura se informa por líneas, sentencias, funciones y ramas. Los sectores sin cobertura se identifican como limitaciones o deuda técnica; no se establece un porcentaje mínimo único para ambas plataformas.
- Los resultados se respaldan con reportes de herramienta y se asocian a la fecha y al commit de la ejecución.

## 4. Inventario de casos unitarios

### 4.1 Backend — 127 casos en 18 suites

| ID | Suite | Casos | Qué se verifica |
|---|---|---:|---|
| B-UT-01 | `a-star.test.js` | 8 | Búsqueda A*, perfiles, optimalidad, conectividad, heurística y no mutación del grafo. |
| B-UT-02 | `cache-ttl.test.js` | 2 | Vigencia y expiración de la caché. |
| B-UT-03 | `clasificacion-peatonal.test.js` | 12 | Clasificación de vías según tipo y etiquetas de acceso peatonal. |
| B-UT-04 | `contexto.test.js` | 5 | Construcción y comparación del contexto enviado a la IA. |
| B-UT-05 | `costo-ruta.test.js` | 33 | Normalización de riesgo/distancia y cálculo del costo operativo de aristas, incluidos valores inválidos. |
| B-UT-06 | `grafo-riesgo-por-arista.test.js` | 2 | Cálculo de riesgo por arista y uso del riesgo en el grafo. |
| B-UT-07 | `interpretacion-rutas.test.js` | 5 | Validación de interpretación y rechazo de recomendaciones inválidas. |
| B-UT-08 | `interseccion-riesgo.test.js` | 4 | Exposición parcial o total de aristas respecto de zonas de riesgo. |
| B-UT-09 | `min-heap.test.js` | 4 | Inserción, actualización y extracción ordenada del MinHeap. |
| B-UT-10 | `modelo-riesgo-hibrido.test.js` | 19 | Agrupación, coordenadas coincidentes, componentes temporal/histórico y ponderación 70/30. |
| B-UT-11 | `openai-service.test.js` | 5 | Timeout, autenticación, cuota y errores temporales del servicio OpenAI. |
| B-UT-12 | `perfiles-ruta.test.js` | 5 | Pesos y comportamiento de los perfiles de navegación. |
| B-UT-13 | `red-peatonal-rutas.test.js` | 3 | Consulta de red por BBOX y comportamiento sin segmentos o fallback. |
| B-UT-14 | `riesgo-service.test.js` | 5 | Normalización, clasificación y cálculo del puntaje de riesgo. |
| B-UT-15 | `ruta-algoritmo-principal.test.js` | 3 | Uso del algoritmo A* + MinHeap en el cálculo principal por perfil. |
| B-UT-16 | `ruta-yen.test.js` | 2 | Generación y ordenamiento de caminos alternativos mediante Yen. |
| B-UT-17 | `solicitud-interpretacion.test.js` | 4 | Construcción de instrucciones y contexto para interpretar rutas. |
| B-UT-18 | `validar-respuesta.test.js` | 6 | Validación de respuestas de IA, JSON inválido y recomendaciones no permitidas. |
| **Total** | **18 suites** | **127** | |

### 4.2 Frontend — 27 casos en 7 suites

| ID | Suite | Casos | Qué se verifica |
|---|---|---:|---|
| F-UT-01 | `capa-concentracion-web.test.tsx` | 1 | Renderizado de concentración de delitos en web. |
| F-UT-02 | `capas-concentracion.test.tsx` | 2 | Renderizado nativo y selección de grupos de concentración. |
| F-UT-03 | `concentracion-delitos.test.ts` | 7 | Agrupación por coordenadas exactas, contadores, colores y horarios. |
| F-UT-04 | `horario.test.js` | 4 | Aceptación y rechazo de rangos horarios. |
| F-UT-05 | `origen-destino.test.js` | 4 | Casos de origen/destino presente o ausente. La implementación de este test requiere revisión porque define una función auxiliar dentro del propio archivo, en vez de importar la función productiva. |
| F-UT-06 | `visibilidad-capas.test.ts` | 6 | Visibilidad independiente y simultánea de capas del mapa. |
| F-UT-07 | `zonas-proximidad.test.js` | 3 | Asociación de puntos con zonas cercanas y umbrales. |
| **Total** | **7 suites** | **27** | |

## 5. Inventario de integración y componentes

### 5.1 Backend — 32 casos en 10 suites

| ID | Suite | Casos | Qué se verifica |
|---|---|---:|---|
| B-IT-01 | `app.test.js` | 6 | Endpoints `/health` y `/api/delitos`, estado y estructura de respuesta. |
| B-IT-02 | `horario.integration.test.js` | 1 | Integración del filtro horario. |
| B-IT-03 | `interpretacion-rutas.integration.test.js` | 4 | Flujo de contexto, validación de respuesta, errores de API y perfiles duplicados. |
| B-IT-04 | `perfiles-ruta.integration.test.js` | 4 | Cálculo según perfiles menor riesgo, equilibrado y más rápido; rechazo de perfil no definido. |
| B-IT-05 | `red-peatonal.integration.test.js` | 3 | Obtención de red peatonal y construcción del grafo. |
| B-IT-06 | `riesgo-red.integration.test.js` | 3 | Asociación del riesgo a segmentos de la red. |
| B-IT-07 | `ruta-sin-conectividad.test.js` | 2 | Respuesta cuando no existe conexión y consulta de red limitada por BBOX. |
| B-IT-08 | `ruta.integration.test.js` | 1 | Cálculo de una ruta válida entre origen y destino. |
| B-IT-09 | `rutas-alternativas.integration.test.js` | 5 | Generación, filtrado y orden de rutas alternativas. |
| B-IT-10 | `rutas-http.contract.test.js` | 3 | Contrato HTTP de costos y documentación Swagger. |
| **Total** | **10 suites** | **32** | |

### 5.2 Frontend — 7 casos en 2 suites

| ID | Suite | Casos | Qué se verifica |
|---|---|---:|---|
| F-IT-01 | `seleccion-puntos.test.js` | 3 | Selección de origen/destino mediante eventos del mapa, con `react-leaflet` simulado. |
| F-IT-02 | `visualizacion-ruta.test.js` | 4 | Normalización de geometría y formato de distancia, con componentes del mapa simulados. |
| **Total** | **2 suites** | **7** | |

Las suites frontend están en la carpeta `integracion`, pero utilizan mocks del mapa. Se consideran pruebas de integración de componentes o comportamiento aislado; no representan un recorrido E2E de toda la aplicación.

Los scripts backend `tests/manuales/probar-riesgo.js` y `tests/manuales/probar-zonas.js` son utilidades de verificación manual. No se suman a los 193 casos de Jest.

## 6. Casos negativos: especificación

Los casos negativos se documentan con identificador, requerimiento, tipo, precondición, pasos y resultado esperado.

### CP-NEG-01 — Ruta sin conectividad

| Campo | Contenido |
|---|---|
| Requerimiento y HU | Cálculo de rutas y consulta de alternativas; SEG-45 y SEG-2. |
| Tipo | Negativo — integración backend. |
| Precondición | El grafo de prueba contiene nodos de origen y destino sin conexión entre sí. |
| Pasos | 1) Preparar el grafo desconectado. 2) Solicitar el cálculo entre el origen y el destino. 3) Revisar el indicador de resultado y el recorrido retornado. |
| Resultado esperado | El servicio indica que no se encontró ruta (`encontrada=false`) y no entrega un recorrido inexistente como válido. |
| Suite asociada | `tests/Integracion/ruta-sin-conectividad.test.js`. |

### CP-NEG-02 — Respuesta JSON inválida del servicio de IA

| Campo | Contenido |
|---|---|
| Requerimiento y HU | Interpretación de alternativas mediante IA; SEG-46. |
| Tipo | Negativo — unitaria backend. |
| Precondición | El servicio recibe una respuesta del modelo que no contiene JSON válido o no cumple la estructura requerida. |
| Pasos | 1) Simular una respuesta inválida. 2) Ejecutar la validación. 3) Comprobar que no se genere una interpretación válida a partir de datos incorrectos. |
| Resultado esperado | La respuesta se rechaza o se normaliza como error controlado; no se acepta una recomendación inválida. |
| Suite asociada | `tests/unitarias/validar-respuesta.test.js`. |

### CP-NEG-03 — Rango horario no permitido

| Campo | Contenido |
|---|---|
| Requerimiento y HU | Filtro por horario; SEG-3. |
| Tipo | Negativo — unitaria frontend. |
| Precondición | El formulario o función de validación recibe un rango vacío o con formato no permitido. |
| Pasos | 1) Entregar un valor horario vacío o inválido. 2) Ejecutar la validación. 3) Revisar el resultado. |
| Resultado esperado | El valor inválido es rechazado y no se utiliza como filtro válido. |
| Suite asociada | `frontend/tests/unitarias/horario.test.js`. |

### CP-NEG-04 — Geometría de ruta inválida

| Campo | Contenido |
|---|---|
| Requerimiento y HU | Visualización de ruta; SEG-129. |
| Tipo | Negativo — prueba de componente/frontend. |
| Precondición | La función de presentación recibe una geometría ausente o con estructura inválida. |
| Pasos | 1) Entregar una geometría inválida. 2) Ejecutar la normalización. 3) Comprobar la geometría resultante y la distancia presentada. |
| Resultado esperado | La geometría inválida se rechaza o se transforma en un resultado vacío controlado; no se dibuja un recorrido incorrecto. |
| Suite asociada | `frontend/tests/integracion/visualizacion-ruta.test.js`. |

## 7. Prueba manual de extremo a extremo

**ID:** E2E-MAN-01 — Consulta de ruta en dispositivo móvil.  
**Tipo:** Extremo a extremo manual.  
**Precondición:** Aplicación instalada, backend disponible, conexión de red y permiso GPS concedido.

**Pasos:**
1. Abrir RutaSegura en el teléfono.
2. Obtener la ubicación actual mediante GPS.
3. Seleccionar un destino en el mapa.
4. Solicitar el cálculo de rutas.
5. Esperar la respuesta del backend y visualizar las alternativas.
6. Revisar los recorridos y sus datos de distancia/riesgo en el mapa.

**Resultado esperado:** el usuario completa el flujo desde la ubicación/origen hasta la visualización de rutas alternativas sin bloquearse.

El flujo fue realizado manualmente en el teléfono, según la confirmación del equipo. No se incluye una suite E2E automatizada. Para conservar evidencia verificable se debe adjuntar una captura o grabación de la ejecución.

## 8. Pruebas de aceptación

Se consideran tres puntos de control, uno por cada sprint finalizado.

| ID | Alcance de aceptación | Responsable | Criterio de aprobación |
|---|---|---|---|
| AC-01 | Revisión de funcionalidades del Sprint 1. | Profesora guía. | La profesora confirma que las funcionalidades revisadas cumplen lo esperado y da por cerrado el sprint. |
| AC-02 | Revisión de funcionalidades del Sprint 2. | Profesora guía. | La profesora confirma que las funcionalidades revisadas cumplen lo esperado y da por cerrado el sprint. |
| AC-03 | Revisión de funcionalidades del Sprint 3. | Profesora guía. | La profesora confirma que las funcionalidades revisadas cumplen lo esperado y da por cerrado el sprint. |

La profesora guía dio por cerrados los sprints 1, 2 y 3, según lo informado por el equipo. La evidencia disponible para este documento es esa confirmación; no se adjuntó un acta, ticket o correo independiente.

## 9. Trazabilidad con historias de usuario conocidas

| Historia de usuario | Pruebas asociadas |
|---|---|
| SEG-10 — Datos delictuales georreferenciados | B-IT-01 y pruebas de procesamiento de riesgo. |
| SEG-11 — Determinación del nivel de riesgo | B-UT-10, B-UT-14 y B-IT-06. |
| SEG-1 — Mapa de calor | F-UT-03, F-UT-06 y validación visual manual. |
| SEG-41 — Red peatonal georreferenciada | B-IT-05 y B-UT-13. |
| SEG-42 — Clasificación de segmentos | B-UT-03. |
| SEG-43 — Riesgo de segmentos peatonales | B-UT-08, B-UT-10, B-UT-14 y B-IT-06. |
| SEG-44 — Costo de navegación | B-UT-05 y B-UT-06. |
| SEG-45 — Cálculo de rutas | B-UT-01, B-UT-09, B-UT-15, B-IT-08 y B-IT-09. |
| SEG-3 — Filtro por horario | F-UT-04 y B-IT-02. |
| SEG-5 — Selección de origen/destino | F-UT-05, F-IT-01 y E2E-MAN-01. La suite F-UT-05 tiene la limitación indicada en el inventario. |
| SEG-129 — Visualización de ruta | F-IT-02 y E2E-MAN-01. |
| SEG-46 — Interpretación mediante IA | B-UT-04, B-UT-07, B-UT-11, B-UT-17, B-UT-18 y B-IT-03. |
| SEG-4 / SEG-139 — Ubicación y aplicación móvil | E2E-MAN-01. |
| SEG-2 — Consulta de alternativas | B-UT-16, B-IT-09 y E2E-MAN-01. |
