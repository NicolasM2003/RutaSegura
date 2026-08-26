# Lógica de clasificación del nivel de riesgo

## Objetivo

Definir la fórmula y los criterios utilizados para transformar los datos delictuales de una zona en un puntaje de riesgo y posteriormente clasificarlo como bajo, medio o alto.

## Fórmula de riesgo

El nivel de riesgo se calculará mediante un puntaje de 0 a 100 compuesto por tres factores:

- Cantidad de delitos: 50%
- Tipo de delito: 30%
- Distribución horaria: 20%

La concentración espacial se utilizará para determinar los eventos que pertenecen a cada zona de análisis.

### Cantidad de delitos

El componente de cantidad se calculará mediante la proporción de delitos registrados en una zona respecto de la zona con mayor cantidad de delitos dentro del conjunto analizado.

`puntaje_cantidad = (delitos_zona / delitos_maximos) × 100`

### Tipo de delito

Cada tipo de delito tendrá un puntaje de gravedad definido por el sistema.

El puntaje de tipo de delito de una zona corresponderá al promedio de los puntajes asociados a los delitos registrados en ella.

Como referencia inicial se utilizarán cuatro niveles de gravedad:

- Baja: 25
- Media: 50
- Alta: 75
- Muy alta: 100

La asignación definitiva de cada grupo o tipo de delito se establecerá mediante el catálogo correspondiente.

### Distribución horaria

El componente horario permitirá determinar cómo se concentra la actividad delictual de una zona durante un período específico.

`puntaje_horario = (delitos_zona_en_horario / delitos_totales_zona) × 100`

Esto permitirá que una misma zona presente diferentes niveles de riesgo dependiendo del horario analizado.

## Puntaje final

El puntaje de riesgo se calculará mediante:

`puntaje_final = (puntaje_cantidad × 0.50) + (puntaje_tipo × 0.30) + (puntaje_horario × 0.20)`

El resultado estará comprendido entre 0 y 100.

## Clasificación del riesgo

El puntaje final será clasificado de la siguiente manera:

| Puntaje | Nivel |
|---|---|
| 0 - 33 | Bajo |
| 34 - 66 | Medio |
| 67 - 100 | Alto |

## Riesgo general y riesgo según horario

El sistema permitirá obtener un nivel de riesgo general para una zona y un nivel de riesgo específico para un rango horario.

Esto permitirá representar situaciones en las que una zona tenga un comportamiento de riesgo diferente durante distintos períodos del día.

## Consideraciones

La fórmula definida en esta etapa establece la lógica inicial de clasificación.

Los pesos y umbrales podrán ser ajustados posteriormente mediante pruebas y validación de resultados, sin modificar la estructura general del modelo.