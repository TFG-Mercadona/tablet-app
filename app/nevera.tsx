import { View, Text, StyleSheet, ScrollView, Dimensions, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

type Tornillo = {
  id: number;
  productoCodigo: number;
  tiendaId: number;
  fechaCaducidad: string | null;
  fechaRetirada: string | null;
  nombreModulo: string;
  fila: number;
  columna: number;
  nombre: string;
  imagenUrl?: string;
};

export default function NeveraScreen() {
  const params = useLocalSearchParams(); // esperamos params.familia
  const [tiendaId, setTiendaId] = useState<string | null>(null);

  const [modulos, setModulos] = useState<string[]>([]);
  const [modIndex, setModIndex] = useState(0); // índice del módulo actual
  const moduloActual = modulos[modIndex] ?? 'Puerta 1';

  const [tornillos, setTornillos] = useState<Tornillo[]>([]);
  const [maxFila, setMaxFila] = useState(0);

  const [loadingModulos, setLoadingModulos] = useState(false);
  const [loadingTornillos, setLoadingTornillos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) Cargamos tiendaId y módulos (puertas) de la familia
  useEffect(() => {
    const init = async () => {
      try {
        setError(null);
        setLoadingModulos(true);

        const storedId = await AsyncStorage.getItem('tiendaId');
        if (!storedId || !params.familia) {
          setError('Falta tienda o familia');
          setLoadingModulos(false);
          return;
        }
        console.log('Familia: ', params.familia);
        setTiendaId(storedId);

        const familia = encodeURIComponent(params.familia.toString());
        // Carhamos módulos
        const urlModulos = `${API_BASE_URL}/api/tornillos/tienda/${storedId}/familia/${familia}/modulos`;

        const res = await fetch(urlModulos);
        if (!res.ok) throw new Error(`Error ${res.status} cargando módulos`);
        const lista: string[] = await res.json();

        // Aseguramos al menos 1 módulo
        const ordered = (lista ?? []).length ? lista : ['Puerta 1'];
        setModulos(ordered);
        setModIndex(0); // empezamos en el primero
      } catch (e: any) {
        setError(e.message ?? 'Error cargando módulos');
      } finally {
        setLoadingModulos(false);
      }
    };
    init();
  }, [params.familia]);

  // 2) Cada vez que cambie moduloActual, pedimos los tornillos de ese módulo
  const fetchTornillos = useCallback(async () => {
    if (!tiendaId || !params.familia || !moduloActual) return;
    try {
      setError(null);
      setLoadingTornillos(true);

      const familia = encodeURIComponent(params.familia.toString());
      const modulo = encodeURIComponent(moduloActual);
      const url = `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/familia/${familia}/modulo/${modulo}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status} cargando tornillos`);
      const data: Tornillo[] = await res.json();

      const maxF = data.length ? Math.max(...data.map(t => t.fila)) : 0;
      setMaxFila(maxF);
      setTornillos(data);
    } catch (e: any) {
      setError(e.message ?? 'Error cargando tornillos');
      setTornillos([]);
      setMaxFila(0);
    } finally {
      setLoadingTornillos(false);
    }
  }, [tiendaId, params.familia, moduloActual]);

  useEffect(() => {
    fetchTornillos();
  }, [fetchTornillos]);

  // Navegación entre puertas
  const prevModulo = () => setModIndex(i => Math.max(0, i - 1));
  const nextModulo = () => setModIndex(i => Math.min(modulos.length - 1, i + 1));

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
                source={{ uri: `${API_BASE_URL}/images/productos/${t.productoCodigo}.png` }}
              />
              <View style={styles.textContainer}>
                <Text style={styles.codigo}>{t.productoCodigo}</Text>
                <Text style={styles.nombre} numberOfLines={2}>{t.nombre}</Text>
                <View style={styles.statusBall} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    if (grid.length === 0) {
      return <Text style={styles.empty}>No hay productos en esta cámara.</Text>;
    }
    return grid;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevModulo} disabled={modIndex === 0} style={[styles.arrowBtn, modIndex === 0 && styles.arrowDisabled]}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {moduloActual} {params.familia ? `| ${params.familia}` : ''}
        </Text>

        <TouchableOpacity onPress={nextModulo} disabled={modIndex >= modulos.length - 1} style={[styles.arrowBtn, (modIndex >= modulos.length - 1) && styles.arrowDisabled]}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {loadingModulos || loadingTornillos ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        renderGrid()
      )}

      {modulos.length > 0 && (
        <Text style={styles.pagination}>
          {modIndex + 1} / {modulos.length}
        </Text>
      )}
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
  header: {
    width: screenWidth - 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  arrowText: {
    fontSize: 28,
    lineHeight: 28,
  },
  title: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
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
    marginRight: 0,
  },
  textContainer: {
    height: 60,
    marginLeft: 12,
    justifyContent: 'space-between', // top código, medio nombre, bottom dot
    alignItems: 'flex-start',
  },  
  codigo: { fontSize: 14, fontWeight: 'bold' },
  nombre: { fontSize: 14 },
  statusBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'green',
    marginTop: 6,
  },
  error: { color: 'crimson', marginTop: 16 },
  empty: { marginTop: 16, color: '#666' },
  pagination: { marginTop: 12, color: '#666' },
});
