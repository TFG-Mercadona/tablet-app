// app/planogramas/view.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

let WebView: any = null;
if (Platform.OS !== "web") {
  try {
    // requiere: expo install react-native-webview
    // @ts-ignore
    WebView = require("react-native-webview").WebView;
  } catch {
    WebView = null;
  }
}

const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
};

export default function PlanogramaView() {
  const router = useRouter();
  const { url, familia, tiendaId } = useLocalSearchParams<{
    url?: string;
    familia?: string;
    tiendaId?: string;
  }>();

  // En web: intenta abrir automáticamente en pestaña nueva al entrar
  useEffect(() => {
    if (Platform.OS === "web" && url) {
      window.open(String(url), "_blank", "noopener,noreferrer");
    }
  }, [url]);

  return (
    <View style={styles.screen}>
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
            <Text style={styles.appBarTitle}>{familia ?? "Planograma"}</Text>
            <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Visor */}
      <View style={styles.viewerCard}>
        {Platform.OS === "web" ? (
          <Text style={{ color: UI.sub }}>
            Se ha intentado abrir el PDF en una pestaña nueva. Si tu navegador
            lo ha bloqueado,{" "}
            <Text
              style={{ fontWeight: "700", textDecorationLine: "underline" }}
              onPress={() => window.open(String(url), "_blank", "noopener,noreferrer")}
            >
              pulsa aquí para abrirlo manualmente
            </Text>
            .
          </Text>
        ) : WebView ? (
          <WebView
            source={{ uri: String(url) }}
            style={{ flex: 1, borderRadius: 12 }}
            startInLoadingState
          />
        ) : (
          <Text style={{ color: UI.sub }}>
            Falta instalar <Text style={{ fontWeight: "700" }}>react-native-webview</Text>.
          </Text>
        )}
      </View>
    </View>
  );
}

const MAX_W = 1000;
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.bg,
    padding: 20,
    alignItems: "center",
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

  viewerCard: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_W,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
  },
});
