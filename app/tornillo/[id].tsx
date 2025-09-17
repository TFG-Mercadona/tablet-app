import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

type TornilloDTO = {
  // Tornillo
  id: number;
  productoCodigo: number;
  tiendaId: number;
  fechaCaducidad: string | null; // "YYYY-MM-DD" o ISO
  fechaRetirada: string | null;
  nombreModulo: string;
  fila: number;
  columna: number;
  // Producto (del DTO)
  nombre: string;
  imagenUrl?: string | null;
  familia?: string | null;
  caducidadDias?: number | null;
};

// Helpers fecha/estado
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const parseYMD = (s: string) => new Date(Number(s.slice(0,4)), Number(s.slice(5,7)) - 1, Number(s.slice(8,10)));
const getStatusColor = (fecha: string | null) => {
  if (!fecha) return '#9e9e9e';
  const today = new Date(); today.setHours(0,0,0,0);
  const f = parseYMD(fecha); f.setHours(0,0,0,0);
  if (f.getTime() > today.getTime()) return '#2ecc71';   // verde
  if (f.getTime() === today.getTime()) return '#f1c40f'; // amarillo
  return '#e74c3c';                                       // rojo
};

export default function TornilloDetail() {
  // `id` aquí es el productoCodigo (como venías usando)
  const { id, tiendaId } = useLocalSearchParams<{ id?: string; tiendaId?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tornillo, setTornillo] = useState<TornilloDTO | null>(null);
  const [fechaCad, setFechaCad] = useState<string>(''); // editable

  // Carga datos (un único fetch al DTO por tienda + producto)
  const fetchData = async () => {
    try {
      if (!tiendaId || !id) throw new Error('Faltan parámetros (tiendaId / productoCodigo)');
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/producto/${id}`);
      if (!res.ok) throw new Error(`No se pudo cargar tornillo (tienda=${tiendaId}, prod=${id})`);
      const dto: TornilloDTO = await res.json();

      setTornillo(dto);
      setFechaCad(dto.fechaCaducidad ? dto.fechaCaducidad.slice(0, 10) : toYMD(new Date()));
    } catch (e: any) {
      setError(e.message ?? 'Error cargando');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id, tiendaId]);

  const statusColor = useMemo(() => getStatusColor(fechaCad), [fechaCad]);
  const rDia = useMemo(() => {
    if (!tornillo?.fechaRetirada) return '-';
    const d = parseYMD(tornillo.fechaRetirada);
    return d.getDate(); // sólo día del mes
  }, [tornillo?.fechaRetirada]);

  // Ajustes rápidos de fecha
  const shiftDays = (days: number) => {
    const base = fechaCad ? parseYMD(fechaCad) : new Date();
    base.setDate(base.getDate() + days);
    setFechaCad(toYMD(base));
  };

  // Guardar cambios
  const save = async () => {
    if (!tornillo) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/tornillos/${tornillo.id}/fecha-caducidad`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaCaducidad: fechaCad }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} guardando fecha`);

      // refresca para ver nueva fecha_retirada del trigger
      await fetchData();
      Alert.alert('Guardado', 'Fecha de caducidad actualizada.');
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  if (error) return <View style={styles.container}><Text style={styles.error}>{error}</Text></View>;
  if (!tornillo) return <View style={styles.container}><Text>No encontrado</Text></View>;

  const imgSrc = tornillo.imagenUrl
    ? `${API_BASE_URL}${tornillo.imagenUrl}` // el backend te manda "/images/productos/39946.png"
    : `${API_BASE_URL}/images/productos/${tornillo.productoCodigo}.png`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backTxt}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>Módulo {tornillo.nombreModulo}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.card}>
        <Image style={styles.bigImg} source={{ uri: imgSrc }} />
        <View style={[styles.dot, { backgroundColor: statusColor }]} />

        <Text style={styles.codigo}>{tornillo.productoCodigo}</Text>
        <Text style={styles.nombre}>{tornillo.nombre}</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.fieldLabel}>Fecha de caducidad:</Text>
          <TextInput
            value={fechaCad}
            onChangeText={setFechaCad}
            placeholder="YYYY-MM-DD"
            style={styles.dateInput}
          />
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.chip} onPress={() => shiftDays(-1)}><Text>-1 día</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => shiftDays(+1)}><Text>+1 día</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => shiftDays(+7)}><Text>+7 días</Text></TouchableOpacity>
        </View>

        <Text style={styles.meta}>R: {rDia}</Text>
        <Text style={styles.meta}>Caducidad: {tornillo.caducidadDias ?? '-'} días</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator /> : <Text style={styles.primaryTxt}>Validar</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  headerRow: {
    width: '100%', maxWidth: 560, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 28, lineHeight: 28 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },

  card: {
    width: '100%', maxWidth: 560, backgroundColor: '#eef', borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  bigImg: { width: 160, height: 160, resizeMode: 'contain', marginBottom: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, marginBottom: 8 },

  codigo: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  nombre: { fontSize: 16, textAlign: 'center', marginBottom: 12 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginTop: 8 },
  fieldLabel: { fontWeight: 'bold' },
  dateInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, minWidth: 150, textAlign: 'center',
  },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },

  meta: { marginTop: 8, fontSize: 14 },

  primaryBtn: { marginTop: 16, width: '100%', paddingVertical: 12, backgroundColor: '#16a34a', borderRadius: 8, alignItems: 'center' },
  primaryTxt: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'crimson' },
});
