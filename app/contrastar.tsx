// app/contrastar/index.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  Platform, Dimensions, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const UI = {
  bg: "#FFFFFF", card: "#FFFFFF", border: "#E5E7EB",
  text: "#111827", sub: "#6B7280",
  red: "#E11D48", amber: "#F59E0B",
};

type FamiliaItem = { name: string; image: any };
const FAMILIAS: FamiliaItem[] = [
  { name: "Lácteos Mural", image: require("@/assets/images/lacteos.png") },
  { name: "Leche Muralita", image: require("@/assets/images/leche.png") },
  { name: "Platos Preparados Refrigerados Mural", image: require("@/assets/images/platos.png") },
  { name: "Zumo Muralita", image: require("@/assets/images/zumo.png") },
  { name: "Charcutería", image: require("@/assets/images/charcuteria.png") },
];

// DTO mínimo del backend para contrastes de hoy (solo usamos length)
type CambioDTO = {
  id: number;              // id historial (o cualquier id de cambio)
  tornilloId: number;
  productoCodigo: number;
  tiendaId: number;
  familia: string;
  nombreModulo: string;
  fila: number;
  columna: number;
  nombre: string;
  imagenUrl?: string | null;
  fechaAnterior: string | null;  // "YYYY-MM-DD"
  fechaNueva: string | null;     // "YYYY-MM-DD"
  fechaCambio: string;           // ISO time
  caducidadDias?: number | null; // opcional
};

export default function ContrastarIndex() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const { height } = Dimensions.get("window");

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!tiendaId) return;
      try {
        setLoadingCounts(true);
        const entries = await Promise.all(
          FAMILIAS.map(async f => {
            const famEnc = encodeURIComponent(f.name);
            const res = await fetch(`${API_BASE_URL}/api/contrastar/tienda/${tiendaId}/familia/${famEnc}/hoy`);
            if (!res.ok) return [f.name, 0] as const;
            const data: CambioDTO[] = await res.json();
            return [f.name, data.length] as const;
          })
        );
        setCounts(Object.fromEntries(entries));
      } finally {
        setLoadingCounts(false);
      }
    };
    load();
  }, [tiendaId]);

  const goFamilia = (familia: string) => {
    router.push({ pathname: "/contrastar/familia", params: { tiendaId, familia } });
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { minHeight: height }]}>
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Image source={require("@/assets/images/back.png")} style={styles.backIcon} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Contrastar</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Familias */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Familias (cambios de hoy sin contrastar)</Text>
          {FAMILIAS.map((f, i) => (
            <TouchableOpacity key={f.name} onPress={() => goFamilia(f.name)} activeOpacity={0.85}>
              <View style={styles.row}>
                <View style={styles.leftWrap}>
                  <Image source={f.image} style={styles.icon} />
                  <Text style={styles.rowText} numberOfLines={2}>{f.name}</Text>
                </View>
                <View style={styles.rightWrap}>
                  {loadingCounts ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.badge}>{counts[f.name] ?? 0}</Text>
                  )}
                  <Text style={styles.chevron}>›</Text>
                </View>
              </View>
              {i < FAMILIAS.length - 1 && <View style={styles.divider} />}
            </TouchableOpacity>
          ))}
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
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: UI.text, marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  leftWrap: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  icon: { width: 40, height: 40, marginRight: 12, resizeMode: "contain" },
  rowText: { fontSize: 16, fontWeight: "700", color: UI.text, flexShrink: 1 },

  rightWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { minWidth: 28, textAlign: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F3F4F6", color: UI.text, fontWeight: "700" },
  chevron: { fontSize: 22, color: UI.sub, paddingHorizontal: 6 },

  divider: { height: 1, backgroundColor: UI.border, marginLeft: 54 },
  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
