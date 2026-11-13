
const METROS_POR_GRADO_LATITUD = 111320;

const proyectarPuntoSobreSegmento = (
  latitud,
  longitud,
  nodoA,
  nodoB
) => {
  const lat = Number(latitud);
  const lon = Number(longitud);
  const latA = Number(nodoA?.latitud);
  const lonA = Number(nodoA?.longitud);
  const latB = Number(nodoB?.latitud);
  const lonB = Number(nodoB?.longitud);

  if (![lat, lon, latA, lonA, latB, lonB].every(Number.isFinite)) {
    return null;
  }

  const latitudRad = (lat * Math.PI) / 180;
  const escalaX = METROS_POR_GRADO_LATITUD * Math.cos(latitudRad);
  const escalaY = METROS_POR_GRADO_LATITUD;

  if (Math.abs(escalaX) < 0.01) return null;

  const ax = (lonA - lon) * escalaX;
  const ay = (latA - lat) * escalaY;
  const bx = (lonB - lon) * escalaX;
  const by = (latB - lat) * escalaY;

  const dx = bx - ax;
  const dy = by - ay;

  const longitudCuadrada = dx * dx + dy * dy;

  if (longitudCuadrada <= 0) return null;

  const fraccion = Math.max(
    0,
    Math.min(
      1,
      -(ax * dx + ay * dy) / longitudCuadrada
    )
  );

  const xProyectado = ax + fraccion * dx;
  const yProyectado = ay + fraccion * dy;

  return {
    fraccion,
    punto: {
      latitud: lat + yProyectado / escalaY,
      longitud: lon + xProyectado / escalaX
    },
    distancia_proyeccion_metros: Number(
      Math.hypot(xProyectado, yProyectado).toFixed(2)
    )
  };
};

const obtenerAristaMasCercanaEnGrafo = (
  nodos,
  aristas,
  latitud,
  longitud
) => {
  if (!Array.isArray(nodos) || !Array.isArray(aristas)) {
    return null;
  }

  const nodosPorId = new Map(
    nodos.map((nodo) => [nodo.id, nodo])
  );

  let mejorResultado = null;
  let distanciaMinima = Infinity;

  for (const arista of aristas) {
    const nodoOrigen = nodosPorId.get(arista?.nodo_origen);
    const nodoDestino = nodosPorId.get(arista?.nodo_destino);

    if (!nodoOrigen || !nodoDestino) {
      continue;
    }

    const proyeccion = proyectarPuntoSobreSegmento(
      latitud,
      longitud,
      nodoOrigen,
      nodoDestino
    );

    if (!proyeccion) {
      continue;
    }

    if (proyeccion.distancia_proyeccion_metros < distanciaMinima) {
      distanciaMinima = proyeccion.distancia_proyeccion_metros;

      mejorResultado = {
        arista,
        nodo_origen: nodoOrigen,
        nodo_destino: nodoDestino,
        fraccion: proyeccion.fraccion,
        punto: proyeccion.punto,
        distancia_proyeccion_metros: distanciaMinima,
      };
    }
  }

  return mejorResultado;
};

