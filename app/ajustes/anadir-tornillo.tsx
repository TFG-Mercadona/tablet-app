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
  red: "#E11D48",
  amber: "#F59E0B",
  green: "#0F8A2F",
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** Helper: alert cross-platform (nativo y web) */
function showAlert(
  title: string,
  message: string,
  onOk?: () => void
) {
  if (Platform.OS === "web") {
    window.alert((title ? title + "\n\n" : "") + message);
    onOk?.();
  } else {
    Alert.alert(title, message, [{ text: "OK", onPress: onOk }]);
  }
}

export default function AnadirTornilloScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [productoCodigo, setProductoCodigo] = useState("");
  const [familia, setFamilia] = useState("");
  const [nombreModulo, setNombreModulo] = useState("");
  const [fila, setFila] = useState("");
  const [columna, setColumna] = useState("");
  const [fechaCaducidad, setFechaCaducidad] = useState(""); // YYYY-MM-DD
  const [caducidadDias, setCaducidadDias] = useState("");

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  const submit = async () => {
    if (!tiendaId) {
      showAlert("Falta tienda", "No se pudo leer tiendaId.");
      return;
    }
    if (!productoCodigo || !familia || !nombreModulo || !fila || !columna) {
      showAlert(
        "Campos incompletos",
        "Rellena al menos: código, familia, módulo, fila y columna."
      );
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/tornillos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiendaId: Number(tiendaId),
          productoCodigo: Number(productoCodigo),
          familia,
          nombreModulo,
          fila: Number(fila),
          columna: Number(columna),
          fechaCaducidad: fechaCaducidad || null,
          caducidadDias: caducidadDias ? Number(caducidadDias) : null,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);

      showAlert("Guardado", "Tornillo añadido correctamente.", () => router.back());
    } catch (e: any) {
      showAlert("Error", e?.message ?? "No se pudo guardar.");
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
              <Text style={styles.appBarTitle}>Añadir tornillo</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos del tornillo</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Código de producto</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={productoCodigo}
              onChangeText={setProductoCodigo}
              placeholder="Ej: 123456"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Familia</Text>
            <TextInput
              style={styles.input}
              value={familia}
              onChangeText={setFamilia}
              placeholder="Ej: Lácteos Mural"
            />
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Módulo (Puerta)</Text>
              <TextInput
                style={styles.input}
                value={nombreModulo}
                onChangeText={setNombreModulo}
                placeholder="Ej: Puerta 1"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 100 }]}>
              <Text style={styles.label}>Fila</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={fila}
                onChangeText={setFila}
                placeholder="1"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 110 }]}>
              <Text style={styles.label}>Columna</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={columna}
                onChangeText={setColumna}
                placeholder="1"
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Fecha de caducidad (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={fechaCaducidad}
                onChangeText={setFechaCaducidad}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 160 }]}>
              <Text style={styles.label}>Caducidad (días)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={caducidadDias}
                onChangeText={setCaducidadDias}
                placeholder="Ej: 10"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryTxt}>Guardar</Text>
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

  row2: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },

  primaryBtn: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 12,
    backgroundColor: UI.green,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryTxt: { color: "#fff", fontWeight: "bold" },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
