# A7. Modelamiento y decisiones arquitectónicas — RutaSegura

## 1. Stack tecnológico

| Tecnología | Función | Justificación |
|---|---|---|
| JavaScript | Lenguaje de desarrollo | Permite mantener un mismo ecosistema para frontend y backend. |
| React | Interfaz web | Facilita la construcción de componentes reutilizables. |
| React Native + Expo | Aplicación móvil | Permite desarrollar la aplicación móvil aprovechando conocimientos y lógica del ecosistema React. |
| Node.js + Express | Backend y API REST | Facilita la implementación de servicios y la integración con el frontend. |
| Supabase / PostgreSQL | Base de datos | Ofrece almacenamiento relacional, API y facilidad de integración con el backend. |
| Leaflet + OpenStreetMap | Cartografía web | Permite representar información geográfica mediante tecnologías de bajo costo. |
| Google Maps | Cartografía móvil | Se seleccionó por su integración con la aplicación Android. |
| Overpass API | Consulta de red peatonal | Permite obtener información de infraestructura peatonal desde OpenStreetMap. |
| OpenAI API | Interpretación de rutas | Complementa los resultados calculados por el backend mediante explicaciones automáticas. |
| Render | Alojamiento del backend | Alternativa económica para desplegar los servicios del MVP. |
| Expo EAS | Compilación móvil | Facilita generar APK para instalar y probar la aplicación Android. |

## 2. Registro de decisiones arquitectónicas (ADR)

Las siguientes decisiones se basan en la investigación tecnológica realizada al inicio del proyecto. Las matrices presentan una valoración retrospectiva de las alternativas utilizando una escala de 1 a 5.

### ADR-01: Selección de base de datos

**Estado:** Aceptada.

**Contexto:** Se necesitaba una base de datos que permitiera almacenar información delictual y territorial, facilitara la integración con el backend y mantuviera bajos los costos de operación.

**Alternativas:** Supabase/PostgreSQL, PostgreSQL autogestionado y MongoDB Atlas.

**Decisión:** Supabase con PostgreSQL, debido a su plan gratuito, API disponible, facilidad de integración y servicios administrados.

| Criterio | Peso | Supabase | PostgreSQL propio | MongoDB Atlas |
|---|---:|---:|---:|---:|
| Costo | 30 % | 5 | 3 | 4 |
| Modelo de datos | 25 % | 5 | 5 | 3 |
| Integración y API | 25 % | 5 | 3 | 4 |
| Facilidad de despliegue | 20 % | 5 | 2 | 4 |
| **Puntaje ponderado** | **100 %** | **5,00** | **3,30** | **3,75** |

**Consecuencias:** Se simplificó la administración de la base de datos y la conexión con el backend. Se aceptó la dependencia de los límites y condiciones del servicio administrado.

### ADR-02: Selección del ecosistema frontend

**Estado:** Aceptada.

**Contexto:** Se necesitaba desarrollar una versión web y una aplicación móvil evitando mantener ecosistemas tecnológicos completamente independientes.

**Alternativas:** React y React Native, Flutter y desarrollo nativo Android con frontend web independiente.

**Decisión:** React para web y React Native con Expo para móvil, debido a la reutilización de conocimientos, compatibilidad y continuidad del ecosistema JavaScript.

| Criterio | Peso | React / React Native | Flutter | Nativo + web |
|---|---:|---:|---:|---:|
| Reutilización | 35 % | 5 | 3 | 2 |
| Compatibilidad web/móvil | 30 % | 5 | 4 | 4 |
| Facilidad de desarrollo | 20 % | 5 | 3 | 2 |
| Costo de implementación | 15 % | 5 | 4 | 3 |
| **Puntaje ponderado** | **100 %** | **5,00** | **3,45** | **2,75** |

**Consecuencias:** Se facilita compartir conocimientos y lógica entre plataformas, aunque los componentes visuales y ciertas funcionalidades deben implementarse de manera específica para web y móvil.

### ADR-03: Selección del framework de backend

**Estado:** Aceptada.

**Contexto:** Se necesitaba implementar una API para procesar información delictual, consultar la base de datos y calcular rutas peatonales.

**Alternativas:** Node.js con Express, Python con FastAPI y Java con Spring Boot.

