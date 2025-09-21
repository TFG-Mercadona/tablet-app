// app/retirar.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/* ===== UI ===== */
const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  greenBrand: "#0F8A2F",
  dotGreen: "#2ecc71",
  dotOrange: "#ff9800",
  dotRed: "#E11D48",
  dotGray: "#9e9e9e",
};

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

/* ===== Helpers fecha/estado ===== */
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const parseYMD = (s: string) =>
  new Date(
    Number(s.slice(0, 4)),
    Number(s.slice(5, 7)) - 1,
    Number(s.slice(8, 10)),
  );
const isYMD = (s?: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const daysBetween = (a: Date, b: Date) => {
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const getStatusColor = (fecha: string | null) => {
  if (!fecha) return UI.dotGray;
  const today = startOfDay(new Date());
  const f = startOfDay(parseYMD(fecha));
  if (f.getTime() > today.getTime()) return UI.dotGreen; // verde
  if (f.getTime() === today.getTime()) return UI.dotOrange; // naranja
  return UI.dotRed; // rojo
};

const isPast = (s?: string | null) => {
  if (!s) return false;
  const d = startOfDay(parseYMD(s));
  const today = startOfDay(new Date());
  return d.getTime() < today.getTime();
};

export default function RetirarScreen() {
  const router = useRouter();
  const { tiendaId, familia } = useLocalSearchParams<{
    tiendaId?: string;
    familia?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<TornilloDTO[]>([]);
  const [index, setIndex] = useState(0);
  const current = items[index] ?? null;

  const [fechaCad, setFechaCad] = useState<string>(""); // editable por ítem

  /* ===== Cargar pendientes de TODA la familia (todos los módulos) ===== */
  const fetchPendientes = useCallback(async () => {
    try {
      if (!tiendaId || !familia) throw new Error("Faltan parámetros");
      setLoading(true);
      setError(null);

      // 1) módulos (orden natural)
      const famEnc = encodeURIComponent(String(familia));
      const modsRes = await fetch(
        `${API_BASE_URL}/api/tornillos/tienda/${tiendaId}/familia/${famEnc}/modulos`,
      );
      if (!modsRes.ok) throw new Error("No se pudieron cargar módulos");
      const modulos: string[] = await modsRes.json();
      if (!modulos?.length) {
        setItems([]);
        setIndex(0);
        return;
      }

      // 2) DTO por módulo
      const lists = await Promise.all(
        modulos.map((m) => {
          const moduloEnc = encodeURIComponent(m);
          const url = `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/familia/${famEnc}/modulo/${moduloEnc}?ts=${Date.now()}`;
          return fetch(url).then((r) => (r.ok ? r.json() : []));
        }),
      );

      // 3) Aplanar y filtrar sólo retiradas en pasado
      const all: TornilloDTO[] = lists
        .flat()
        .filter((t) => isPast(t.fechaRetirada));

      // 4) Orden: por módulo y zig-zag por filas/columnas
      const moduloIndex = new Map(modulos.map((m, i) => [m, i]));
      all.sort((a, b) => {
        const ma = moduloIndex.get(a.nombreModulo) ?? 9999;
        const mb = moduloIndex.get(b.nombreModulo) ?? 9999;
        if (ma !== mb) return ma - mb;
        if (a.fila !== b.fila) return a.fila - b.fila;
        const odd = a.fila % 2 === 1;
        return odd ? a.columna - b.columna : b.columna - a.columna;
      });

      setItems(all);
      setIndex(0);
      setFechaCad(
        all[0]?.fechaCaducidad
          ? all[0].fechaCaducidad.slice(0, 10)
          : toYMD(new Date()),
      );
    } catch (e: any) {
      setError(e.message ?? "Error cargando pendientes");
      setItems([]);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, [tiendaId, familia]);

  useEffect(() => {
    fetchPendientes();
  }, [fetchPendientes]);

  // Cuando cambia el `current`, reseteamos el input de fecha para ese ítem
  useEffect(() => {
    if (current) {
      setFechaCad(
        current.fechaCaducidad
          ? current.fechaCaducidad.slice(0, 10)
          : toYMD(new Date()),
      );
    } else {
      setFechaCad("");
    }
  }, [current?.id]);

  /* ===== RETIRADA "EN VIVO" ===== */

  // 0) Días efectivos de caducidad
  const diasEfectivos = useMemo<number | null>(() => {
    if (!current) return null;
    if (current.caducidadDias != null) return current.caducidadDias;

    if (isYMD(current.fechaCaducidad) && isYMD(current.fechaRetirada)) {
      const fc = parseYMD(current.fechaCaducidad!);
      const fr = parseYMD(current.fechaRetirada!);
      return daysBetween(fc, fr);
    }
    return null;
  }, [
    current?.id,
    current?.caducidadDias,
    current?.fechaCaducidad,
    current?.fechaRetirada,
  ]);

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
    () => (retiradaDate ? getStatusColor(toYMD(retiradaDate)) : UI.dotGray),
    [retiradaDate],
  );

  // 3) Texto "R:"
  const rDia = useMemo(
    () => (retiradaDate ? retiradaDate.getDate() : "-"),
    [retiradaDate],
  );

  const total = items.length;
  const numero = total ? index + 1 : 0;

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

      const res = await fetch(
        `${API_BASE_URL}/api/tornillos/${current.id}/fecha-caducidad`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaCaducidad: fechaCad }),
        },
      );
      if (!res.ok) throw new Error(`Error ${res.status} guardando fecha`);

      const newList = items.filter((_, i) => i !== index);

      if (newList.length === 0) {
        const msg = "¡Has terminado! No quedan productos pendientes.";
        if (Platform.OS === "web") {
          window.alert(msg);
          router.back();
        } else {
          Alert.alert("Completado", msg, [
            { text: "OK", onPress: () => router.back() },
          ]);
        }
        return;
      }

      const newIndex = Math.min(index, newList.length - 1);
      setItems(newList);
      setIndex(newIndex);
      const next = newList[newIndex];
      setFechaCad(
        next?.fechaCaducidad
          ? next.fechaCaducidad.slice(0, 10)
          : toYMD(new Date()),
      );
    } catch (e: any) {
      setError(e.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  // Saltar: elimina el actual y muestra el siguiente (sin guardar)
  const skipCurrent = () => {
    if (!current) return;

    const newList = items.filter((_, i) => i !== index);

    if (newList.length === 0) {
      const msg = "No quedan productos pendientes.";
      if (Platform.OS === "web") {
        window.alert(msg);
        router.back();
      } else {
        Alert.alert("Lista vacía", msg, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
      return;
    }

    const newIndex = Math.min(index, newList.length - 1);
    setItems(newList);
    setIndex(newIndex);
    const next = newList[newIndex];
    setFechaCad(
      next?.fechaCaducidad
        ? next.fechaCaducidad.slice(0, 10)
        : toYMD(new Date()),
    );
  };

  /* ===== Early returns para evitar nulls ===== */
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>No hay productos pendientes.</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryTxt}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 👇 current garantizado a partir de aquí: ya no hay errores con imagenUrl
  const imgSrc = current.imagenUrl
    ? `${API_BASE_URL}${current.imagenUrl}`
    : `${API_BASE_URL}/images/productos/${current.productoCodigo}.png`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.8}
            >
              <Image
                source={require("@/assets/images/back.png")}
                style={styles.backIcon}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Retirar pendientes</Text>
              <Text style={styles.appBarSub}>
                {current.nombreModulo} | {current.familia ?? "Familia"}
              </Text>
            </View>
          </View>
          <Text style={styles.badge}>
            {numero}/{total}
          </Text>
        </View>

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
            <TouchableOpacity style={styles.chip} onPress={() => shiftDays(-1)}>
              <Text>-1 día</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => shiftDays(+1)}>
              <Text>+1 día</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => shiftDays(+7)}>
              <Text>+7 días</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.meta}>R: {rDia}</Text>
          <Text style={styles.meta}>
            Caducidad: {diasEfectivos ?? "-"} días
          </Text>

          {/* Botones */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={skipCurrent}
              disabled={saving}
            >
              <Text style={styles.secondaryTxt}>Saltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={validateAndNext}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.primaryTxt}>Validar y siguiente</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 16 }} />
        <Text style={styles.footer}>
          Mercadona · Caducados · {new Date().getFullYear()}
        </Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

