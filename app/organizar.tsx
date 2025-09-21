import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  Platform, Dimensions, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  green: "#0F8A2F",
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// Placeholder: selecciona una familia fija o en el futuro pon un selector
const DEFAULT_FAMILIA = "Lácteos Mural";

export default function OrganizarScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [modulos, setModulos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  useEffect(() => {
    const fetchModulos = async () => {
      if (!tiendaId) return;
      try {
        setLoading(true);
        const famEnc = encodeURIComponent(DEFAULT_FAMILIA);
        const res = await fetch(`${API_BASE_URL}/api/tornillos/tienda/${tiendaId}/familia/${famEnc}/modulos`);
        if (!res.ok) throw new Error(`Error ${res.status} cargando módulos`);
        const list: string[] = await res.json();
        setModulos(list ?? []);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudieron cargar los módulos.");
        setModulos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchModulos();
  }, [tiendaId]);

  const goEditarModulo = (nombreModulo: string) => {
    // En el futuro puedes crear /organizar/[modulo].tsx para edición avanzada
    Alert.alert("Editar módulo", `Abrir editor para: ${nombreModulo}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { minHeight: Dimensions.get("window").height }]}
      >
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Image source={require("@/assets/images/back.png")} style={styles.backIcon} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Organizar neveras</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"} · {DEFAULT_FAMILIA}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Lista de módulos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Módulos</Text>

          {loading ? (
            <ActivityIndicator />
          ) : modulos.length === 0 ? (
            <Text style={{ color: UI.sub }}>No hay módulos configurados.</Text>
          ) : (
            modulos.map((m, i) => (
              <View key={m + i}>
                <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => goEditarModulo(m)}>
                  <Image source={require("@/assets/images/settings.png")} style={styles.icon} />
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowText}>{m}</Text>
                    <Text style={styles.rowSub}>Editar filas/columnas, orden y planograma</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                {i < modulos.length - 1 && <View style={styles.divider} />}
              </View>
            ))
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
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: UI.text, marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  divider: { height: 1, backgroundColor: UI.border, marginVertical: 6 },
  icon: { width: 26, height: 26, marginRight: 12, resizeMode: "contain" },
  rowTextWrap: { flex: 1 },
  rowText: { fontSize: 16, fontWeight: "700", color: UI.text },
  rowSub: { fontSize: 12, color: UI.sub, marginTop: 2 },
  chevron: { fontSize: 22, color: UI.sub, paddingHorizontal: 6 },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
