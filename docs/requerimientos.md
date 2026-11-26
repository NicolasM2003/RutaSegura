# A2. Requerimientos, alcance del MVP y escenarios de calidad

## 1. Introducción

Este documento establece los requerimientos funcionales y no funcionales de RutaSegura, junto con la delimitación del alcance del Producto Mínimo Viable (MVP).

Los requerimientos funcionales describen las capacidades que debe proporcionar el sistema para cumplir los objetivos específicos definidos en A1. Los requerimientos no funcionales establecen condiciones medibles de calidad para evaluar el comportamiento de la solución en aspectos como seguridad, eficiencia, usabilidad y confiabilidad de la información.

El alcance permite distinguir las funcionalidades incorporadas en el MVP de aquellas que se consideran mejoras o extensiones futuras, evitando atribuir al producto capacidades que no forman parte de la versión desarrollada.

Los requerimientos se identifican mediante códigos únicos para facilitar su relación con las historias de usuario, los casos de prueba y las evidencias del proyecto.

### 1.1. Prioridades

Se utilizan dos niveles de prioridad:

| Prioridad | Significado |
|---|---|
| Must | Requerimiento indispensable para el funcionamiento del MVP y el cumplimiento de sus objetivos. |
| Should | Requerimiento importante que complementa la solución, pero cuya ausencia no impide el funcionamiento de sus capacidades principales. |

---

## 2. Requerimientos funcionales

Los requerimientos funcionales se relacionan con los cuatro objetivos específicos definidos en A1.

| ID | Tipo | Descripción | Prioridad | Objetivo asociado |
|---|---|---|---|---|
| RF-01 | Funcional | El backend debe consultar y entregar desde Supabase los registros delictuales obtenidos desde SIED Territorial, considerando la información disponible para las comunas contempladas en el MVP. | Must | OE-1 |
| RF-02 | Funcional | El sistema debe obtener y utilizar una red peatonal georreferenciada proveniente de OpenStreetMap, mediante consultas a Overpass API, permitiendo recuperar información previamente almacenada cuando se encuentre disponible. | Must | OE-1, OE-3 |
| RF-03 | Funcional | El sistema debe calcular y clasificar el nivel de riesgo de las zonas a partir de los registros delictuales disponibles, asignando una clasificación de riesgo bajo, medio o alto. | Must | OE-2 |
| RF-04 | Funcional | El sistema debe representar en el mapa los delitos individuales y las zonas de riesgo, permitiendo distinguir visualmente la información según su ubicación y clasificación. | Must | OE-2 |
| RF-05 | Funcional | El usuario debe poder seleccionar una comuna y un rango horario para consultar la información correspondiente. El sistema debe actualizar los delitos, las zonas de riesgo y los resultados asociados a las condiciones seleccionadas. | Must | OE-2, OE-3 |
| RF-06 | Funcional | La aplicación debe permitir obtener y visualizar la ubicación actual del usuario cuando este autorice el acceso a la geolocalización. También debe permitir utilizar ubicaciones seleccionadas manualmente cuando la ubicación no esté disponible. | Should | OE-3, OE-4 |
| RF-07 | Funcional | El usuario debe poder buscar una dirección para localizar un punto geográfico y utilizarlo en la consulta del mapa o la selección de un recorrido. | Should | OE-3, OE-4 |
| RF-08 | Funcional | El usuario debe poder seleccionar un punto de origen y un punto de destino para solicitar el cálculo de un recorrido peatonal. | Must | OE-3 |
| RF-09 | Funcional | El sistema debe generar hasta tres alternativas de rutas peatonales, considerando los perfiles de navegación Menor riesgo, Equilibrada y Más rápida, cuando existan recorridos válidos y suficientemente diferenciados. | Must | OE-3 |
| RF-10 | Funcional | El sistema debe presentar la geometría de cada alternativa disponible y sus indicadores de distancia, tiempo estimado, puntaje de riesgo y nivel de riesgo. | Must | OE-3, OE-4 |
| RF-11 | Funcional | El sistema debe proporcionar una interpretación complementaria de las alternativas mediante un servicio de inteligencia artificial, utilizando las métricas calculadas por el backend. Si el servicio de IA no está disponible, las rutas calculadas deben continuar disponibles para el usuario. | Should | OE-3, OE-4 |
| RF-12 | Funcional | La aplicación móvil debe permitir visualizar e interactuar con el mapa, consultar información delictual, aplicar filtros, seleccionar puntos y revisar las alternativas de rutas y sus indicadores. | Must | OE-4 |

