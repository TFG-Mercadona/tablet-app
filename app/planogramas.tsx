// app/planogramas/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const planogramaUrl = (tiendaId: string, familia: string) =>
  `${API_BASE_URL}/api/planogramas/tienda/${encodeURIComponent(tiendaId)}/familia/${encodeURIComponent(familia)}/pdf`;

const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
};

type FamiliaItem = { name: string; image: any };
const FAMILIAS: FamiliaItem[] = [
  { name: "Lácteos Mural", image: require("@/assets/images/lacteos.png") },
  { name: "Leche Muralita", image: require("@/assets/images/leche.png") },
  {
    name: "Platos Preparados Refrigerados Mural",
    image: require("@/assets/images/platos.png"),
  },
  { name: "Zumo Muralita", image: require("@/assets/images/zumo.png") },
  { name: "Charcutería", image: require("@/assets/images/charcuteria.png") },
];

export default function PlanogramasIndex() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const { height } = Dimensions.get("window");

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  const openPlanograma = async (familia: string) => {
    if (!tiendaId) return;
    const url = planogramaUrl(tiendaId, familia);

    if (Platform.OS === "web") {
      // Web: nueva pestaña
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // Nativo: intenta abrir con visor externo; si no, usa nuestro visor interno
    const can = await Linking.canOpenURL(url);
    if (can) {
      try {
        await Linking.openURL(url);
        return;
      } catch {}
    }
    router.push({
      pathname: "/planogramas/view",
      params: { url, familia, tiendaId },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { minHeight: height }]}
      >
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
              <Text style={styles.appBarTitle}>Planogramas</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Lista familias */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Familias</Text>
          {FAMILIAS.map((f, i) => (
            <TouchableOpacity
              key={f.name}
              onPress={() => openPlanograma(f.name)}
              activeOpacity={0.85}
            >
              <View style={styles.row}>
                <View style={styles.leftWrap}>
                  <Image source={f.image} style={styles.icon} />
                  <Text style={styles.rowText} numberOfLines={2}>
                    {f.name}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
              {i < FAMILIAS.length - 1 && <View style={styles.divider} />}
            </TouchableOpacity>
          ))}
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

const MAX_W = 860;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, alignItems: "center", backgroundColor: UI.bg },

  appBar: {
    width: "100%",
    maxWidth: MAX_W,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 16,
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

  card: {
    width: "100%",
    maxWidth: MAX_W,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "web" ? 0.05 : 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: UI.text,
    marginBottom: 8,
  },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  leftWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  icon: { width: 40, height: 40, marginRight: 12, resizeMode: "contain" },
  rowText: { fontSize: 16, fontWeight: "700", color: UI.text, flexShrink: 1 },
  chevron: { fontSize: 22, color: UI.sub, paddingHorizontal: 6 },
  divider: { height: 1, backgroundColor: UI.border, marginLeft: 54 },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
