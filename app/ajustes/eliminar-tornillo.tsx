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
  TextInput,
  ActivityIndicator,
  Alert,
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
  red: "#E11D48",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** Alert cross-platform (web + nativo) */
function showAlert(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === "web") {
    window.alert((title ? title + "\n\n" : "") + message);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
  }
}

/** Confirm cross-platform: devuelve promesa boolean */
function showConfirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const ok = window.confirm((title ? title + "\n\n" : "") + message);
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Eliminar", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export default function EliminarTornilloScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  const eliminar = async () => {
    if (!tiendaId || !codigo) {
      showAlert("Atención", "Introduce tienda y código de producto.");
      return;
    }

    const ok = await showConfirm(
      "Confirmación",
      `¿Seguro que quieres eliminar el control del producto ${codigo}?`
    );
    if (!ok) return;

    try {
      setLoading(true);

      // 1) Resolver id del tornillo por tienda+producto
      const res0 = await fetch(
        `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/producto/${codigo}`
      );
      if (!res0.ok) throw new Error("No se pudo localizar el tornillo.");
      const dto = await res0.json();

      // 2) Borrado
      const res = await fetch(`${API_BASE_URL}/api/tornillos/${dto.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Error eliminando (${res.status})`);

      showAlert("Eliminado", "Tornillo eliminado del control.", () => router.back());
    } catch (e: any) {
      showAlert("Error", e?.message ?? "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.container,
          { minHeight: Dimensions.get("window").height },
        ]}
      >
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
              <Text style={styles.appBarTitle}>Eliminar tornillo</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Confirmación</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Código de producto</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={codigo}
              onChangeText={setCodigo}
              placeholder="Ej: 123456"
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteBtn, loading && { opacity: 0.6 }]}
            onPress={eliminar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteTxt}>Eliminar</Text>
            )}
          </TouchableOpacity>
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

  field: { marginBottom: 10 },
  label: { color: UI.sub, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: UI.text,
  },

  deleteBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 12,
    backgroundColor: UI.red,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteTxt: { color: "#fff", fontWeight: "bold" },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
