import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

type TornilloDTO = {
  id: number;
  productoCodigo: number;
  tiendaId: number;
  fechaCaducidad: string | null; // "YYYY-MM-DD" o ISO
  fechaRetirada: string | null;
  nombreModulo: string;
  fila: number;
  columna: number;
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
const isYMD = (s?: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Colores estado (verde / naranja / rojo) según la FECHA *DE RETIRADA*
const getStatusColor = (fecha: string | null) => {
  if (!fecha) return '#9e9e9e'; // gris
  const today = new Date(); today.setHours(0,0,0,0);
  const f = parseYMD(fecha); f.setHours(0,0,0,0);
  if (f.getTime() > today.getTime()) return '#2ecc71';   // verde
  if (f.getTime() === today.getTime()) return '#ff9800'; // naranja
  return '#e74c3c';                                       // rojo
};


export default function TornilloDetail() {
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

  // ========================
  // RETIRADA "EN VIVO"
  // ========================
  // 1) Calculamos la fecha de retirada en base a lo que hay en el input (fechaCad) y caducidadDias.
  //    Si no hay datos válidos, caemos a la retirada real del backend.
  const retiradaDate = useMemo(() => {
    if (!tornillo) return null;

    const dias = tornillo.caducidadDias ?? null;
    if (isYMD(fechaCad) && dias !== null) {
      const d = parseYMD(fechaCad);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - dias);
      return d;
    }

    if (tornillo.fechaRetirada && isYMD(tornillo.fechaRetirada)) {
      const d = parseYMD(tornillo.fechaRetirada);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    return null;
  }, [tornillo, fechaCad]);

  // 2) El color de la bola depende de RETIRADA (no de caducidad)
  const statusColor = useMemo(() => {
    return retiradaDate ? getStatusColor(toYMD(retiradaDate)) : '#9e9e9e';
  }, [retiradaDate]);

  // 3) El texto "R:" también sale de la retirada "en vivo"
  const rDia = useMemo(() => (retiradaDate ? retiradaDate.getDate() : '-'), [retiradaDate]);

  // Ajustes rápidos de fecha
  const shiftDays = (days: number) => {
    const base = fechaCad ? parseYMD(fechaCad) : new Date();
    base.setDate(base.getDate() + days);
    setFechaCad(toYMD(base));
  };

  const goBackToNevera = () => {
  // si hay historial, volvemos atrás
  // (en expo-router suele existir; si no, navegamos por ruta como fallback)
  // @ts-ignore: canGoBack existe en runtime aunque no tipado en algunas versiones
  if (typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
  } else {
    // Fallback: navega a tu pantalla de nevera (ajusta pathname si tu archivo se llama distinto)
    router.replace({
      pathname: '/nevera',               // <-- cámbialo si tu archivo es otro (ej. '/(tabs)/nevera')
      params: {
        tiendaId: String(tornillo?.tiendaId ?? ''),
        familia: String(tornillo?.familia ?? ''),
        modulo: String(tornillo?.nombreModulo ?? ''),
      },
    });
  }
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

    if (Platform.OS === 'web') {
      window.alert('Fecha de caducidad actualizada.');
      goBackToNevera();
    } else {
      Alert.alert('Guardado', 'Fecha de caducidad actualizada.', [
        { text: 'OK', onPress: goBackToNevera },
      ]);
    }
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
    ? `${API_BASE_URL}${tornillo.imagenUrl}`
    : `${API_BASE_URL}/images/productos/${tornillo.productoCodigo}.png`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backTxt}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>{tornillo.nombreModulo} | {tornillo.familia}</Text>
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
        <Text style={styles.meta}>Caducidad: {tornillo.caducidadDias ?? '-' } días</Text>

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
