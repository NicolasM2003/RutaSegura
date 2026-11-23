jest.mock("../../src/services/grafo-peatonal.service", () => ({
  obtenerGrafoPeatonal: jest.fn(),
}));

const rutaService = require("../../src/services/ruta.service");
const busquedaMinHeap = require("../../src/services/busqueda-a-star-min-heap.service");
const { PERFILES_RUTA } = require("../../src/config/perfiles-ruta.config");

const nodos = [
  { id: "O", latitud: -33, longitud: -71 },
  { id: "A", latitud: -33, longitud: -70.999 },
  { id: "B", latitud: -33.001, longitud: -70.999 },
  { id: "D", latitud: -33, longitud: -70.998 },
];

const nodosMap = new Map(nodos.map((nodo) => [nodo.id, nodo]));
const crearArista = (origen, destino, puntajeRiesgo) => {
  const a = nodosMap.get(origen);
  const b = nodosMap.get(destino);
  return {
    id_osm: `${origen}-${destino}`,
    nodo_origen: origen,
    nodo_destino: destino,
    distancia_metros: rutaService.distanciaHaversine(
      a.latitud,
      a.longitud,
      b.latitud,
      b.longitud,
    ),
    puntaje_riesgo: puntajeRiesgo,
    nivel_riesgo: puntajeRiesgo > 75 ? "Alto" : "Bajo",
    zonas_intersectadas: [],
    nombre: `Calle ${origen}-${destino}`,
    tipo: "footway",
  };
};

const grafo = {
  nodos,
  // La alternativa B es más larga y de riesgo bajo; A es corta y de riesgo alto.
  aristas: [
    crearArista("O", "A", 100),
    crearArista("A", "D", 100),
    crearArista("O", "B", 0),
    crearArista("B", "D", 0),
  ],
};

describe("A* + MinHeap como búsqueda habitual", () => {
  afterEach(() => jest.restoreAllMocks());

  test.each(Object.keys(PERFILES_RUTA))(
    "usa A* + MinHeap y conserva ruta, costo y formato para %s",
    async (perfilRuta) => {
      const buscarMinHeap = jest.spyOn(busquedaMinHeap, "aStarMinHeap");
      const resultado = await rutaService.calcularRutaSegura({
        comuna: "Viña del Mar",
        origen: { latitud: nodos[0].latitud, longitud: nodos[0].longitud },
        destino: { latitud: nodos[3].latitud, longitud: nodos[3].longitud },
        rangoHorario: "20:00 - 23:59",
        perfilRuta,
        grafoPrecalculado: grafo,
      });

      const candidatos = [
        { nodos: ["O", "A", "D"], aristas: [grafo.aristas[0], grafo.aristas[1]] },
        { nodos: ["O", "B", "D"], aristas: [grafo.aristas[2], grafo.aristas[3]] },
      ].map((candidato) => ({
        ...candidato,
        costo: candidato.aristas.reduce(
          (suma, arista) => suma + rutaService.calcularCostoArista(arista, PERFILES_RUTA[perfilRuta]),
          0,
        ),
      }));
      const referencia = candidatos.sort((a, b) => a.costo - b.costo)[0];

      expect(buscarMinHeap).toHaveBeenCalledTimes(1);
      expect(resultado).toMatchObject({
        encontrada: true,
        perfil_ruta: perfilRuta,
        nodos_ruta: referencia.nodos,
        costo_navegacion: referencia.costo,
        cantidad_segmentos: referencia.aristas.length,
        geometria: [
          [nodos[0].latitud, nodos[0].longitud],
          ...referencia.nodos.slice(1, -1).map((id) => {
            const nodo = nodosMap.get(id);
            return [nodo.latitud, nodo.longitud];
          }),
          [nodos[3].latitud, nodos[3].longitud],
        ],
      });
      expect(resultado.segmentos).toHaveLength(referencia.aristas.length);
      expect(resultado.segmentos.map((segmento) => segmento.costo_arista))
        .toEqual(referencia.aristas.map((arista) =>
          rutaService.calcularCostoArista(arista, PERFILES_RUTA[perfilRuta])
        ));
    },
  );
});