### 2.1. Consideraciones de los requerimientos funcionales

**RF-01 — Datos delictuales**

La información delictual utilizada por el sistema proviene de SIED Territorial y se encuentra almacenada en Supabase.

El MVP contempla registros correspondientes a tres comunas: Valparaíso, Viña del Mar y Concón. La información utilizada corresponde a un conjunto histórico y no representa un servicio de actualización delictual en tiempo real.

La incorporación de nuevos registros no se realiza mediante una sincronización automática y continua con SIED Territorial.

**RF-02 — Red peatonal**

La red peatonal se obtiene desde OpenStreetMap mediante consultas a Overpass API. Los datos pueden ser almacenados y recuperados desde Supabase para su utilización en el cálculo de rutas.

Overpass API corresponde al mecanismo de consulta de información de OpenStreetMap, por lo que no se considera una fuente de datos independiente adicional.

**RF-03 y RF-04 — Zonas de riesgo y visualización**

El sistema calcula puntajes de riesgo y clasifica las zonas en tres niveles: bajo, medio y alto.

La visualización contempla tanto los delitos individuales como las zonas de riesgo. Los delitos ubicados en coordenadas idénticas pueden agruparse visualmente según su cantidad, mientras que la clasificación de riesgo se determina de manera independiente mediante el modelo implementado.

**RF-05 — Filtros**

La aplicación contempla seis rangos horarios:

| N.º | Rango horario |
|---|---|
| 1 | 00:00 - 03:59 |
| 2 | 04:00 - 07:59 |
| 3 | 08:00 - 11:59 |
| 4 | 12:00 - 15:59 |
| 5 | 16:00 - 19:59 |
| 6 | 20:00 - 23:59 |

La selección del rango horario modifica la información temporal presentada y los resultados del cálculo de riesgo asociados a la consulta.

**RF-06 y RF-07 — Ubicación y búsqueda**

La aplicación permite trabajar con una ubicación obtenida desde el dispositivo o con puntos seleccionados manualmente en el mapa. También contempla la búsqueda de direcciones mediante un servicio de geocodificación.

**RF-09 — Alternativas de rutas**

El sistema contempla tres perfiles de navegación:

| Perfil | Peso del riesgo | Peso de la distancia |
|---|---:|---:|
| Menor riesgo | 90 % | 10 % |
| Equilibrada | 50 % | 50 % |
| Más rápida | 10 % | 90 % |

El sistema genera hasta tres alternativas, pero no debe forzar la entrega de tres recorridos cuando la red peatonal no permite obtener trayectos válidos y suficientemente diferenciados. Se pueden entregar menos alternativas cuando los recorridos candidatos resultan redundantes.

**RF-10 y RF-11 — Resultados e interpretación**

El backend es responsable del cálculo de las rutas, sus métricas y la comparación entre alternativas.

El servicio de inteligencia artificial cumple una función complementaria: interpreta los resultados calculados y presenta explicaciones para facilitar su comprensión. No calcula ni modifica las rutas.

Si la interpretación automática falla, el sistema debe conservar y presentar las rutas calculadas.

---

## 3. Requerimientos no funcionales

Los requerimientos no funcionales establecen condiciones de calidad que pueden evaluarse mediante escenarios de prueba.

Para el MVP se consideran cuatro atributos principales: seguridad, eficiencia, usabilidad y confiabilidad de la información.

