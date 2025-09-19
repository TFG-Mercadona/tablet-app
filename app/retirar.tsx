import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useCallback } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

type TornilloDTO = {
  id: number;
  productoCodigo: number;
  tiendaId: number;
  fechaCaducidad: string | null;
  fechaRetirada: string | null;
  nombreModulo: string;
  fila: number;
  columna: number;
  nombre: string;
  imagenUrl?: string | null;
  familia?: string | null;
  caducidadDias?: number | null;
};

/* ===== Helpers fecha/estado ===== */
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const parseYMD = (s: string) =>
  new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
const isYMD = (s?: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const daysBetween = (a: Date, b: Date) => {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const getStatusColor = (fecha: string | null) => {
  if (!fecha) return '#9e9e9e'; // gris
  const today = startOfDay(new Date());
  const f = startOfDay(parseYMD(fecha));
  if (f.getTime() > today.getTime()) return '#2ecc71';   // verde
  if (f.getTime() === today.getTime()) return '#ff9800'; // naranja
  return '#e74c3c';                                       // rojo
};

const isPast = (s?: string | null) => {
  if (!s) return false;
  const d = startOfDay(parseYMD(s));
  const today = startOfDay(new Date());
  return d.getTime() < today.getTime();
};

export default function RetirarScreen() {
  const router = useRouter();
  const { tiendaId, familia } = useLocalSearchParams<{ tiendaId?: string; familia?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<TornilloDTO[]>([]);
  const [index, setIndex] = useState(0);
  const current = items[index] ?? null;

  const [fechaCad, setFechaCad] = useState<string>(''); // editable por ítem

  /* ===== Cargar pendientes de TODA la familia (todos los módulos) ===== */
  const fetchPendientes = useCallback(async () => {
    try {
      if (!tiendaId || !familia) throw new Error('Faltan parámetros');
      setLoading(true);
      setError(null);

      // 1) módulos (orden natural)
      const famEnc = encodeURIComponent(String(familia));
      const modsRes = await fetch(`${API_BASE_URL}/api/tornillos/tienda/${tiendaId}/familia/${famEnc}/modulos`);
      if (!modsRes.ok) throw new Error('No se pudieron cargar módulos');
      const modulos: string[] = await modsRes.json();
      if (!modulos?.length) { setItems([]); setIndex(0); return; }

      // 2) DTO por módulo
      const lists = await Promise.all(
        modulos.map(m => {
          const moduloEnc = encodeURIComponent(m);
          const url = `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/familia/${famEnc}/modulo/${moduloEnc}?ts=${Date.now()}`;
          return fetch(url).then(r => r.ok ? r.json() : []);
        })
      );

      // 3) Aplanar y filtrar sólo retiradas en pasado
      const all: TornilloDTO[] = lists.flat().filter(t => isPast(t.fechaRetirada));

      // 4) Orden: por módulo y zig-zag por filas/columnas
      const moduloIndex = new Map(modulos.map((m, i) => [m, i]));
      all.sort((a, b) => {
        const ma = moduloIndex.get(a.nombreModulo) ?? 9999;
        const mb = moduloIndex.get(b.nombreModulo) ?? 9999;
        if (ma !== mb) return ma - mb;
        if (a.fila !== b.fila) return a.fila - b.fila;
        const odd = a.fila % 2 === 1;
        return odd ? (a.columna - b.columna) : (b.columna - a.columna);
      });

      setItems(all);
      setIndex(0);
      setFechaCad(all[0]?.fechaCaducidad ? all[0].fechaCaducidad.slice(0, 10) : toYMD(new Date()));
    } catch (e: any) {
      setError(e.message ?? 'Error cargando pendientes');
      setItems([]);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, [tiendaId, familia]);

  useEffect(() => { fetchPendientes(); }, [fetchPendientes]);

  // Cuando cambia el `current`, reseteamos el input de fecha para ese ítem
  useEffect(() => {
    if (current) {
      setFechaCad(current.fechaCaducidad ? current.fechaCaducidad.slice(0, 10) : toYMD(new Date()));
    } else {
      setFechaCad('');
    }
  }, [current?.id]);

  /* ===== RETIRADA "EN VIVO" como en /tornillo/[id].tsx ===== */

  // 0) Días efectivos de caducidad: preferimos `caducidadDias` del backend;
  //    si no viene, lo deducimos (fechaCaducidad - fechaRetirada)
  const diasEfectivos = useMemo<number | null>(() => {
    if (!current) return null;
    if (current.caducidadDias != null) return current.caducidadDias;

    if (isYMD(current.fechaCaducidad) && isYMD(current.fechaRetirada)) {
      const fc = parseYMD(current.fechaCaducidad!);
      const fr = parseYMD(current.fechaRetirada!);
      return daysBetween(fc, fr);
    }
    return null;
  }, [current?.id, current?.caducidadDias, current?.fechaCaducidad, current?.fechaRetirada]);

  // 1) Fecha de retirada "en vivo"
  const retiradaDate = useMemo(() => {
    if (!current) return null;

    if (isYMD(fechaCad) && diasEfectivos != null) {
      const d = parseYMD(fechaCad);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - diasEfectivos);
      return d;
    }
    if (current.fechaRetirada && isYMD(current.fechaRetirada)) {
      const d = parseYMD(current.fechaRetirada);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  }, [current, fechaCad, diasEfectivos]);

  // 2) Color de la bola por retirada
  const statusColor = useMemo(
    () => (retiradaDate ? getStatusColor(toYMD(retiradaDate)) : '#9e9e9e'),
    [retiradaDate]
  );

  // 3) Texto "R:"
  const rDia = useMemo(() => (retiradaDate ? retiradaDate.getDate() : '-'), [retiradaDate]);

  const total = items.length;
  const numero = total ? (index + 1) : 0;

  // Ajustes rápidos de fecha
  const shiftDays = (days: number) => {
    const base = fechaCad && isYMD(fechaCad) ? parseYMD(fechaCad) : new Date();
    base.setDate(base.getDate() + days);
    setFechaCad(toYMD(base));
  };

  // Validar y pasar al siguiente (elimina el actual, NO incrementa índice)
  const validateAndNext = async () => {
    if (!current) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/api/tornillos/${current.id}/fecha-caducidad`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaCaducidad: fechaCad }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} guardando fecha`);

      // Quitamos el actual sin mover el puntero (para no saltar el siguiente)
      const newList = items.filter((_, i) => i !== index);

      if (newList.length === 0) {
        const msg = '¡Has terminado! No quedan productos pendientes.';
        if (Platform.OS === 'web') {
          window.alert(msg);
          router.back();
        } else {
          Alert.alert('Completado', msg, [{ text: 'OK', onPress: () => router.back() }]);
        }
        return;
      }

      const newIndex = Math.min(index, newList.length - 1);
      setItems(newList);
      setIndex(newIndex);
      const next = newList[newIndex];
      setFechaCad(next?.fechaCaducidad ? next.fechaCaducidad.slice(0, 10) : toYMD(new Date()));
    } catch (e: any) {
      setError(e.message ?? 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  // Saltar: NO guarda en backend; quita el actual y pasa al siguiente sin saltarse ninguno
const skipCurrent = () => {
  if (!current) return;

  // Elimina el item actual
  const newList = items.filter((_, i) => i !== index);

  // Si no quedan elementos: mensaje y volver atrás
  if (newList.length === 0) {
    const msg = 'No quedan productos pendientes.';
    if (Platform.OS === 'web') {
      window.alert(msg);
      router.back();
    } else {
      Alert.alert('Completado', msg, [{ text: 'OK', onPress: () => router.back() }]);
    }
    return;
  }

  // Calcula el nuevo índice: apunta al que era "el siguiente"
  const newIndex = Math.min(index, newList.length - 1);

  // Aplica el estado
  setItems(newList);
  setIndex(newIndex);

  // Ajusta el input de fecha para el nuevo current (opcional, tu useEffect ya lo hace)
  const next = newList[newIndex];
  setFechaCad(next?.fechaCaducidad ? next.fechaCaducidad.slice(0, 10) : toYMD(new Date()));
};

  const imgSrc = current.imagenUrl
    ? `${API_BASE_URL}${current.imagenUrl}`
    : `${API_BASE_URL}/images/productos/${current.productoCodigo}.png`;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Encabezado */}
      <Text style={styles.h1}>Retirar pendientes</Text>
      <Text style={styles.h2}>{current.nombreModulo} | {current.familia}</Text>
      <Text style={styles.sub}>Elemento {numero} de {total}</Text>

      {/* Tarjeta */}
      <View style={styles.card}>
        <Image style={styles.bigImg} source={{ uri: imgSrc }} />
        <View style={[styles.dot, { backgroundColor: statusColor }]} />

        <Text style={styles.codigo}>{current.productoCodigo}</Text>
        <Text style={styles.nombre}>{current.nombre}</Text>

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
        <Text style={styles.meta}>Caducidad: {diasEfectivos ?? '-'} días</Text>

        {/* Botones */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={skipCurrent} disabled={items.length <= 1 || saving}>
            <Text style={styles.secondaryTxt}>Saltar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={validateAndNext} disabled={saving}>
            {saving ? <ActivityIndicator /> : <Text style={styles.primaryTxt}>Validar y siguiente</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 20 },
  container: { padding: 20, alignItems: 'center', backgroundColor: '#fff' },

  h1: { fontSize: 22, fontWeight: 'bold', color: '#16a34a' },
  h2: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 4 },
  sub: { marginTop: 4, color: '#666' },

  card: {
    width: '100%', maxWidth: 560, backgroundColor: '#eef', borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', marginTop: 12,
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

  actionsRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 14 },
  secondaryBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
  },
  secondaryTxt: { color: '#111', fontWeight: '600' },

  primaryBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#16a34a', borderRadius: 8, alignItems: 'center' },
  primaryTxt: { color: '#fff', fontWeight: 'bold' },

  error: { color: 'crimson' },
});
