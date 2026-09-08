# Criterios para calcular el nivel de riesgo

## Objetivo

Definir los criterios que serán utilizados por el sistema para determinar el nivel de riesgo de una zona a partir de los datos delictuales disponibles.

# Criterios 
El cálculo considerará principalmente la **cantidad de delitos**, el **tipo de delito**, la **concentración espacial** de los eventos y su **distribución horaria**. De esta forma, el sistema podrá identificar sectores con mayor o menor concentración delictual y considerar que el nivel de riesgo de una misma zona puede variar dependiendo del horario.

La cantidad de delitos será uno de los factores principales para determinar si una zona presenta un nivel de riesgo **bajo, medio o alto**. Además, se considerará el tipo de delito registrado, permitiendo diferenciar zonas que presenten una cantidad similar de eventos, pero con distintas características delictuales.

El análisis también considerará la concentración espacial de los delitos. Los eventos que se encuentren próximos entre sí podrán ser considerados como parte de una misma zona de análisis, sin limitarse necesariamente a una sola cuadra, ya que una concentración puede abarcar varias calles o cuadras cercanas.

La distribución horaria permitirá analizar cómo cambia el comportamiento delictual durante distintos períodos del día. Por ejemplo, una zona podría presentar un nivel de riesgo bajo durante el día y aumentar a un nivel medio o alto durante la noche si existe una mayor concentración de delitos en esos horarios.

Por lo tanto, el sistema deberá permitir obtener un **nivel de riesgo general de una zona** y también un **nivel de riesgo asociado a un horario determinado**. Esto permitirá considerar situaciones en las que varios delitos se concentren espacialmente en un mismo sector, pero ocurran principalmente en determinados períodos del día.

Los criterios definidos en esta etapa corresponden a la base conceptual para el cálculo del riesgo. La fórmula, ponderaciones, umbrales específicos y metodología definitiva para clasificar las zonas serán definidos posteriormente.