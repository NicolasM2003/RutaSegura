/**
 * MinHeap binario indexado utilizado por la búsqueda A* de rutas.
 * Mantiene como máximo una entrada por clave y permite cambiar su prioridad.
 */
class MinHeapIndexado {
  constructor() {
    this.items = [];
    this.indices = new Map();
    this.secuencia = 0;
  }

  get size() {
    return this.items.length;
  }

  insertarOActualizar(clave, prioridad, valor) {
    const indice = this.indices.get(clave);
    if (indice === undefined) {
      const item = { clave, prioridad, valor, secuencia: this.secuencia++ };
      this.items.push(item);
      this.indices.set(clave, this.items.length - 1);
      this.subir(this.items.length - 1);
      return "insertado";
    }

    const anterior = this.items[indice];
    anterior.prioridad = prioridad;
    anterior.valor = valor;
    this.subir(indice);
    this.bajar(this.indices.get(clave));
    return "actualizado";
  }

  extraerMinimo() {
    if (!this.items.length) return null;
    const minimo = this.items[0];
    const ultimo = this.items.pop();
    this.indices.delete(minimo.clave);
    if (this.items.length) {
      this.items[0] = ultimo;
      this.indices.set(ultimo.clave, 0);
      this.bajar(0);
    }
    return minimo;
  }

  comparar(a, b) {
    return a.prioridad - b.prioridad || a.secuencia - b.secuencia;
  }

  intercambiar(a, b) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    this.indices.set(this.items[a].clave, a);
    this.indices.set(this.items[b].clave, b);
  }

  subir(indiceInicial) {
    let indice = indiceInicial;
    while (indice > 0) {
      const padre = Math.floor((indice - 1) / 2);
      if (this.comparar(this.items[indice], this.items[padre]) >= 0) break;
      this.intercambiar(indice, padre);
      indice = padre;
    }
  }

  bajar(indiceInicial) {
    let indice = indiceInicial;
    while (true) {
      const izquierdo = indice * 2 + 1;
      const derecho = izquierdo + 1;
      let menor = indice;
      if (izquierdo < this.items.length && this.comparar(this.items[izquierdo], this.items[menor]) < 0) {
        menor = izquierdo;
      }
      if (derecho < this.items.length && this.comparar(this.items[derecho], this.items[menor]) < 0) {
        menor = derecho;
      }
      if (menor === indice) break;
      this.intercambiar(indice, menor);
      indice = menor;
    }
  }
}

module.exports = { MinHeapIndexado };