/* ===== Estilos ===== */
const MAX_W = 860;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI.bg,
    padding: 20,
  },

  container: { padding: 20, alignItems: "center", backgroundColor: UI.bg },

  /* App bar */
  appBar: {
    width: "100%",
    maxWidth: MAX_W,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "web" ? 0.06 : 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  appBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { width: 22, height: 22, resizeMode: "contain" },
  appBarTitle: { fontSize: 20, fontWeight: "800", color: UI.text },
  appBarSub: { marginTop: 2, color: UI.sub, fontSize: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: UI.border,
    color: UI.sub,
    fontWeight: "700",
  },

  /* Card */
  card: {
    width: "100%",
    maxWidth: MAX_W,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    marginTop: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "web" ? 0.05 : 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bigImg: { width: 160, height: 160, resizeMode: "contain", marginBottom: 8 },
  dot: { width: 16, height: 16, borderRadius: 8, marginBottom: 8 },

  codigo: { fontSize: 18, fontWeight: "bold", marginTop: 2, color: UI.text },
  nombre: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    color: UI.text,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 8,
  },
  fieldLabel: { fontWeight: "bold", color: UI.text },
  dateInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 160,
    textAlign: "center",
    color: UI.text,
  },

  quickRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.border,
  },

  meta: { marginTop: 8, fontSize: 14, color: UI.sub },

  actionsRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI.border,
    backgroundColor: UI.card,
  },
  secondaryTxt: { color: UI.text, fontWeight: "600" },

  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: UI.greenBrand,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryTxt: { color: "#fff", fontWeight: "bold" },

  error: { color: UI.dotRed },
  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
