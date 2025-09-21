// app/tornillo/[id].tsx
import React, { useEffect, useMemo, useState } from "react";
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

/* ===== UI (alineado con el resto) ===== */
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

const getStatusColor = (fecha: string | null) => {
  if (!fecha) return UI.dotGray;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const f = parseYMD(fecha);
  f.setHours(0, 0, 0, 0);
  if (f.getTime() > today.getTime()) return UI.dotGreen; // verde
  if (f.getTime() === today.getTime()) return UI.dotOrange; // naranja
  return UI.dotRed; // rojo
};

export default function TornilloDetail() {
  const { id, tiendaId } = useLocalSearchParams<{
    id?: string;
    tiendaId?: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tornillo, setTornillo] = useState<TornilloDTO | null>(null);
  const [fechaCad, setFechaCad] = useState<string>(""); // editable

  // Carga datos (un único fetch al DTO por tienda + producto)
  const fetchData = async () => {
    try {
      if (!tiendaId || !id)
        throw new Error("Faltan parámetros (tiendaId / productoCodigo)");
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/producto/${id}`,
      );
      if (!res.ok)
        throw new Error(
          `No se pudo cargar tornillo (tienda=${tiendaId}, prod=${id})`,
        );
      const dto: TornilloDTO = await res.json();

      setTornillo(dto);
      setFechaCad(
        dto.fechaCaducidad
          ? dto.fechaCaducidad.slice(0, 10)
          : toYMD(new Date()),
      );
    } catch (e: any) {
      setError(e.message ?? "Error cargando");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, tiendaId]);

  /* ===== RETIRADA "EN VIVO" ===== */
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

  const statusColor = useMemo(
    () => (retiradaDate ? getStatusColor(toYMD(retiradaDate)) : UI.dotGray),
    [retiradaDate],
  );

  const rDia = useMemo(
    () => (retiradaDate ? retiradaDate.getDate() : "-"),
    [retiradaDate],
  );

  // Ajustes rápidos de fecha
  const shiftDays = (days: number) => {
    const base = fechaCad ? parseYMD(fechaCad) : new Date();
    base.setDate(base.getDate() + days);
    setFechaCad(toYMD(base));
  };

  const goBackToNevera = () => {
    // @ts-ignore: canGoBack puede no estar tipado en algunas versiones
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/nevera");
    }
  };

  // Guardar cambios
  const save = async () => {
    if (!tornillo) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(
        `${API_BASE_URL}/api/tornillos/${tornillo.id}/fecha-caducidad`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaCaducidad: fechaCad }),
        },
      );
      if (!res.ok) throw new Error(`Error ${res.status} guardando fecha`);

      if (Platform.OS === "web") {
        window.alert("Fecha de caducidad actualizada.");
        goBackToNevera();
      } else {
        Alert.alert("Guardado", "Fecha de caducidad actualizada.", [
          { text: "OK", onPress: goBackToNevera },
        ]);
      }
    } catch (e: any) {
      setError(e.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  /* ===== Early returns ===== */
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
  if (!tornillo)
    return (
      <View style={styles.center}>
        <Text>No encontrado</Text>
      </View>
    );

  // Imagen a prueba de null/"" y de rutas relativas
  const hasImg = !!(tornillo.imagenUrl && tornillo.imagenUrl.trim().length > 0);
  const imgSrc = hasImg
    ? tornillo.imagenUrl!.startsWith("http")
      ? tornillo.imagenUrl!
      : `${API_BASE_URL}${tornillo.imagenUrl}`
    : `${API_BASE_URL}/images/productos/${tornillo.productoCodigo}.png`;

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
              <Text style={styles.appBarTitle}>{tornillo.nombre}</Text>
              <Text style={styles.appBarSub}>
                {tornillo.nombreModulo}{" "}
                {tornillo.familia ? `| ${tornillo.familia}` : ""}
              </Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Tarjeta */}
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
            Caducidad: {tornillo.caducidadDias ?? "-"} días
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={goBackToNevera}
              disabled={saving}
            >
              <Text style={styles.secondaryTxt}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.primaryTxt}>Validar</Text>
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