### 3.1. RNF-01 — Seguridad

| Parte | Descripción |
|---|---|
| ID | RNF-01 |
| Tipo | Seguridad |
| Prioridad | Must |
| Objetivo asociado | Transversal |
| Fuente | Cliente externo que utiliza la aplicación o realiza solicitudes a la API. |
| Estímulo | El cliente envía parámetros inválidos o manipulados, como coordenadas fuera de rango, fechas incorrectas o rangos horarios no admitidos. |
| Entorno | Backend desplegado y accesible mediante HTTPS. |
| Respuesta esperada | El sistema valida los parámetros recibidos, rechaza las solicitudes inválidas mediante respuestas controladas y evita exponer información interna, credenciales o detalles sensibles del servidor. |
| Medida de respuesta | El 100 % de los casos negativos definidos para las pruebas debe ser rechazado con una respuesta HTTP de error controlado (4xx). Debe existir cero exposición de claves, credenciales, trazas internas o información sensible en las respuestas entregadas al cliente. |

#### Método de verificación

La seguridad se verificará mediante pruebas negativas sobre los endpoints de la API.

Se considerarán, entre otros, los siguientes escenarios:

- Envío de coordenadas inválidas o fuera de los rangos geográficos permitidos.
- Envío de fechas con formatos incorrectos.
- Envío de rangos horarios no permitidos.
- Envío de parámetros obligatorios incompletos.
- Solicitudes con valores inesperados o manipulados.
- Revisión de las respuestas para comprobar que no incluyan credenciales, claves de servicios, trazas internas ni detalles sensibles de las dependencias.

También se revisará que las credenciales utilizadas para acceder a Supabase y OpenAI se mantengan en variables de entorno y no sean expuestas desde la aplicación móvil ni desde el código público del repositorio.

**Consideración del alcance de seguridad:**

El MVP no contempla cuentas personales ni información privada asociada a perfiles de usuarios. Por lo tanto, este escenario se concentra en la validación de las solicitudes, el manejo controlado de errores y la protección de las credenciales del backend. No se considera como criterio de este MVP la implementación de autenticación de usuarios.

---

### 3.2. RNF-02 — Eficiencia

| Parte | Descripción |
|---|---|
| ID | RNF-02 |
| Tipo | Eficiencia |
| Prioridad | Must |
| Objetivo asociado | Transversal, principalmente OE-2 y OE-3 |
| Fuente | Usuarios que consultan información desde la aplicación móvil. |
| Estímulo | Varios usuarios realizan simultáneamente consultas de información del mapa o solicitudes de generación de rutas. |
| Entorno | Backend desplegado en Render, con el servicio iniciado, conexión disponible con Supabase y datos de prueba preparados. Para las consultas de red peatonal se considera la caché inicializada. |
| Respuesta esperada | El backend procesa las solicitudes y entrega los resultados dentro de los tiempos establecidos, manteniendo una tasa de errores inferior al límite definido. |
| Medida de respuesta | Para consultas de información del mapa, p95 ≤ 5 segundos. Para solicitudes de rutas alternativas, p95 ≤ 20 segundos. La tasa de errores debe ser inferior al 1 % con cinco usuarios concurrentes. |

#### Método de verificación

La eficiencia se evaluará mediante una prueba de carga controlada sobre el backend desplegado.

Se considerarán dos tipos de operaciones:

**A. Consulta de información del mapa**

Se realizarán solicitudes a los endpoints encargados de entregar delitos y zonas de riesgo, utilizando parámetros de consulta definidos y datos de las comunas contempladas en el MVP.

La meta es:

- Percentil 95 de respuesta igual o inferior a 5 segundos.
- Tasa de errores inferior al 1 %.
- Cinco usuarios concurrentes.

**B. Consulta de rutas alternativas**

Se realizarán solicitudes al endpoint de generación de rutas alternativas, utilizando escenarios de origen y destino previamente definidos.

