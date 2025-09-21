// app/revisar.tsx
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  red: "#E11D48",
  amber: "#F59E0B",
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

type TornilloBasic = { fechaRetirada: string | null };

const parseYMD = (s: string) =>
  new Date(
    Number(s.slice(0, 4)),
    Number(s.slice(5, 7)) - 1,
    Number(s.slice(8, 10)),
  );
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function RevisarScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [counts, setCounts] = useState<
    Record<string, { cad: number; hoy: number }>
  >({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  const { height } = Dimensions.get("window");

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  // Cargar contadores por familia
  useEffect(() => {
    const loadForFamilias = async () => {
      if (!tiendaId) return;
      try {
        setLoadingCounts(true);
        const today = startOfDay(new Date()).getTime();

        const entries = await Promise.all(
          FAMILIAS.map(async (f) => {
            const famEnc = encodeURIComponent(f.name);
            const res = await fetch(
              `${API_BASE_URL}/api/tornillos/tienda/${tiendaId}/familia/${famEnc}`,
            );
            if (!res.ok) return [f.name, { cad: 0, hoy: 0 }] as const;

            const data: TornilloBasic[] = await res.json();
            let cad = 0,
              hoy = 0;
            for (const t of data) {
              if (!t.fechaRetirada) continue;
              const fr = startOfDay(parseYMD(t.fechaRetirada)).getTime();
              if (fr < today) cad += 1;
              else if (fr === today) hoy += 1;
            }
            return [f.name, { cad, hoy }] as const;
          }),
        );

        setCounts(Object.fromEntries(entries));
      } catch {
        setCounts({});
      } finally {
        setLoadingCounts(false);
      }
    };
    loadForFamilias();
  }, [tiendaId]);

  const handlePress = (familia: string) => {
    router.push({ pathname: "/nevera", params: { familia, tiendaId } });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { minHeight: height }]}
      >
        {/* App bar simple con back */}
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
              <Text style={styles.appBarTitle}>Revisar</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Lista de familias */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Familias</Text>

          {FAMILIAS.map((item, idx) => {
            const c = counts[item.name];
            return (
              <TouchableOpacity
                key={item.name + idx}
                onPress={() => handlePress(item.name)}
                activeOpacity={0.85}
              >
                <View style={styles.row}>
                  <View style={styles.leftWrap}>
                    <Image source={item.image} style={styles.icon} />
                    <Text style={styles.rowText} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>

                  {/* COLUMNA DE CONTADORES CON ANCHO FIJO */}
                  <View style={styles.rightWrap}>
                    <View style={styles.counterRow}>
                      <View style={[styles.dot, { backgroundColor: UI.red }]} />
                      {loadingCounts ? (
                        <ActivityIndicator />
                      ) : (
                        <Text style={styles.counterText}>
                          {c?.cad ?? 0}{" "}
                          <Text style={styles.counterSub}>caducados</Text>
                        </Text>
                      )}
                    </View>

                    <View style={styles.counterRow}>
                      <View
                        style={[styles.dot, { backgroundColor: UI.amber }]}
                      />
                      {loadingCounts ? (
                        <ActivityIndicator />
                      ) : (
                        <Text style={styles.counterText}>
                          {c?.hoy ?? 0}{" "}
                          <Text style={styles.counterSub}>retirar hoy</Text>
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </View>

                {idx < FAMILIAS.length - 1 && <View style={styles.divider} />}
              </TouchableOpacity>
            );
          })}
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
const COUNTERS_W = 180; // ancho fijo para alinear las bolitas verticalmente

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
  divider: { height: 1, backgroundColor: UI.border, marginLeft: 54 },
  icon: { width: 40, height: 40, marginRight: 12, resizeMode: "contain" },

  leftWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  rowText: { fontSize: 16, fontWeight: "700", color: UI.text, flexShrink: 1 },

  // Columna derecha con ancho fijo para alinear los puntos en vertical
  rightWrap: {
    width: COUNTERS_W,
    alignItems: "flex-start", // contenido pegado a la izquierda del bloque fijo
    gap: 6,
  },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  counterText: { fontSize: 14, color: UI.text, fontWeight: "700" },
  counterSub: { fontWeight: "400", color: UI.sub },

  chevron: { fontSize: 22, color: UI.sub, paddingHorizontal: 6 },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
