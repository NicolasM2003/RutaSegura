# Estructura de los datos delictuales

## Objetivo

Definir la estructura de los datos que serán utilizados en el sistema, estableciendo qué información se almacenará, qué representa cada variable y qué tipo de dato tendrá cada campo. Esto permitirá determinar de forma clara la información que será procesada en las etapas posteriores del sistema.

## Estructura de los datos

| Campo | Tipo de dato | Descripción | Obligatorio |
|---|---|---|---|
| `id` | UUID | Identificador único del registro delictual | Sí |
| `lugar_id` | UUID | Identificador del tipo de lugar asociado al delito | Sí |
| `fecha` | DATE | Fecha en que ocurrió el delito | Sí |
| `rango_horario` | VARCHAR | Rango horario en el que ocurrió el delito | Sí |
| `clasificacion_id` | UUID | Identificador de la clasificación asociada al registro | Sí |
| `grupo_delito_id` | UUID | Identificador del grupo o subgrupo del delito | Sí |
| `comuna_id` | UUID | Identificador de la comuna donde ocurrió el delito | Sí |
| `latitud` | DECIMAL | Coordenada geográfica asociada al registro delictual | No |
| `longitud` | DECIMAL | Coordenada geográfica asociada al registro delictual | No |
| `fuente_id` | UUID | Identificador de la fuente de procedencia del registro | Sí |
| `created_at` | TIMESTAMPTZ | Fecha y hora en que se ingresó el registro al sistema | Sí |

## Consideraciones al crear la estructura

La estructura definida contempla información de identificación, clasificación del delito, ubicación geográfica, ubicación territorial y temporal de cada evento delictual.

La información temporal se almacena mediante un rango horario, debido a que los datos pueden representar intervalos de tiempo y no necesariamente una hora exacta.

Las categorías delictuales, los tipos de lugares, las clasificaciones, las comunas y las fuentes se gestionan mediante referencias a entidades relacionadas, permitiendo mantener una estructura organizada y escalable.

Las coordenadas geográficas se almacenan como atributos del evento delictual y actualmente se consideran opcionales mientras se valida su correspondencia exacta con cada registro.

El campo `created_at` corresponde a información generada por el sistema y representa la fecha y hora en que el registro fue incorporado a la base de datos.

## Información relevante

La estructura de almacenamiento se organiza mediante varias tablas relacionadas con el objetivo de mantener una mejor organización de la información, evitar duplicidad de datos y permitir la escalabilidad del sistema.

Las principales entidades relacionadas con los eventos delictuales son:

- `regiones`
- `comunas`
- `clasificaciones`
- `familias_delitos`
- `grupos_delitos`
- `lugares`
- `fuentes`
- `delitos`

La relación entre los grupos y las familias de delitos se mantiene mediante:

`delitos → grupos_delitos → familias_delitos`

De esta forma, la familia del delito no necesita almacenarse directamente en cada registro de `delitos`.

## Descripción de las variables

### `id`

Identificador único asignado a cada registro delictual dentro del sistema. Se utiliza para distinguir cada registro de manera individual y evitar duplicidades.

### `lugar_id`

Identificador que referencia al tipo de lugar asociado al evento delictual.

Permite relacionar el registro con la tabla `lugares`, donde se almacenan los distintos tipos de lugares.

### `fecha`

Corresponde a la fecha en que ocurrió el evento delictual.

Esta variable permitirá realizar análisis temporales y agrupar los eventos por día, semana, mes u otros períodos.

### `rango_horario`

Representa el intervalo de tiempo en el que ocurrió el evento delictual.

Ejemplo: `12:00 - 15:59`

Esta variable permitirá analizar la distribución temporal de los delitos según distintos períodos del día.

### `clasificacion_id`

Identificador que referencia la clasificación asociada al registro.

Permite relacionar el evento con la tabla `clasificaciones`, donde se almacenan las distintas clasificaciones disponibles.

### `grupo_delito_id`

Identificador que referencia al grupo o subgrupo específico del delito.

Permite relacionar el evento con la tabla `grupos_delitos`.

El grupo se encuentra asociado a una familia de delitos.

### `comuna_id`

Identificador que referencia a la comuna en la que se registró el evento delictual.

Permite relacionar el delito con la estructura territorial del sistema y posteriormente realizar agrupaciones y análisis geográficos.

### `latitud`

Representa la coordenada geográfica asociada al evento delictual.

Esta variable permitirá ubicar espacialmente los eventos y utilizar posteriormente la información en la visualización y análisis geográfico.

Su correspondencia exacta con cada registro se encuentra pendiente de validación.

### `longitud`

Representa la coordenada geográfica asociada al evento delictual.

Esta variable, junto con `latitud`, permitirá ubicar espacialmente los eventos y utilizar posteriormente la información en la visualización y análisis geográfico.

Su correspondencia exacta con cada registro se encuentra pendiente de validación.

### `fuente_id`

Identificador que referencia la procedencia del registro almacenado.

Permite mantener trazabilidad sobre la fuente de información utilizada por el sistema.

### `created_at`

Corresponde a la fecha y hora en que el registro fue incorporado al sistema.

Se utiliza como información interna para mantener un control temporal sobre el almacenamiento de cada registro.

Este campo es generado por el sistema y no corresponde a la fecha en que ocurrió el delito.