# Estructura de los datos delictuales

## Objetivo

Definir la estructura de los datos que serán utilizados en el sistema, estableciendo qué información se almacenará y qué tipo de dato tendrá cada campo. Esto permitirá determinar de forma clara la información que será procesada en las etapas posteriores del sistema.


## Estructura de los datos
| Campo       | Tipo de dato | Descripcion                                                | Obligatorio |
|-------------|--------------|------------------------------------------------------------|-------------|
| id          | UUID         | Identificador unico del registro del delito                | si          |
| tipo_delito | VARCHAR      | Clasificacion del delito                                   | si          |
| fecha       | DATE         | Fecha en que ocurrio el delito                             | si          |
| hora        | TIME         | Hora del delito, cuando este disponible                    | no          |
| latitud     | DECIMAL      | Coordenada geografica del delito                           | si          |
| longitud    | DECIMAL      | Coordenada geografica del delito                           | si          |
| comuna      | VARCHAR      | Comuna donde ocurrio el delito                             | si          |
| direccion   | VARCHAR      | Direccion o referencia del lugar del delito                | no          |
| fuente      | VARCHAR      | Procedencia del registro delictual                         | si          |
| created_at  | TIMESTAMP    | Fecha y hora en la que se ingreso el registro del delito   | si          |

## Consideracion al crear la estructura:

La estructura que se define para la entrada inicial de los datos, se contempla la informacion del tipo de delito, ubicacion geografica y temporal de cada vento delictual.
Los campos de hora y dirccion se consideran opcionales debido a que la fuente de datos podria no proporcionar esta informacion en todos los registros que se entreguen.