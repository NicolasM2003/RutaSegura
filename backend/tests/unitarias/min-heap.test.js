const { MinHeapIndexado } = require("../../src/services/min-heap");

describe("MinHeap indexado", () => {
  test("extrae prioridades en orden ascendente tras inserciones desordenadas", () => {
    const heap = new MinHeapIndexado();
    heap.insertarOActualizar("c", 9, "C");
    heap.insertarOActualizar("a", 3, "A");
    heap.insertarOActualizar("b", 6, "B");
    expect([heap.extraerMinimo().clave, heap.extraerMinimo().clave, heap.extraerMinimo().clave])
      .toEqual(["a", "b", "c"]);
    expect(heap.extraerMinimo()).toBeNull();
  });

  test("actualiza en sitio una prioridad y conserva un único elemento por clave", () => {
    const heap = new MinHeapIndexado();
    heap.insertarOActualizar("lento", 12, { costoG: 12 });
    heap.insertarOActualizar("medio", 8, { costoG: 8 });
    expect(heap.insertarOActualizar("lento", 4, { costoG: 4 })).toBe("actualizado");
    expect(heap.size).toBe(2);
    expect(heap.extraerMinimo()).toMatchObject({ clave: "lento", prioridad: 4, valor: { costoG: 4 } });
  });

  test("resuelve empates en orden estable de inserción", () => {
    const heap = new MinHeapIndexado();
    heap.insertarOActualizar("primero", 1, 1);
    heap.insertarOActualizar("segundo", 1, 2);
    heap.insertarOActualizar("tercero", 1, 3);
    expect([heap.extraerMinimo().clave, heap.extraerMinimo().clave, heap.extraerMinimo().clave])
      .toEqual(["primero", "segundo", "tercero"]);
  });

  test("restaura el heap al aumentar una prioridad existente", () => {
    const heap = new MinHeapIndexado();
    heap.insertarOActualizar("a", 1, "A");
    heap.insertarOActualizar("b", 2, "B");
    heap.insertarOActualizar("c", 3, "C");
    heap.insertarOActualizar("a", 5, "A2");
    expect(heap.extraerMinimo().clave).toBe("b");
    expect(heap.extraerMinimo().clave).toBe("c");
    expect(heap.extraerMinimo()).toMatchObject({ clave: "a", prioridad: 5, valor: "A2" });
  });
});
