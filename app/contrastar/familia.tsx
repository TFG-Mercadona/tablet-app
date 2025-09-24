// app/contrastar/familia.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  Platform, Dimensions, ActivityIndicator, Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const UI = {
  bg: "#FFFFFF", card: "#FFFFFF", border: "#E5E7EB",
  text: "#111827", sub: "#6B7280",
  green: "#0F8A2F",
};

type CambioDTO = {
  id: number; // id del registro de cambio
  tornilloId: number;
  productoCodigo: number;
  tiendaId: number;
  familia: string;
  nombreModulo: string;
  fila: number;
  columna: number;
  nombre: string;
  imagenUrl?: string | null;
  fechaAnterior: string | null;
  fechaNueva: string | null;
  fechaCambio: string;            // ISO
  caducidadDias?: number | null;
  contrastado?: boolean | null;   // <-- NUEVO
};

const isYMD = (s?: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const parseYMD = (s: string) => new Date(Number(s.slice(0,4)), Number(s.slice(5,7))-1, Number(s.slice(8,10)));

export default function ContrastarFamilia() {
  const router = useRouter();
  const { familia } = useLocalSearchParams<{ familia?: string }>();
  const [tiendaId, setTiendaId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [items, setItems] = useState<CambioDTO[]>([]);
  const [index, setIndex] = useState(0);

  const current = items[index] ?? null;
  const total = items.length;
  const numero = total ? index + 1 : 0;

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!tiendaId || !familia) return;
    try {
      setLoading(true);
      const famEnc = encodeURIComponent(String(familia));
      const res = await fetch(`${API_BASE_URL}/api/contrastar/tienda/${tiendaId}/familia/${famEnc}/hoy`);
      if (!res.ok) throw new Error("No se pudieron cargar los cambios");
      const data: CambioDTO[] = await res.json();
      // ordena por fechaCambio desc (últimos primero)
      data.sort((a,b) => new Date(b.fechaCambio).getTime() - new Date(a.fechaCambio).getTime());
      setItems(data);
      setIndex(0);
    } catch (e:any) {
      const msg = e?.message ?? "Error cargando cambios";
      if (Platform.OS === "web") window.alert(msg); else Alert.alert("Error", msg);
      setItems([]);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, [tiendaId, familia]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rAntes = useMemo(() => {
    if (!current?.fechaAnterior || !isYMD(current.fechaAnterior) || current.caducidadDias == null) return "-";
    const d = parseYMD(current.fechaAnterior);
    d.setDate(d.getDate() - current.caducidadDias);
    return d.getDate();
  }, [current?.id]);

  const rAhora = useMemo(() => {
    if (!current?.fechaNueva || !isYMD(current.fechaNueva) || current.caducidadDias == null) return "-";
    const d = parseYMD(current.fechaNueva);
    d.setDate(d.getDate() - current.caducidadDias);
    return d.getDate();
  }, [current?.id]);

  const imgSrc = useMemo(() => {
    if (!current) return null;
    if (current.imagenUrl) return `${API_BASE_URL}${current.imagenUrl}`;
    return `${API_BASE_URL}/images/productos/${current.productoCodigo}.png`;
  }, [current?.id]);

  const marcarContrastado = async (cambioId: number) => {
    setMarking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/contrastar/${cambioId}/contrastado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrastado: true }),
      });
      if (!res.ok) throw new Error(`Error al contrastar (${res.status})`);
      // actualiza localmente el item
      setItems(prev => {
        const copy = [...prev];
        const i = copy.findIndex(x => x.id === cambioId);
        if (i >= 0) copy[i] = { ...copy[i], contrastado: true };
        return copy;
      });
    } finally {
      setMarking(false);
    }
  };

  const next = async () => {
    if (!current) return;
    try {
      // si no estaba contrastado aún, lo marcamos
      if (!current.contrastado) {
        await marcarContrastado(current.id);
      }
      // avanzar
      if (index < items.length - 1) {
        setIndex(index + 1);
      } else {
        const msg = "¡Revisado todo! No quedan cambios por validar en esta familia.";
        if (Platform.OS === "web") {
          window.alert(msg);
          router.back();
        } else {
          Alert.alert("Completado", msg, [{ text: "OK", onPress: () => router.back() }]);
        }
      }
    } catch (e: any) {
      const msg = e?.message ?? "No se pudo marcar como contrastado.";
      if (Platform.OS === "web") window.alert(msg); else Alert.alert("Error", msg);
    }
  };

  const editar = () => {
    // lleva a tu pantalla de detalle/edición por producto, si quieres permitir correcciones
    router.push({
      pathname: "/tornillo/[id]",
      params: {
        id: String(current?.productoCodigo ?? ""),
        tiendaId: String(current?.tiendaId ?? ""),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Image source={require("@/assets/images/back.png")} style={styles.backIcon} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>{familia ?? "Contrastar"}</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Card principal */}
        <View style={styles.card}>
          {current ? (
            <>
              <Image style={styles.bigImg} source={{ uri: String(imgSrc) }} />
              <Text style={styles.codigo}>{current.productoCodigo}</Text>
              <Text style={styles.nombre}>{current.nombre}</Text>
              <Text style={styles.metaSmall}>
                {current.nombreModulo} · F{current.fila} · C{current.columna}
              </Text>

              {/* badge de estado */}
              {current.contrastado ? (
                <View style={[styles.badge, styles.badgeOk]}>
                  <Text style={styles.badgeTxt}>Contrastado</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeKo]}>
                  <Text style={styles.badgeTxt}>Pendiente</Text>
                </View>
              )}

              <View style={styles.diffBox}>
                <View style={styles.diffRow}>
                  <Text style={styles.diffLabel}>Antes</Text>
                  <Text style={styles.diffValueOld}>
                    {current.fechaAnterior ?? "-"}{current.caducidadDias != null ? `   (R: ${rAntes})` : ""}
                  </Text>
                </View>
                <View style={styles.diffRow}>
                  <Text style={styles.diffLabel}>Ahora</Text>
                  <Text style={styles.diffValueNew}>
                    {current.fechaNueva ?? "-"}{current.caducidadDias != null ? `   (R: ${rAhora})` : ""}
                  </Text>
                </View>
                <Text style={styles.changedAt}>
                  Modificado: {new Date(current.fechaCambio).toLocaleString()}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={editar}>
                  <Text style={styles.secondaryTxt}>Corregir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, (marking) && { opacity: 0.6 }]}
                  onPress={next}
                  disabled={marking}
                >
                  <Text style={styles.primaryTxt}>
                    {current.contrastado ? "Siguiente" : "Contrastar y siguiente"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.pagination}>{numero} / {total}</Text>
            </>
          ) : (
            <Text style={{ color: UI.sub }}>No hay cambios hoy en esta familia.</Text>
          )}
        </View>

        <View style={{ height: 16 }} />
        <Text style={styles.footer}>Mercadona · Caducados · {new Date().getFullYear()}</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const MAX_W = 860;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, alignItems: "center", backgroundColor: UI.bg },

  appBar: {
    width: "100%", maxWidth: MAX_W, backgroundColor: UI.card, borderRadius: 16,
    borderWidth: 1, borderColor: UI.border, padding: 14, marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "web" ? 0.06 : 0.12,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  appBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: UI.border,
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { width: 22, height: 22, resizeMode: "contain" },
  appBarTitle: { fontSize: 20, fontWeight: "800", color: UI.text },
  appBarSub: { marginTop: 2, color: UI.sub, fontSize: 12 },

  card: {
    width: "100%", maxWidth: MAX_W, backgroundColor: UI.card, borderRadius: 16,
    borderWidth: 1, borderColor: UI.border, padding: 14, marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "web" ? 0.05 : 0.1,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    alignItems: "center",
  },

  bigImg: { width: 160, height: 160, resizeMode: "contain", marginBottom: 8 },
  codigo: { fontSize: 18, fontWeight: "800", color: UI.text },
  nombre: { fontSize: 16, textAlign: "center", marginBottom: 4, color: UI.text },
  metaSmall: { color: UI.sub, marginBottom: 10 },

  badge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "center",
  },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeKo: { backgroundColor: "#FEE2E2" },
  badgeTxt: { fontSize: 12, fontWeight: "700", color: UI.text },

  diffBox: {
    width: "100%", borderWidth: 1, borderColor: UI.border, borderRadius: 12,
    padding: 12, backgroundColor: "#F9FAFB", marginTop: 6,
  },
  diffRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  diffLabel: { fontWeight: "700", color: UI.text },
  diffValueOld: { color: "#B91C1C", fontWeight: "700" },  // rojo oscuro
  diffValueNew: { color: "#065F46", fontWeight: "700" },  // verde oscuro
  changedAt: { marginTop: 6, color: UI.sub, fontSize: 12 },

  actionsRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 14 },
  secondaryBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
    borderWidth: 1, borderColor: UI.border, backgroundColor: "#fff",
  },
  secondaryTxt: { color: UI.text, fontWeight: "700" },

  primaryBtn: { flex: 1, paddingVertical: 12, backgroundColor: UI.green, borderRadius: 10, alignItems: "center" },
  primaryTxt: { color: "#fff", fontWeight: "bold" },

  pagination: { marginTop: 10, color: UI.sub },
  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
