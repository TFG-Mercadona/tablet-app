// app/nevera.tsx
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { useEffect, useState, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/* ===== UI palette como revisar.tsx ===== */
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

/* ===== Helpers fecha/estado ===== */
const parseYMD = (s: string) =>
  new Date(
    Number(s.slice(0, 4)),
    Number(s.slice(5, 7)) - 1,
    Number(s.slice(8, 10)),
  );

const isPast = (s?: string | null) => {
  if (!s) return false;
  const d = parseYMD(s);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

// Colores por FECHA DE RETIRADA (verde / naranja hoy / rojo)
const getStatusColor = (fecha: string | null) => {
  if (!fecha) return UI.gray;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const f = parseYMD(fecha);
  f.setHours(0, 0, 0, 0);
  if (f.getTime() > today.getTime()) return UI.green; // futura
  if (f.getTime() === today.getTime()) return UI.orange; // hoy
  return UI.red; // pasada
};

export default function NeveraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ familia?: string }>();

  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [modulos, setModulos] = useState<string[]>([]);
  const [modIndex, setModIndex] = useState(0);
  const moduloActual = modulos[modIndex] ?? "Puerta 1";

  const [tornillos, setTornillos] = useState<Tornillo[]>([]);
  const [maxFila, setMaxFila] = useState(0);

  const [loadingModulos, setLoadingModulos] = useState(false);
  const [loadingTornillos, setLoadingTornillos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [familyPendientesCount, setFamilyPendientesCount] = useState(0);
  const [promptShown, setPromptShown] = useState(false); // popup solo una vez

  /* ===== Cargar tienda y módulos ===== */
  useEffect(() => {
    const init = async () => {
      try {
        setError(null);
        setLoadingModulos(true);

        const storedId = await AsyncStorage.getItem("tiendaId");
        if (!storedId || !params.familia) {
          setError("Falta tienda o familia");
          setLoadingModulos(false);
          return;
        }
        setTiendaId(storedId);

        const familia = encodeURIComponent(params.familia.toString());
        const urlModulos = `${API_BASE_URL}/api/tornillos/tienda/${storedId}/familia/${familia}/modulos`;

        const res = await fetch(urlModulos);
        if (!res.ok) throw new Error(`Error ${res.status} cargando módulos`);
        const lista: string[] = await res.json();

        const ordered = (lista ?? []).length ? lista : ["Puerta 1"];
        setModulos(ordered);
        setModIndex(0);
      } catch (e: any) {
        setError(e.message ?? "Error cargando módulos");
      } finally {
        setLoadingModulos(false);
      }
    };
    init();
  }, [params.familia]);

  /* ===== Traer tornillos del módulo actual ===== */
  const fetchTornillos = useCallback(async () => {
    if (!tiendaId || !params.familia || !moduloActual) return;
    try {
      setError(null);
      setLoadingTornillos(true);

      const familia = encodeURIComponent(params.familia.toString());
      const modulo = encodeURIComponent(moduloActual);
      const url = `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/familia/${familia}/modulo/${modulo}?ts=${Date.now()}`;

      const res = await fetch(url, { cache: "no-store" } as RequestInit);
      if (!res.ok) throw new Error(`Error ${res.status} cargando tornillos`);
      const data: Tornillo[] = await res.json();

      const maxF = data.length ? Math.max(...data.map((t) => t.fila)) : 0;
      setMaxFila(maxF);
      setTornillos(data);
    } catch (e: any) {
      setError(e.message ?? "Error cargando tornillos");
      setTornillos([]);
      setMaxFila(0);
    } finally {
      setLoadingTornillos(false);
    }
  }, [tiendaId, params.familia, moduloActual]);

  useFocusEffect(
    useCallback(() => {
      fetchTornillos();
    }, [fetchTornillos]),
  );
  useEffect(() => {
    fetchTornillos();
  }, [fetchTornillos]);

  /* ===== Contar pendientes del módulo y de la familia ===== */
  const pendientesModulo = useMemo(
    () => tornillos.filter((t) => isPast(t.fechaRetirada)),
    [tornillos],
  );
  const pendientesModuloCount = pendientesModulo.length;

  useEffect(() => {
    const loadFamilyPendings = async () => {
      try {
        if (!tiendaId || !params.familia) return;

        const familia = encodeURIComponent(String(params.familia));
        const modsRes = await fetch(
          `${API_BASE_URL}/api/tornillos/tienda/${tiendaId}/familia/${familia}/modulos`,
        );
        if (!modsRes.ok) throw new Error("No se pudieron cargar módulos");
        const mods: string[] = await modsRes.json();

        if (!mods?.length) {
          setFamilyPendientesCount(0);
          return;
        }

        const lists = await Promise.all(
          mods.map((m) => {
            const modulo = encodeURIComponent(m);
            return fetch(
              `${API_BASE_URL}/api/tornillos/dto/tienda/${tiendaId}/familia/${familia}/modulo/${modulo}?ts=${Date.now()}`,
            ).then((r) => (r.ok ? r.json() : []));
          }),
        );

        const all: Tornillo[] = lists.flat();
        const pending = all.filter((t) => isPast(t.fechaRetirada)).length;
        setFamilyPendientesCount(pending);
      } catch {
        setFamilyPendientesCount(0);
      }
    };
    loadFamilyPendings();
  }, [tiendaId, params.familia]);

  /* ===== Popup “retirar” (solo en primer módulo) ===== */
  useEffect(() => {
    if (
      !promptShown &&
      modIndex === 0 &&
      !loadingModulos &&
      !loadingTornillos &&
      familyPendientesCount > 0 &&
      tiendaId
    ) {
      setPromptShown(true);

      const msg = `Tenemos ${familyPendientesCount} tornillo${familyPendientesCount !== 1 ? "s" : ""} para retirar en esta familia.\n\n¿Quieres comenzar a revisar?`;

      const goRetirar = () => {
        router.push({
          pathname: "/retirar",
          params: {
            tiendaId: String(tiendaId),
            familia: String(params.familia ?? ""),
          },
        });
      };

      if (Platform.OS === "web") {
        if (window.confirm(msg)) goRetirar();
      } else {
        Alert.alert("Productos pendientes", msg, [
          { text: "No" },
          { text: "Sí", onPress: goRetirar },
        ]);
      }
    }
  }, [
    promptShown,
    modIndex,
    loadingModulos,
    loadingTornillos,
    familyPendientesCount,
    tiendaId,
    params.familia,
    router,
  ]);

  /* ===== Navegación entre puertas ===== */
  const prevModulo = () => setModIndex((i) => Math.max(0, i - 1));
  const nextModulo = () =>
    setModIndex((i) => Math.min(modulos.length - 1, i + 1));

  /* ===== Grid ===== */
  const renderGrid = () => {
    const grid = [];
    for (let fila = 1; fila <= maxFila; fila++) {
      const tornillosFila = tornillos
        .filter((t) => t.fila === fila)
        .sort((a, b) => a.columna - b.columna);

      grid.push(
        <View key={`row-${fila}`} style={styles.row}>
          {tornillosFila.map((t) => (
            <TouchableOpacity
              key={t.id}
              activeOpacity={0.85}
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: "/tornillo/[id]",
                  params: {
                    id: String(t.productoCodigo),
                    familia: String(params.familia ?? ""),
                    modulo: t.nombreModulo,
                    tiendaId: String(tiendaId ?? ""),
                  },
                })
              }
            >
              <View style={styles.cell}>
                <Image
                  style={styles.image}
                  source={{
                    uri: `${API_BASE_URL}/images/productos/${t.productoCodigo}.png`,
                  }}
                />

                {/* Columna de 3 líneas con altura fija = alto imagen */}
                <View style={styles.infoCol}>
                  <Text style={styles.codigo}>{t.productoCodigo}</Text>

                  {/* Nombre centrado verticalmente dentro de su “línea” */}
                  <View style={styles.nameLine}>
                    <Text style={styles.nombre} numberOfLines={2}>
                      {t.nombre}
                    </Text>
                  </View>

                  {/* Bolita alineada abajo SIEMPRE */}
                  <View
                    style={[
                      styles.statusBall,
                      { backgroundColor: getStatusColor(t.fechaRetirada) },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>,
      );
    }
    if (grid.length === 0) {
      return <Text style={styles.empty}>No hay productos en esta cámara.</Text>;
    }
    return grid;
  };

  /* ===== Render ===== */
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* App bar: back + Familia / Tienda */}
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

        {/* Tarjeta de módulo + contador módulo + navegación */}
        <View style={styles.card}>
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
              {pendientesModuloCount > 0 && (
                <Text style={styles.moduleSub}>
                  {pendientesModuloCount} pendiente
                  {pendientesModuloCount !== 1 ? "s" : ""} de retirar
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

          {/* Grid */}
          {loadingModulos || loadingTornillos ? (
            <ActivityIndicator size="large" style={{ marginTop: 24 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            renderGrid()
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

  /* App bar */
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

  /* Card contenedora del módulo y grid */
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
  moduleSub: { marginTop: 2, color: UI.red, fontSize: 12 },

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

  /* Grid */
  row: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 10,
    justifyContent: "center",
    gap: 8,
  },
  cell: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: UI.border,
    borderRadius: 12,
    backgroundColor: UI.card,
  },
  image: {
    width: CELL_IMG,
    height: CELL_IMG,
    resizeMode: "contain",
  },

  /* Columna de 3 líneas con altura fija */
  infoCol: {
    height: CELL_IMG, // clave: igual que la imagen
    justifyContent: "space-between", // reparte en 3 “líneas”
    alignItems: "flex-start",
  },
  codigo: { fontSize: 14, fontWeight: "800", color: UI.text },

  nameLine: {
    flexGrow: 1,
    justifyContent: "center", // centra el nombre en su “línea”
    width: "100%",
  },
  nombre: { fontSize: 14, color: UI.text },

  statusBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  error: { color: UI.red, marginTop: 16, textAlign: "center" },
  pagination: { marginTop: 12, color: UI.sub, textAlign: "center" },
  empty: { marginTop: 8, color: UI.sub, textAlign: "center" },

  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
