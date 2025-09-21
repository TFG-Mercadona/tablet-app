import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  Platform, Dimensions, TextInput, ActivityIndicator, Alert,
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

export default function EditarTornilloScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);

  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [codigoBuscar, setCodigoBuscar] = useState("");
  const [familia, setFamilia] = useState("");
  const [nombreModulo, setNombreModulo] = useState("");
  const [fila, setFila] = useState("");
  const [columna, setColumna] = useState("");
  const [fechaCaducidad, setFechaCaducidad] = useState("");
  const [caducidadDias, setCaducidadDias] = useState("");

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  const buscar = async () => {
    if (!tiendaId || !codigoBuscar) {
      Alert.alert("Atención", "Introduce tienda y código de producto.");
      return;
    }
    try {
      setBuscando(true);
      // ejemplo real de carga al DTO de detalle:
      const res = await fetch(`${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/producto/${codigoBuscar}`);
      if (!res.ok) throw new Error(`No encontrado (${res.status})`);
      const dto = await res.json();

      setFamilia(dto.familia ?? "");
      setNombreModulo(dto.nombreModulo ?? "");
      setFila(String(dto.fila ?? ""));
      setColumna(String(dto.columna ?? ""));
      setFechaCaducidad(dto.fechaCaducidad ? dto.fechaCaducidad.slice(0, 10) : "");
      setCaducidadDias(dto.caducidadDias != null ? String(dto.caducidadDias) : "");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo cargar el tornillo.");
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async () => {
    if (!tiendaId || !codigoBuscar) return;
    try {
      setGuardando(true);
      // 1) Obtener id por tienda+producto para editar (si tu backend lo requiere)
      const res0 = await fetch(`${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/producto/${codigoBuscar}`);
      if (!res0.ok) throw new Error("No se pudo resolver el tornillo.");
      const dto = await res0.json();

      // 2) Guardar fecha de caducidad (ejemplo ya existente)
      if (fechaCaducidad) {
        const res = await fetch(`${API_BASE_URL}/api/tornillos/${dto.id}/fecha-caducidad`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaCaducidad }),
        });
        if (!res.ok) throw new Error(`Error guardando fecha (${res.status})`);
      }

      // 3) TODO: si quieres, otro endpoint para mover módulo/fila/columna, caducidadDias, etc.

      Alert.alert("Guardado", "Cambios aplicados.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { minHeight: Dimensions.get("window").height }]}
      >
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Image source={require("@/assets/images/back.png")} style={styles.backIcon} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Editar tornillo</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buscar</Text>
        
          <View style={[styles.row2, { alignItems: 'center', justifyContent: 'center', marginBottom: 16 }]}>
            <View style={[styles.field, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.label}>Código de producto</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={codigoBuscar}
                onChangeText={setCodigoBuscar}
                placeholder="Ej: 123456"
              />
            </View>
            <View style={{ width: 16 }} />
            <TouchableOpacity
              style={[styles.primaryBtn, { width: 110, marginTop: 15, paddingVertical: 10 }]}
              onPress={buscar}
              disabled={buscando}
            >
              {buscando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryTxt}>Cargar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Editar datos</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Familia</Text>
            <TextInput style={styles.input} value={familia} onChangeText={setFamilia} placeholder="Familia" />
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Módulo</Text>
              <TextInput style={styles.input} value={nombreModulo} onChangeText={setNombreModulo} placeholder="Puerta 1" />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 100 }]}>
              <Text style={styles.label}>Fila</Text>
              <TextInput style={styles.input} value={fila} onChangeText={setFila} keyboardType="numeric" />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 110 }]}>
              <Text style={styles.label}>Columna</Text>
              <TextInput style={styles.input} value={columna} onChangeText={setColumna} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Fecha de caducidad (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={fechaCaducidad} onChangeText={setFechaCaducidad} placeholder="YYYY-MM-DD" />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 160 }]}>
              <Text style={styles.label}>Caducidad (días)</Text>
              <TextInput style={styles.input} value={caducidadDias} onChangeText={setCaducidadDias} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}>
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Guardar cambios</Text>}
          </TouchableOpacity>
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

  field: { marginBottom: 10 },
  label: { color: UI.sub, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: UI.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: UI.text,
  },

  row2: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },

  primaryBtn: {
    marginTop: 8, width: "100%", paddingVertical: 12, backgroundColor: UI.green,
    borderRadius: 10, alignItems: "center",
  },
  primaryTxt: { color: "#fff", fontWeight: "bold" },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
