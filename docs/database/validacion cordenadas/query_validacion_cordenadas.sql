##primera consulta para la validacion de coordenadas##

SELECT
    COUNT(*) AS total_registros,

    COUNT(*) FILTER (
        WHERE latitud IS NOT NULL
          AND longitud IS NOT NULL
    ) AS con_coordenadas,

    COUNT(*) FILTER (
        WHERE latitud IS NULL
           OR longitud IS NULL
    ) AS coordenadas_nulas,

    COUNT(*) FILTER (
        WHERE latitud IS NOT NULL
          AND (latitud < -90 OR latitud > 90)
    ) AS latitudes_fuera_de_rango,

    COUNT(*) FILTER (
        WHERE longitud IS NOT NULL
          AND (longitud < -180 OR longitud > 180)
    ) AS longitudes_fuera_de_rango,

    COUNT(*) FILTER (
        WHERE latitud IS NOT NULL
          AND longitud IS NOT NULL
          AND latitud BETWEEN -90 AND 90
          AND longitud BETWEEN -180 AND 180
    ) AS coordenadas_validas
FROM public.delitos;



##segunda consulta para la validacion de coordenadas##
SELECT
    d.id,
    d.fecha,
    d.latitud,
    d.longitud,
    c.nombre AS comuna
FROM public.delitos d
JOIN public.comunas c
    ON c.id = d.comuna_id
ORDER BY d.fecha DESC
LIMIT 10;