**Decisión:** Node.js con Express, debido a su compatibilidad con JavaScript, facilidad de integración y rapidez de desarrollo.

| Criterio | Peso | Node.js / Express | Python / FastAPI | Java / Spring |
|---|---:|---:|---:|---:|
| Compatibilidad tecnológica | 30 % | 5 | 3 | 2 |
| Integración con servicios | 25 % | 5 | 4 | 4 |
| Rapidez de desarrollo | 25 % | 5 | 4 | 3 |
| Facilidad de despliegue | 20 % | 4 | 4 | 3 |
| **Puntaje ponderado** | **100 %** | **4,80** | **3,70** | **2,95** |

**Consecuencias:** Se mantiene continuidad tecnológica entre frontend y backend y se facilita la integración con Supabase y servicios externos.

### ADR-04: Selección de tecnologías cartográficas

**Estado:** Aceptada.

**Contexto:** Se necesitaba incorporar mapas para web y móvil, permitiendo representar delitos, zonas de riesgo y recorridos peatonales, procurando mantener bajos los costos de utilización.

**Alternativas:** OpenStreetMap con Leaflet para web y Google Maps para móvil; Google Maps en ambas plataformas; OpenStreetMap en ambas plataformas.

**Decisión:** Utilizar OpenStreetMap con Leaflet para la versión web y Google Maps para la aplicación móvil. Para obtener la red peatonal se utiliza OpenStreetMap mediante Overpass API.

| Criterio | Peso | Solución híbrida | Google Maps ambas | OSM ambas |
|---|---:|---:|---:|---:|
| Adecuación a plataformas | 30 % | 5 | 4 | 4 |
| Control de costos | 30 % | 4 | 3 | 5 |
| Facilidad de integración | 25 % | 5 | 5 | 3 |
| Flexibilidad | 15 % | 4 | 3 | 5 |
| **Puntaje ponderado** | **100 %** | **4,55** | **3,80** | **4,20** |

**Consecuencias:** Se dispone de una solución cartográfica diferenciada por plataforma. Se aceptan dependencias de servicios externos, sus límites de utilización y posibles costos asociados al consumo.

### ADR-05: Selección de infraestructura de despliegue

**Estado:** Aceptada.

**Contexto:** Se necesitaba publicar el backend y generar una aplicación móvil instalable para realizar pruebas en dispositivos físicos, procurando reducir los costos y la administración de infraestructura.

**Alternativas:** Render con Expo EAS, infraestructura AWS o Google Cloud y servidor virtual autogestionado.

**Decisión:** Render para alojar el backend y Expo EAS para generar compilaciones Android de prueba.

| Criterio | Peso | Render + Expo EAS | AWS / Google Cloud | VPS |
|---|---:|---:|---:|---:|
| Costo inicial | 35 % | 5 | 2 | 4 |
| Facilidad de despliegue | 25 % | 5 | 3 | 2 |
| Integración tecnológica | 20 % | 5 | 3 | 3 |
| Flexibilidad futura | 20 % | 3 | 5 | 3 |
| **Puntaje ponderado** | **100 %** | **4,60** | **3,05** | **3,10** |

**Consecuencias:** Se simplificó el despliegue inicial y la distribución de APK de prueba. Se aceptaron las restricciones del alojamiento seleccionado, manteniendo la posibilidad de migrar a una infraestructura de mayor capacidad si el proyecto crece.

## 3. Modelamiento arquitectónico: UML 4+1

Se seleccionó el enfoque UML 4+1 para representar la arquitectura del sistema mediante cinco vistas complementarias.

| Vista | Diagrama | Contenido |
|---|---|---|
| Escenarios (+1) | Casos de uso | Funcionalidades principales y actores que interactúan con RutaSegura. |
| Lógica | Diagrama de clases | Entidades, atributos, relaciones y responsabilidades. |
| Procesos | Diagrama de secuencia | Interacciones entre frontend, backend, base de datos y servicios externos. |
| Desarrollo | Diagrama de componentes | Organización de módulos y componentes del sistema. |
| Física | Diagrama de despliegue | Dispositivos, servicios e infraestructura utilizada. |

### Archivos de diagramas

Los diagramas y sus fuentes editables se encuentran en `docs/arquitectura/diagramas/`.

