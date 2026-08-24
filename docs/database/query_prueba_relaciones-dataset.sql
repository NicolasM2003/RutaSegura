SELECT
    d.id,
    d.fecha,
    d.rango_horario,
    c.nombre AS clasificacion,
    fd.nombre AS familia_delito,
    gd.nombre AS grupo_delito,
    l.nombre AS lugar,
    co.nombre AS comuna,
    r.nombre AS region,
    d.latitud,
    d.longitud,
    f.nombre AS fuente,
    d.created_at
FROM public.delitos d
JOIN public.clasificaciones c
    ON c.id = d.clasificacion_id
JOIN public.grupos_delitos gd
    ON gd.id = d.grupo_delito_id
JOIN public.familias_delitos fd
    ON fd.id = gd.familia_delito_id
JOIN public.lugares l
    ON l.id = d.lugar_id
JOIN public.comunas co
    ON co.id = d.comuna_id
JOIN public.regiones r
    ON r.id = co.region_id
JOIN public.fuentes f
    ON f.id = d.fuente_id
ORDER BY d.fecha DESC;