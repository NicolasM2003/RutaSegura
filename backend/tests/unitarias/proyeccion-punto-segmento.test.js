const {
  proyectarPuntoSobreSegmento,
  obtenerAristaMasCercanaEnGrafo,
  integrarProyeccionesEnGrafo,
  crearSegmentoConexion,
} = require('../../src/utils/proyeccion-punto-segmento');

describe('proyectarPuntoSobreSegmento', () => {
  test('proyecta un punto ubicado sobre el centro del segmento', () => {
    const resultado = proyectarPuntoSobreSegmento(
      -33.0,
      -71.0005,
      { latitud: -33.0, longitud: -71.001 },
      { latitud: -33.0, longitud: -71.0 }
    );

    expect(resultado).not.toBeNull();
    expect(resultado.fraccion).toBeCloseTo(0.5, 2);
    expect(resultado.distancia_proyeccion_metros).toBeCloseTo(0, 1);
  });

  test('limita la proyección al extremo más cercano del segmento', () => {
    const resultado = proyectarPuntoSobreSegmento(
      -33.0,
      -71.002,
      { latitud: -33.0, longitud: -71.001 },
      { latitud: -33.0, longitud: -71.0 }
    );

    expect(resultado).not.toBeNull();
    expect(resultado.fraccion).toBe(0);
    expect(resultado.punto.latitud).toBeCloseTo(-33.0, 6);
    expect(resultado.punto.longitud).toBeCloseTo(-71.001, 6);
    expect(resultado.distancia_proyeccion_metros).toBeGreaterThan(0);
  });

  test('retorna null cuando las coordenadas no son válidas', () => {
    const resultado = proyectarPuntoSobreSegmento(
      'invalido',
      -71.0,
      { latitud: -33.0, longitud: -71.001 },
      { latitud: -33.0, longitud: -71.0 }
    );

    expect(resultado).toBeNull();
  });

  describe('obtenerAristaMasCercanaEnGrafo', () => {
  test('selecciona la arista más cercana a la coordenada', () => {
    const nodos = [
      { id: 'A', latitud: -33.0, longitud: -71.001 },
      { id: 'B', latitud: -33.0, longitud: -71.0 },
      { id: 'C', latitud: -33.001, longitud: -71.001 },
      { id: 'D', latitud: -33.001, longitud: -71.0 },
    ];

    const aristas = [
      {
        id: 'arista-cercana',
        nodo_origen: 'A',
        nodo_destino: 'B',
      },
      {
        id: 'arista-lejana',
        nodo_origen: 'C',
        nodo_destino: 'D',
      },
    ];

    const resultado = obtenerAristaMasCercanaEnGrafo(
      nodos,
      aristas,
      -33.0001,
      -71.0005
    );

    expect(resultado).not.toBeNull();
    expect(resultado.arista.id).toBe('arista-cercana');
    expect(resultado.fraccion).toBeCloseTo(0.5, 2);
    expect(resultado.distancia_proyeccion_metros).toBeGreaterThan(0);
  });

  test('ignora aristas cuyos nodos no existen', () => {
    const nodos = [
      { id: 'A', latitud: -33.0, longitud: -71.0 },
    ];

    const aristas = [
      {
        id: 'arista-invalida',
        nodo_origen: 'A',
        nodo_destino: 'Z',
      },
    ];

    const resultado = obtenerAristaMasCercanaEnGrafo(
      nodos,
      aristas,
      -33.0,
      -71.0005
    );

    expect(resultado).toBeNull();
  });
});

describe('integrarProyeccionesEnGrafo', () => {
  test('divide una misma arista para integrar origen y destino', () => {
    const nodos = [
      {
        id: 'A',
        latitud: -33.0,
        longitud: -71.001,
        conexiones: ['B'],
      },
      {
        id: 'B',
        latitud: -33.0,
        longitud: -71.0,
        conexiones: ['A'],
      },
    ];

    const arista = {
      id: 'via-1',
      id_osm: 'via-1',
      nodo_origen: 'A',
      nodo_destino: 'B',
      distancia_metros: 100,
      puntaje_riesgo: 60,
      nivel_riesgo: 'Medio',
      costo_riesgo: 60,
      costo_distancia: 30,
      costo_arista: 51,
      zonas_intersectadas: [{ id_zona: 'zona-1' }],
      tipo: 'footway',
    };

    const resultado = integrarProyeccionesEnGrafo(
      nodos,
      [arista],
      [
        {
          id: 'origen',
          arista,
          fraccion: 0.25,
          punto: {
            latitud: -33.0,
            longitud: -71.00075,
          },
        },
        {
          id: 'destino',
          arista,
          fraccion: 0.75,
          punto: {
            latitud: -33.0,
            longitud: -71.00025,
          },
        },
      ]
    );

    expect(resultado).not.toBeNull();

    expect(resultado.aristas).toHaveLength(3);
    expect(resultado.nodos).toHaveLength(4);

    expect(resultado.nodos_por_proyeccion.origen)
      .toBeDefined();

    expect(resultado.nodos_por_proyeccion.destino)
      .toBeDefined();

    // Las distancias parciales deben conservar la distancia original.
    const distanciaTotal = resultado.aristas.reduce(
      (total, segmento) => total + segmento.distancia_metros,
      0
    );

    expect(distanciaTotal).toBeCloseTo(100, 3);

    // Se conservan los atributos de riesgo y las zonas.
    for (const segmento of resultado.aristas) {
      expect(segmento.puntaje_riesgo).toBe(60);
      expect(segmento.nivel_riesgo).toBe('Medio');
      expect(segmento.zonas_intersectadas).toEqual([
        { id_zona: 'zona-1' },
      ]);
      expect(segmento.tipo).toBe('footway');
    }

    // Se conserva la conectividad entre los cuatro nodos.
    expect(resultado.nodos_por_proyeccion.origen).not.toBe(
      resultado.nodos_por_proyeccion.destino
    );

    expect(
      resultado.nodos.find(
        (nodo) => nodo.id === resultado.nodos_por_proyeccion.origen
      ).conexiones
    ).toHaveLength(2);
  });
});

describe('crearSegmentoConexion', () => {
  const datos = {
    id: 'origen',
    coordenadaSeleccionada: {
      latitud: -33.0,
      longitud: -71.001,
    },
    puntoProyectado: {
      latitud: -33.0,
      longitud: -71.0008,
    },
    distanciaMetros: 18.56,
    aristaReferencia: {
      id: 'via-123',
      puntaje_riesgo: 45,
      nivel_riesgo: 'Medio',
    },
  };

  test('crea un conector y conserva el riesgo estimado de referencia', () => {
    const resultado = crearSegmentoConexion(datos);

    expect(resultado).not.toBeNull();
    expect(resultado.es_conector).toBe(true);
    expect(resultado.id_osm).toBeNull();
    expect(resultado.distancia_metros).toBe(18.56);
    expect(resultado.puntaje_riesgo).toBe(45);
    expect(resultado.riesgo_estimado).toBe(true);
    expect(resultado.arista_referencia_id).toBe('via-123');
    expect(resultado.zonas_intersectadas).toEqual([]);
  });

  test('retorna null cuando la distancia no es válida', () => {
    const resultado = crearSegmentoConexion({
      ...datos,
      distanciaMetros: -5,
    });

    expect(resultado).toBeNull();
  });

  test('retorna null cuando falta la arista de referencia', () => {
    const resultado = crearSegmentoConexion({
      ...datos,
      aristaReferencia: null,
    });

    expect(resultado).toBeNull();
  });
});

});