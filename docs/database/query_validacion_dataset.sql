SELECT
    (SELECT COUNT(*) FROM public.delitos) AS total_delitos,

    (
        SELECT COUNT(*)
        FROM public.delitos
        WHERE latitud IS NOT NULL
          AND longitud IS NOT NULL
    ) AS delitos_con_coordenadas,

    (
        SELECT COUNT(*)
        FROM public.delitos d
        LEFT JOIN public.clasificaciones c ON c.id = d.clasificacion_id
        LEFT JOIN public.grupos_delitos g ON g.id = d.grupo_delito_id
        LEFT JOIN public.lugares l ON l.id = d.lugar_id
        LEFT JOIN public.comunas co ON co.id = d.comuna_id
        LEFT JOIN public.fuentes f ON f.id = d.fuente_id
        WHERE c.id IS NULL
           OR g.id IS NULL
           OR l.id IS NULL
           OR co.id IS NULL
           OR f.id IS NULL
    ) AS registros_invalidos,

    (
        SELECT COUNT(DISTINCT co.id)
        FROM public.delitos d
        JOIN public.comunas co ON co.id = d.comuna_id
    ) AS comunas_con_delitos;