La meta es:

- Percentil 95 de respuesta igual o inferior a 20 segundos.
- Tasa de errores inferior al 1 %.
- Cinco usuarios concurrentes.

En ambos escenarios se registrarán los tiempos de respuesta, las solicitudes exitosas, los errores y las condiciones de ejecución.

La medición se realizará después del arranque inicial del servicio para evitar que el tiempo de activación del entorno de alojamiento distorsione los resultados. También se documentará el estado de la caché, ya que su utilización puede influir en los tiempos de consulta.

En las consultas de rutas se considerará el tiempo de respuesta completo que recibe el cliente, incluida la interpretación de IA cuando esté disponible. Si se produce un fallo del servicio de IA, se verificará que las rutas calculadas continúen disponibles y se registrará la condición de ejecución.

El número de solicitudes, la distribución de concurrencia y las herramientas utilizadas se detallarán en el plan de pruebas correspondiente a A5.

---

### 3.3. RNF-03 — Usabilidad

| Parte | Descripción |
|---|---|
| ID | RNF-03 |
| Tipo | Usabilidad |
| Prioridad | Must |
| Objetivo asociado | OE-4 |
| Fuente | Usuario peatón que utiliza la aplicación móvil sin conocimientos técnicos especializados. |
| Estímulo | El usuario necesita identificar zonas de riesgo, consultar una ruta, comparar alternativas y aplicar filtros horarios. |
| Entorno | Aplicación móvil Android del MVP. |
| Respuesta esperada | La aplicación permite completar las tareas principales mediante controles comprensibles y una presentación clara de la información. |
| Medida de respuesta | Al menos el 80 % de los participantes debe completar correctamente las cuatro tareas de usabilidad sin recibir asistencia. Para una muestra de cinco participantes, al menos cuatro deben completar todas las tareas. |

#### Método de verificación

La usabilidad se evaluará mediante sesiones individuales con cinco participantes, procurando incluir personas que se hayan trasladado recientemente desde otra comuna o región, al menos una persona mayor y peatones que realicen desplazamientos nocturnos.

Durante cada sesión se solicitará realizar las siguientes tareas:

1. Identificar zonas de alto riesgo en el mapa.
2. Consultar una ruta entre un origen y un destino.
3. Comparar las alternativas de ruta y sus indicadores de riesgo.
4. Aplicar un filtro horario y comprender los cambios producidos en el mapa.

Para la tercera tarea se utilizará un escenario de consulta que permita disponer de alternativas comparables cuando la red peatonal lo permita.

Se registrará el cumplimiento de cada tarea, la necesidad de asistencia, el tiempo empleado, las dificultades encontradas y las observaciones de los participantes.

Para cumplir la meta, al menos cuatro de los cinco participantes deberán completar correctamente las cuatro tareas sin asistencia.

---

### 3.4. RNF-04 — Confiabilidad de la información

| Parte | Descripción |
|---|---|
| ID | RNF-04 |
| Tipo | Confiabilidad |
| Prioridad | Must |
| Objetivo asociado | OE-1 y OE-2 |
| Fuente | Usuario que consulta información delictual y territorial mediante la aplicación. |
| Estímulo | El usuario solicita información delictual filtrada por comuna y rango horario. |
| Entorno | Aplicación conectada al backend y a la base de datos Supabase. |
| Respuesta esperada | El sistema presenta los registros que corresponden a los filtros solicitados y mantiene la consistencia entre los datos entregados por el backend y su representación en el mapa. |
| Medida de respuesta | El 100 % de los casos de prueba controlados debe presentar los registros correspondientes a los filtros aplicados, sin incorporar registros ajenos al escenario evaluado. |

#### Método de verificación

La confiabilidad de la información se verificará mediante escenarios de prueba controlados que consideren distintas comunas y rangos horarios.

Se realizarán las siguientes comprobaciones:

