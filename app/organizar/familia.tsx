// app/organizar/familia.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const MOVE_ENDPOINT = (id: number) =>
  `${API_BASE_URL}/api/tornillos/${id}/posicion`;

const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  red: "#E11D48",
  amber: "#F59E0B",
  green: "#2ecc71",
  orange: "#ff9800",
  gray: "#9e9e9e",
};

type Tornillo = {
  id: number;
  productoCodigo: number;
  tiendaId: number;
  fechaCaducidad: string | null;
  fechaRetirada: string | null;
  nombreModulo: string;
  fila: number;
  columna: number;
  nombre: string;
  imagenUrl?: string | null;
};

const parseYMD = (s: string) =>
  new Date(
    Number(s.slice(0, 4)),
    Number(s.slice(5, 7)) - 1,
    Number(s.slice(8, 10)),
  );
const getStatusColor = (fecha: string | null) => {
  if (!fecha) return UI.gray;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const f = parseYMD(fecha);
  f.setHours(0, 0, 0, 0);
  if (f.getTime() > today.getTime()) return UI.green;
  if (f.getTime() === today.getTime()) return UI.orange;
  return UI.red;
};

export default function OrganizarFamilia() {
  const router = useRouter();
  const params = useLocalSearchParams<{ familia?: string }>();
  const [tiendaId, setTiendaId] = useState<string | null>(null);

  const [modulos, setModulos] = useState<string[]>([]);
  const [modIndex, setModIndex] = useState(0);
  const moduloActual = modulos[modIndex] ?? "Puerta 1";

  const [items, setItems] = useState<Tornillo[]>([]);
  const [maxFila, setMaxFila] = useState(0);
  const [loadingMods, setLoadingMods] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // selección para mover
  const [selected, setSelected] = useState<Tornillo | null>(null);

  /* init */
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingMods(true);
        const id = await AsyncStorage.getItem("tiendaId");
        if (!id || !params.familia) throw new Error("Falta tienda o familia");
        setTiendaId(id);

        const familia = encodeURIComponent(String(params.familia));
        const res = await fetch(
          `${API_BASE_URL}/api/tornillos/tienda/${id}/familia/${familia}/modulos`,
        );
        if (!res.ok) throw new Error("Error cargando módulos");
        const lista: string[] = await res.json();
        setModulos(lista?.length ? lista : ["Puerta 1"]);
        setModIndex(0);
      } catch (e: any) {
        setError(e.message ?? "Error cargando módulos");
      } finally {
        setLoadingMods(false);
      }
    };
    init();
  }, [params.familia]);

  const fetchItems = useCallback(async () => {
    if (!tiendaId || !params.familia || !moduloActual) return;
    try {
      setLoadingItems(true);
      setError(null);

      const familia = encodeURIComponent(String(params.familia));
      const modulo = encodeURIComponent(moduloActual);
      const url = `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/familia/${familia}/modulo/${modulo}?ts=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" } as RequestInit);
      if (!res.ok) throw new Error("Error cargando productos");
      const data: Tornillo[] = await res.json();
      setItems(data);
      setMaxFila(data.length ? Math.max(...data.map((t) => t.fila)) : 0);
      // si cambiamos de módulo, deseleccionamos
      setSelected(null);
    } catch (e: any) {
      setError(e.message ?? "Error cargando productos");
      setItems([]);
      setMaxFila(0);
    } finally {
      setLoadingItems(false);
    }
  }, [tiendaId, params.familia, moduloActual]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems]),
  );
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* helpers */
  const byPos = useMemo(() => {
    const m = new Map<string, Tornillo>();
    for (const t of items) m.set(`${t.fila}-${t.columna}`, t);
    return m;
  }, [items]);

  const onCellPress = (fila: number, columna: number) => {
    const key = `${fila}-${columna}`;
    const t = byPos.get(key) ?? null;

    if (!selected) {
      // seleccionar origen
      if (t) setSelected(t);
      return;
    }

    // ya hay seleccionado => intentar mover/swap al destino (t puede ser null = hueco vacío)
    const sameCell =
      selected.fila === fila &&
      selected.columna === columna &&
      selected.nombreModulo === moduloActual;
    if (sameCell) {
      setSelected(null);
      return;
    }

    const doMove = async () => {
      try {
        // 1) si hay ocupado, SWAP
        if (t) {
          // a) mover destino -> origen del seleccionado
          const res1 = await fetch(MOVE_ENDPOINT(t.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombreModulo: selected.nombreModulo,
              fila: selected.fila,
              columna: selected.columna,
            }),
          });
          if (!res1.ok) throw new Error("No se pudo mover el destino");

          // b) mover seleccionado -> destino
          const res2 = await fetch(MOVE_ENDPOINT(selected.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombreModulo: moduloActual, fila, columna }),
          });
          if (!res2.ok) throw new Error("No se pudo mover el origen");
        } else {
          // mover simple a hueco vacío
          const res = await fetch(MOVE_ENDPOINT(selected.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombreModulo: moduloActual, fila, columna }),
          });
          if (!res.ok) throw new Error("No se pudo mover");
        }

        // refrescar datos del módulo destino (y origen si cambió de módulo)
        await fetchItems();
        setSelected(null);

        const okMsg = t ? "Intercambio realizado" : "Producto recolocado";
        if (Platform.OS === "web") window.alert(okMsg);
        else Alert.alert("OK", okMsg);
      } catch (e: any) {
        const msg = e.message ?? "Error al mover";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      }
    };

    const texto = t
      ? `¿Intercambiar "${selected.nombre}" con "${t.nombre}" en ${moduloActual} [${fila}, ${columna}]?`
      : `¿Mover "${selected.nombre}" a ${moduloActual} [${fila}, ${columna}]?`;

    if (Platform.OS === "web") {
      if (window.confirm(texto)) doMove();
    } else {
      Alert.alert("Confirmar", texto, [
        { text: "Cancelar" },
        { text: "Aceptar", onPress: doMove },
      ]);
    }
  };

  /* UI */
  const prevModulo = () => setModIndex((i) => Math.max(0, i - 1));
  const nextModulo = () =>
    setModIndex((i) => Math.min(modulos.length - 1, i + 1));

  const renderRow = (fila: number) => {
    const cols = items
      .filter((t) => t.fila === fila)
      .sort((a, b) => a.columna - b.columna);
    const maxCol = cols.length ? Math.max(...cols.map((t) => t.columna)) : 0;
    const colIndices = maxCol
      ? Array.from({ length: maxCol }, (_, i) => i + 1)
      : [];

    return (
      <View key={`row-${fila}`} style={styles.row}>
        {colIndices.map((col) => {
          const key = `${fila}-${col}`;
          const t = byPos.get(key) ?? null;

          return (
            <TouchableOpacity
              key={key}
              style={{ flex: 1 }}
              onPress={() => onCellPress(fila, col)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.cell,
                  selected && t?.id === selected.id && styles.cellSelected,
                  !t && styles.cellEmpty,
                ]}
              >
                {t ? (
                  <>
                    <Image
                      style={styles.image}
                      source={{
                        uri: `${API_BASE_URL}/images/productos/${t.productoCodigo}.png`,
                      }}
                    />
                    <View style={styles.infoCol}>
                      <Text style={styles.codigo}>{t.productoCodigo}</Text>
                      <View style={styles.nameLine}>
                        <Text style={styles.nombre} numberOfLines={2}>
                          {t.nombre}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBall,
                          { backgroundColor: getStatusColor(t.fechaRetirada) },
                        ]}
                      />
                    </View>
                  </>
                ) : (
                  <Text style={styles.emptyHint}>Vacío</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const rows = Array.from({ length: maxFila }, (_, i) => i + 1);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
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
              <Text style={styles.appBarTitle}>
                {params.familia ?? "Familia"}
              </Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* header módulo + navegación */}
          <View style={styles.moduleHeader}>
            <TouchableOpacity
              onPress={prevModulo}
              disabled={modIndex === 0}
              style={[styles.arrowBtn, modIndex === 0 && styles.arrowDisabled]}
            >
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
              <Text style={styles.moduleTitle}>{moduloActual}</Text>
              {selected && (
                <Text style={styles.moduleSub}>
                  Seleccionado: {selected.productoCodigo} {selected.nombre} ·
                  toca otro tornillo para mover
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={nextModulo}
              disabled={modIndex >= modulos.length - 1}
              style={[
                styles.arrowBtn,
                modIndex >= modulos.length - 1 && styles.arrowDisabled,
              ]}
            >
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {loadingMods || loadingItems ? (
            <ActivityIndicator size="large" style={{ marginTop: 24 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            rows.map(renderRow)
          )}

          {modulos.length > 0 && (
            <Text style={styles.pagination}>
              {modIndex + 1} / {modulos.length}
            </Text>
          )}
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
const CELL_IMG = 60;

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

  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  moduleTitle: { fontSize: 18, fontWeight: "800", color: UI.text },
  moduleSub: { marginTop: 2, color: UI.sub, fontSize: 12 },

  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI.border,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.35 },
  arrowText: { fontSize: 24, lineHeight: 24, color: UI.sub },

  row: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 10,
    justifyContent: "center",
    gap: 8,
  },
  cell: {
    flex: 1,
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 12,
    backgroundColor: UI.card,
  },
  cellEmpty: { justifyContent: "center" },
  cellSelected: { borderColor: "#4F46E5", borderWidth: 2 },

  image: {
    width: CELL_IMG,
    height: CELL_IMG,
    resizeMode: "contain",
    marginRight: 12,
  },

  infoCol: {
    height: CELL_IMG,
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexShrink: 1,
  },
  codigo: { fontSize: 14, fontWeight: "800", color: UI.text },
  nameLine: { flexGrow: 1, justifyContent: "center", width: "100%" },
  nombre: { fontSize: 14, color: UI.text },

  statusBall: { width: 14, height: 14, borderRadius: 7 },

  emptyHint: { color: UI.sub, fontStyle: "italic", textAlign: "center" },

  pagination: { marginTop: 12, color: UI.sub, textAlign: "center" },
  error: { color: UI.red, marginTop: 16, textAlign: "center" },
  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