const integrarProyeccionesEnGrafo = (
  nodos,
  aristas,
  proyecciones
) => {
  if (
    !Array.isArray(nodos) ||
    !Array.isArray(aristas) ||
    !Array.isArray(proyecciones)
  ) {
    return null;
  }

  const nodosResultado = nodos.map((nodo) => ({
    ...nodo,
    conexiones: [],
  }));

  const nodosPorId = new Map(
    nodosResultado.map((nodo) => [nodo.id, nodo])
  );

  const aristasOriginales = new Set(aristas);
  const proyeccionesPorArista = new Map();
  const nodosPorProyeccion = {};
  const idsProyeccion = new Set();

  // Agrupar las proyecciones por su arista original.
  for (const proyeccion of proyecciones) {
    if (
      !proyeccion?.id ||
      idsProyeccion.has(proyeccion.id) ||
      !aristasOriginales.has(proyeccion.arista)
    ) {
      return null;
    }

    idsProyeccion.add(proyeccion.id);

    const fraccion = Number(proyeccion.fraccion);
    const latitud = Number(proyeccion.punto?.latitud);
    const longitud = Number(proyeccion.punto?.longitud);

    if (
      !Number.isFinite(fraccion) ||
      fraccion < 0 ||
      fraccion > 1 ||
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud)
    ) {
      return null;
    }

    if (!nodosPorProyeccion[proyeccion.id]) {
      nodosPorProyeccion[proyeccion.id] = null;
    }

    if (!proyeccionesPorArista.has(proyeccion.arista)) {
      proyeccionesPorArista.set(proyeccion.arista, []);
    }

    proyeccionesPorArista.get(proyeccion.arista).push({
      id: proyeccion.id,
      fraccion,
      latitud,
      longitud,
    });
  }

  // Crear los nodos virtuales y resolver posiciones coincidentes.
  for (const [arista, elementos] of proyeccionesPorArista) {
    const elementosOrdenados = [...elementos].sort(
      (a, b) => a.fraccion - b.fraccion
    );

    const puntosUnicos = [];

    for (const elemento of elementosOrdenados) {
      let puntoExistente = puntosUnicos.find(
        (punto) =>
          Math.abs(punto.fraccion - elemento.fraccion) < 1e-9
      );

      if (!puntoExistente) {
        let nodoId;

        if (elemento.fraccion === 0) {
          nodoId = arista.nodo_origen;
        } else if (elemento.fraccion === 1) {
          nodoId = arista.nodo_destino;
        } else {
          nodoId = `virtual:${encodeURIComponent(elemento.id)}`;

          let sufijo = 1;

          while (nodosPorId.has(nodoId)) {
            nodoId = `virtual:${encodeURIComponent(elemento.id)}:${sufijo++}`;
          }

          const nuevoNodo = {
            id: nodoId,
            latitud: elemento.latitud,
            longitud: elemento.longitud,
            conexiones: [],
            es_nodo_virtual: true,
          };

          nodosResultado.push(nuevoNodo);
          nodosPorId.set(nodoId, nuevoNodo);
        }

        puntoExistente = {
          fraccion: elemento.fraccion,
          nodo_id: nodoId,
        };

        puntosUnicos.push(puntoExistente);
      }

      nodosPorProyeccion[elemento.id] =
        puntoExistente.nodo_id;
    }
  }

  const aristasResultado = [];

  // Dividir cada arista una sola vez, usando todas sus proyecciones.
  aristas.forEach((arista, indiceArista) => {
    const elementos = proyeccionesPorArista.get(arista) || [];

    if (elementos.length === 0) {
      aristasResultado.push(arista);
      return;
    }

    const puntos = [
      {
        fraccion: 0,
        nodo_id: arista.nodo_origen,
      },
      ...elementos
        .map((elemento) => ({
          fraccion: elemento.fraccion,
          nodo_id: nodosPorProyeccion[elemento.id],
        }))
        .filter(
          (punto) =>
            punto.fraccion > 0 &&
            punto.fraccion < 1
        ),
      {
        fraccion: 1,
        nodo_id: arista.nodo_destino,
      },
    ];

    const puntosOrdenados = puntos.sort(
      (a, b) => a.fraccion - b.fraccion
    );

    const distanciaOriginal = Number(arista.distancia_metros);

    if (
      !Number.isFinite(distanciaOriginal) ||
      distanciaOriginal <= 0
    ) {
      return;
    }

    if (puntosOrdenados.length === 2) {
      aristasResultado.push(arista);
      return;
    }

    for (let i = 0; i < puntosOrdenados.length - 1; i++) {
      const inicio = puntosOrdenados[i];
      const fin = puntosOrdenados[i + 1];

      const proporcion = fin.fraccion - inicio.fraccion;

      if (proporcion <= 0) {
        continue;
      }

      const escalarCosto = (valor) => {
        if (valor == null) return valor;

        const numero = Number(valor);

        return Number.isFinite(numero)
          ? Number((numero * proporcion).toFixed(4))
          : valor;
      };

      aristasResultado.push({
        ...arista,

        id: `${arista.id ?? `arista-${indiceArista}`}:parte:${i + 1}`,

        nodo_origen: inicio.nodo_id,
        nodo_destino: fin.nodo_id,

        distancia_metros: Number(
          (distanciaOriginal * proporcion).toFixed(4)
        ),

        costo_riesgo: escalarCosto(arista.costo_riesgo),
        costo_distancia: escalarCosto(arista.costo_distancia),
        costo_arista: escalarCosto(arista.costo_arista),
        costo_arista_operativo: escalarCosto(
          arista.costo_arista_operativo
        ),
      });
    }
  });

  // Reconstruir las conexiones bidireccionales.
  const conexiones = new Map(
    nodosResultado.map((nodo) => [nodo.id, new Set()])
  );

  for (const arista of aristasResultado) {
    conexiones.get(arista.nodo_origen)?.add(arista.nodo_destino);
    conexiones.get(arista.nodo_destino)?.add(arista.nodo_origen);
  }

  for (const nodo of nodosResultado) {
    nodo.conexiones = Array.from(conexiones.get(nodo.id) || []);
  }

  return {
    nodos: nodosResultado,
    aristas: aristasResultado,
    nodos_por_proyeccion: nodosPorProyeccion,
  };
};

const crearSegmentoConexion = ({
  id,
  coordenadaSeleccionada,
  puntoProyectado,
  distanciaMetros,
  aristaReferencia,
}) => {
  const distancia = Number(distanciaMetros);
  const riesgo = Number(aristaReferencia?.puntaje_riesgo);

  const coordenadasValidas = [
    coordenadaSeleccionada?.latitud,
    coordenadaSeleccionada?.longitud,
    puntoProyectado?.latitud,
    puntoProyectado?.longitud,
  ].every((valor) => Number.isFinite(Number(valor)));

  if (
    !id ||
    !coordenadasValidas ||
    !Number.isFinite(distancia) ||
    distancia <= 0 ||
    !Number.isFinite(riesgo) ||
    !aristaReferencia
  ) {
    return null;
  }

  return {
    id: `conector-${id}`,
    id_osm: null,
    tipo: "conector_no_mapeado",
    es_conector: true,

    distancia_metros: Number(distancia.toFixed(2)),

    // Estimación basada en la arista peatonal de referencia.
    puntaje_riesgo: riesgo,
    nivel_riesgo: aristaReferencia.nivel_riesgo ?? "No disponible",
    riesgo_estimado: true,
    arista_referencia_id: aristaReferencia.id,

    // No se atribuyen zonas de riesgo sin calcular su intersección real.
    zonas_intersectadas: [],

    inicio: [
      Number(coordenadaSeleccionada.latitud),
      Number(coordenadaSeleccionada.longitud),
    ],

    fin: [
      Number(puntoProyectado.latitud),
      Number(puntoProyectado.longitud),
    ],
  };
};

module.exports = {
  proyectarPuntoSobreSegmento,
  obtenerAristaMasCercanaEnGrafo,
  integrarProyeccionesEnGrafo,
  crearSegmentoConexion,
};