- Comparar los registros esperados con los devueltos por el backend.
- Verificar que los registros correspondan a la comuna seleccionada.
- Comprobar que los registros pertenezcan al rango horario solicitado.
- Comprobar que los datos representados en el mapa correspondan a la información entregada por el backend.
- Verificar que al modificar los filtros se actualice la información presentada sin conservar registros ajenos a la nueva consulta.

El resultado se calculará mediante la siguiente relación:

**Porcentaje de casos correctos = (Casos de prueba que cumplen las condiciones esperadas / Total de casos de prueba ejecutados) × 100**

La meta corresponde al 100 % de los casos controlados ejecutados.

Este requerimiento evalúa la consistencia de la información procesada y presentada por el sistema. No garantiza por sí solo que cada coordenada obtenida desde la fuente original esté asociada geográficamente de manera exacta a su respectivo registro delictual. Esa limitación se documenta en A1.

---

## 4. Alcance del MVP

El MVP de RutaSegura contempla las funcionalidades necesarias para consultar información delictual georreferenciada, identificar zonas de riesgo y generar alternativas de desplazamiento peatonal considerando criterios de seguridad y distancia.

La cobertura y las funcionalidades incluidas se delimitan de acuerdo con la versión desarrollada y validada durante los sprints del proyecto.

### 4.1. Funcionalidades incluidas

| Elemento | Decisión | Justificación |
|---|---|---|
| Integración de datos delictuales desde SIED Territorial | Incluido | Proporciona los antecedentes delictuales necesarios para el cálculo y visualización del riesgo. |
| Almacenamiento y consulta de datos mediante Supabase | Incluido | Permite disponer de la información delictual y territorial utilizada por el sistema. |
| Integración de red peatonal de OpenStreetMap | Incluido | Proporciona la infraestructura geográfica necesaria para calcular los recorridos. |
| Visualización de delitos individuales en el mapa | Incluido | Permite reconocer la distribución geográfica de los antecedentes delictuales. |
| Cálculo y representación de zonas de riesgo | Incluido | Permite identificar sectores clasificados según el modelo de riesgo de RutaSegura. |
| Filtros por comuna y horario | Incluido | Permite consultar la información territorial de acuerdo con el contexto del desplazamiento. |
| Geolocalización del usuario | Incluido | Facilita la identificación de la ubicación desde la cual se desea consultar información. |
| Selección manual de origen y destino | Incluido | Permite definir los puntos necesarios para solicitar un recorrido. |
| Búsqueda de direcciones | Incluido | Facilita encontrar ubicaciones para centrar el mapa y seleccionar puntos. |
| Generación de rutas alternativas | Incluido | Permite comparar recorridos según criterios de seguridad y distancia. |
| Perfiles de navegación | Incluido | Permite seleccionar entre Menor riesgo, Equilibrada y Más rápida. |
| Visualización de indicadores de rutas | Incluido | Permite comparar distancia, tiempo estimado, puntaje y nivel de riesgo. |
| Interpretación complementaria mediante IA | Incluido | Facilita la comprensión de las diferencias entre las alternativas calculadas. |
| Interfaz móvil mediante React Native y Expo | Incluido | Permite utilizar las funcionalidades principales desde un dispositivo móvil. |
| Compilación Android de prueba mediante Expo EAS | Incluido | Permite instalar y validar la aplicación móvil en un dispositivo Android. |
| Backend desplegado en Render | Incluido | Permite que la aplicación móvil consulte los servicios del sistema en un entorno accesible. |

### 4.2. Cobertura territorial incluida

La cobertura del MVP considera las siguientes comunas de la Región de Valparaíso:

| Comuna | Información contemplada |
|---|---|
| Valparaíso | Registros delictuales y red peatonal disponible. |
| Viña del Mar | Registros delictuales y red peatonal disponible. |
| Concón | Registros delictuales y red peatonal disponible. |

