import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { useEffect, useState } from 'react';

type Tornillo = {
  id: number;
  productoCodigo: number;
  tiendaId: number;
  fechaCaducidad: string;
  fechaRetirada: string;
  nombreModulo: string;
  fila: number;
  columna: number;
  nombre: string;
  imagenUrl: string;
};

export default function NeveraScreen() {
  const [tornillos, setTornillos] = useState<Tornillo[]>([]);
  const [maxFila, setMaxFila] = useState(0);

  useEffect(() => {
    const fetchTornillos = async () => {
      try {
        const res = await fetch(
          'http://localhost:8080/api/tornillos/dto/tienda/3718/familia/Zumo%20muralita/modulo/Puerta%201'
        );
        const data: Tornillo[] = await res.json();

        const maxF = Math.max(...data.map(t => t.fila));
        setMaxFila(maxF);
        setTornillos(data);
      } catch (err) {
        console.error('Error cargando tornillos:', err);
      }
    };

    fetchTornillos();
  }, []);

  const renderGrid = () => {
    const grid = [];

    for (let fila = 1; fila <= maxFila; fila++) {
      const tornillosFila = tornillos
        .filter(t => t.fila === fila)
        .sort((a, b) => a.columna - b.columna);

      grid.push(
        <View key={`row-${fila}`} style={styles.row}>
          {tornillosFila.map((t) => (
            <View key={t.id} style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.codigo}>{t.productoCodigo}</Text>
              <Text style={styles.nombre}>{t.nombre}</Text>
              <View style={styles.statusBall} />
            </View>
          ))}
        </View>
      );
    }

    return grid;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nevera - Puerta 1</Text>
      {renderGrid()}
    </ScrollView>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    width: screenWidth - 40,
    marginBottom: 10,
  },
  cell: {
    marginHorizontal: 4,
    height: 140,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef',
    padding: 10,
  },
  image: {
    width: 40,
    height: 40,
    marginBottom: 6,
  },
  codigo: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nombre: {
    fontSize: 14,
    textAlign: 'center',
  },
  retirada: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statusBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'green',
    marginTop: 6,
  },
});
