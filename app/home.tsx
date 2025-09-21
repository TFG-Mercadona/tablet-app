// app/home.tsx
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
  bg: "#FFFFFF", // fondo blanco a full
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  red: "#E11D48",
  amber: "#F59E0B",
};

type TornilloBasic = {
  fechaRetirada: string | null;
};

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

export default function HomeScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);

  const [loadingCounts, setLoadingCounts] = useState(true);
  const [caducados, setCaducados] = useState<number>(0);
  const [retirarHoy, setRetirarHoy] = useState<number>(0);

  // alto de ventana para forzar llenado en blanco
  const { height } = Dimensions.get("window");

  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem("tiendaId");
        if (id) setTiendaId(id);
      } catch {
        // noop
      }
    })();
  }, []);

  // cargar contadores desde backend
  useEffect(() => {
    const loadCounts = async () => {
      if (!tiendaId) return;
      try {
        setLoadingCounts(true);
        const res = await fetch(
          `${API_BASE_URL}/api/tornillos/tienda/${tiendaId}`,
        );
        if (!res.ok) throw new Error("No se pudieron cargar tornillos");
        const data: TornilloBasic[] = await res.json();

        const hoy = startOfDay(new Date()).getTime();

        let cad = 0;
        let hoyCount = 0;
        for (const t of data) {
          if (!t.fechaRetirada) continue;
          const fr = startOfDay(parseYMD(t.fechaRetirada)).getTime();
          if (fr < hoy) cad += 1;
          else if (fr === hoy) hoyCount += 1;
        }
        setCaducados(cad);
        setRetirarHoy(hoyCount);
      } catch {
        // si falla, dejamos 0
        setCaducados(0);
        setRetirarHoy(0);
      } finally {
        setLoadingCounts(false);
      }
    };
    loadCounts();
  }, [tiendaId]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { minHeight: height }]} // llena pantalla en blanco
      >
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <Image
              source={require("@/assets/images/calendar-alert.png")}
              style={styles.headerIcon}
            />
            <View>
              <Text style={styles.appBarTitle}>Tienda {tiendaId ?? "…"}</Text>
              <Text style={styles.appBarSub}>
                {tiendaId ?? "Cargando…"} | PROD | v1300
              </Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Tareas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tareas</Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/revisar")}
            activeOpacity={0.85}
          >
            <Image
              source={require("@/assets/images/search.png")}
              style={styles.icon}
            />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Revisar</Text>
              <Text style={styles.rowSub}>Revisa cámaras por familias</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/contrastar")}
            activeOpacity={0.85}
          >
            <Image
              source={require("@/assets/images/contrastar.png")}
              style={styles.icon}
            />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Contrastar</Text>
              <Text style={styles.rowSub}>
                Contrasta los tornillos controlados hoy
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/resumen")}
            activeOpacity={0.85}
          >
            <Image
              source={require("@/assets/images/resume.png")}
              style={styles.icon}
            />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Resumen</Text>
              <Text style={styles.rowSub}>
                Obten información sobre los controles realizados
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/ajustes")}
            activeOpacity={0.85}
          >
            <Image
              source={require("@/assets/images/settings.png")}
              style={styles.icon}
            />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Ajustes</Text>
              <Text style={styles.rowSub}>Preferencias y sincronización</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* EAC */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EAC</Text>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: UI.red }]} />
            {loadingCounts ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.statusText}>
                {caducados}{" "}
                <Text style={styles.statusTextSub}>
                  productos con caducados
                </Text>
              </Text>
            )}
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: UI.amber }]} />
            {loadingCounts ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.statusText}>
                {retirarHoy}{" "}
                <Text style={styles.statusTextSub}>
                  productos próximos a retirar
                </Text>
              </Text>
            )}
          </View>
        </View>

        {/* Pie */}
        <View style={{ height: 12 }} />
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
  screen: {
    flex: 1,
    backgroundColor: UI.bg, // blanco a toda pantalla
  },
  container: {
    padding: 20,
    alignItems: "center",
    backgroundColor: UI.bg, // también blanco dentro del scroll
  },

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
  headerIcon: { width: 40, height: 40, resizeMode: "contain" },
  appBarTitle: { fontSize: 22, fontWeight: "800", color: UI.text },
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

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  divider: { height: 1, backgroundColor: UI.border, marginVertical: 6 },
  icon: { width: 26, height: 26, marginRight: 12 }, // sin tintColor => respeta el PNG
  rowTextWrap: { flex: 1 },
  rowText: { fontSize: 18, fontWeight: "700", color: UI.text },
  rowSub: { fontSize: 12, color: UI.sub, marginTop: 2 },
  chevron: { fontSize: 22, color: UI.sub, paddingHorizontal: 6 },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
  },
  statusDot: { width: 16, height: 16, borderRadius: 8 },
  statusText: { fontSize: 16, color: UI.text, fontWeight: "700" },
  statusTextSub: { fontWeight: "400", color: UI.sub },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