La cobertura corresponde a los sectores urbanos contemplados en el conjunto de información utilizado para el MVP. No representa la totalidad de la Región de Valparaíso ni implica que todos sus sectores cuenten con la misma disponibilidad de información.

### 4.3. Funcionalidades excluidas y mejoras futuras

| Elemento | Decisión | Justificación |
|---|---|---|
| Consulta de delitos en tiempo real | Excluido, versión futura | El sistema trabaja con registros históricos y no dispone de una fuente de actualización en tiempo real. |
| Alertas automáticas ante delitos recientes | Excluido, versión futura | No se contempla un mecanismo de recepción y notificación de nuevos hechos delictuales. |
| Reportes de delitos realizados por usuarios | Excluido, versión futura | El MVP utiliza información obtenida desde fuentes definidas y no incorpora reportes ciudadanos. |
| Registro e inicio de sesión de usuarios | Excluido, versión futura | No se contempla administración de cuentas ni perfiles personales. |
| Historial personalizado de recorridos | Excluido, versión futura | El sistema no almacena un historial personal de desplazamientos de los usuarios. |
| Navegación activa paso a paso | Excluido, versión futura | El MVP permite consultar y visualizar rutas, pero no guía al usuario durante el recorrido en tiempo real. |
| Seguimiento continuo del desplazamiento | Excluido, versión futura | No se implementa seguimiento permanente del usuario a lo largo de una ruta. |
| Cobertura de otras comunas o regiones | Excluido, versión futura | La disponibilidad de datos y red peatonal del MVP se limita a Valparaíso, Viña del Mar y Concón. |
| Incorporación automática de nuevos registros delictuales | Excluido, versión futura | La carga inicial de información no equivale a un proceso automatizado de actualización continua. |
| Optimización específica para accesibilidad universal | Excluido, versión futura | Aunque se dispone de atributos de la red peatonal, el cálculo actual no optimiza recorridos según todas las condiciones de accesibilidad. |
| Consideración de iluminación y presencia policial en tiempo real | Excluido, versión futura | Estas variables no forman parte de los datos utilizados por el modelo actual. |
| Publicación en Google Play o App Store | Excluido | La entrega contempla una compilación Android de prueba instalada mediante APK, no una publicación en tiendas. |
| Publicación de una versión web como entregable del Hito 3 | Excluido | El incremento y la validación de este hito se enfocan en la aplicación móvil Android. |

### 4.4. Atributos de calidad considerados para versiones futuras

Además de los requerimientos no funcionales definidos para el MVP, se identifican otros atributos que podrán abordarse en futuras versiones.

| Atributo | Decisión | Justificación |
|---|---|---|
| Alta disponibilidad | Excluido, versión futura | El MVP no contempla una arquitectura redundante, un acuerdo de nivel de servicio (SLA) ni mecanismos de recuperación que permitan comprometer un porcentaje específico de disponibilidad. |
| Escalabilidad | Excluido, versión futura | El MVP se evalúa bajo una carga controlada de cinco usuarios concurrentes. No se ha definido ni validado una estrategia de escalamiento horizontal para volúmenes mayores de usuarios o datos. |

Estos atributos podrán ser incorporados posteriormente mediante requerimientos específicos, métricas y escenarios de prueba que permitan comprobar su cumplimiento.

### 4.5. Limitaciones del MVP

El uso de RutaSegura presenta las siguientes limitaciones:

- La información delictual corresponde a registros históricos y no refleja necesariamente las condiciones actuales de seguridad.
- La cobertura territorial depende de la disponibilidad de los datos delictuales y de la red peatonal utilizada.
- El modelo de riesgo corresponde a una metodología implementada en el proyecto y no debe interpretarse como una probabilidad real de sufrir un delito ni como una fórmula oficial de una institución policial.
- La aplicación no considera acontecimientos recientes, iluminación actual, presencia policial ni otras condiciones externas que puedan modificar el riesgo de un recorrido.
- El cálculo de rutas depende de la conectividad y de la disponibilidad de información de la red peatonal.
- El servicio de inteligencia artificial es complementario. Su indisponibilidad no debe impedir la consulta de las rutas calculadas.
- La aplicación requiere un dispositivo compatible, conexión a internet y, cuando se utiliza la ubicación actual, permisos de geolocalización.
- La aplicación proporciona información de apoyo a la toma de decisiones, pero no garantiza que un recorrido esté libre de riesgo.

