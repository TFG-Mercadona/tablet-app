import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

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
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    const fetchTornillos = async () => {
      try {
        const storedId = await AsyncStorage.getItem('tiendaId');
        if (!storedId || !params.familia) return;

        setTiendaId(storedId);

        const familiaCodificada = encodeURIComponent(params.familia.toString());
        console.log(familiaCodificada); 
        const url = `http://localhost:8080/api/tornillos/dto/tienda/${storedId}/familia/${familiaCodificada}/modulo/Puerta%201`;

        const res = await fetch(url);
        const data: Tornillo[] = await res.json();

        const maxF = Math.max(...data.map(t => t.fila));
        setMaxFila(maxF);
        setTornillos(data);
      } catch (err) {
        console.error('Error cargando tornillos:', err);
      }
    };

    fetchTornillos();
  }, [params.familia]);

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
              <Image
                style={styles.image}
                source={{ uri: `http://localhost:8080/images/productos/${t.productoCodigo}.png` }}
              />
              <View style={styles.textContainer}>
                <Text style={styles.codigo}>{t.productoCodigo}</Text>
                <Text style={styles.nombre}>{t.nombre}</Text>
                <View style={styles.statusBall} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    return grid;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Nevera - Puerta 1 {params.familia ? `| ${params.familia}` : ''}
      </Text>
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
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    width: screenWidth - 40,
    marginBottom: 10,
    justifyContent: 'center',
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    height: 100,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#eef',
    padding: 10,
  },
  image: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 12,
  },
  textContainer: {
    justifyContent: 'center',
  },
  codigo: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  nombre: {
    fontSize: 14,
  },
  statusBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'green',
    marginTop: 6,
  },
});