---

## 5. Relación entre requerimientos y objetivos

La siguiente matriz resume la relación entre los requerimientos definidos y los objetivos específicos de A1.

### 5.1. Requerimientos funcionales

| Requerimiento | OE-1 | OE-2 | OE-3 | OE-4 |
|---|:---:|:---:|:---:|:---:|
| RF-01. Consulta de datos delictuales | X | | | |
| RF-02. Red peatonal georreferenciada | X | | X | |
| RF-03. Cálculo y clasificación de riesgo | | X | | |
| RF-04. Visualización de delitos y zonas | | X | | |
| RF-05. Filtros por comuna y horario | | X | X | |
| RF-06. Geolocalización y selección manual | | | X | X |
| RF-07. Búsqueda de direcciones | | | X | X |
| RF-08. Selección de origen y destino | | | X | |
| RF-09. Generación de alternativas | | | X | |
| RF-10. Indicadores de las rutas | | | X | X |
| RF-11. Interpretación mediante IA | | | X | X |
| RF-12. Interfaz móvil | | | | X |

### 5.2. Requerimientos no funcionales

| Requerimiento | OE-1 | OE-2 | OE-3 | OE-4 |
|---|:---:|:---:|:---:|:---:|
| RNF-01. Seguridad | X | X | X | X |
| RNF-02. Eficiencia | X | X | X | X |
| RNF-03. Usabilidad | | | | X |
| RNF-04. Confiabilidad de la información | X | X | | |

Los requerimientos no funcionales RNF-01 y RNF-02 son transversales, ya que establecen condiciones de seguridad y eficiencia que afectan al funcionamiento general del sistema.

---

## 6. Criterios de verificación y relación con otros artefactos

Los requerimientos definidos en este documento se utilizarán como referencia para los siguientes artefactos del Hito 3:

| Artefacto | Relación con A2 |
|---|---|
| A1 — Problema, hipótesis y objetivos medibles | Establece los objetivos a los que contribuyen los requerimientos. |
| A3 — Historias de usuario y criterios de aceptación | Detalla las condiciones específicas que permiten comprobar el cumplimiento de los requerimientos. |
| A4 — Matriz de trazabilidad | Relaciona cada requerimiento con los objetivos, historias de usuario, casos de prueba y evidencias. |
| A5 — Plan de pruebas y evidencia de ejecución | Define y registra las pruebas utilizadas para verificar los requerimientos funcionales, la confiabilidad de la información y los escenarios de usabilidad. |
| A6 — Reportes de seguridad y eficiencia | Presenta los resultados de las evaluaciones de seguridad y eficiencia, incluyendo los escenarios RNF-01 y RNF-02. |

Los requerimientos funcionales se verificarán mediante casos de prueba asociados a sus respectivas historias de usuario.

Los requerimientos no funcionales se comprobarán mediante pruebas específicas:

- Seguridad: pruebas negativas de validación de entradas y revisión de exposición de información sensible.
- Eficiencia: pruebas de carga y medición de tiempos de respuesta.
- Usabilidad: sesiones individuales con participantes y registro de cumplimiento de tareas.
- Confiabilidad: escenarios controlados para comprobar la consistencia de los registros, filtros y representación de información.

Los resultados deberán documentarse indicando las condiciones de ejecución, los indicadores obtenidos y las evidencias correspondientes.

La definición de un requerimiento en este documento no implica que su cumplimiento se encuentre demostrado. Su estado deberá respaldarse mediante las pruebas y evidencias registradas en los artefactos correspondientes.