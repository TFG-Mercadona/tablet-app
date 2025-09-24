// app/resumen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const fetchResumenUrl = (tiendaId: string, familia?: string) =>
  `${API_BASE_URL}/api/contrastar/tienda/${tiendaId}/hoy${familia ? `?familia=${encodeURIComponent(familia)}` : ""}`;

const UI = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  sub: "#6B7280",
  green: "#0F8A2F",
};

type CambioRow = {
  tornilloId?: number;
  tiendaId: number;
  productoCodigo: number;
  familia?: string | null;
  nombreModulo?: string | null;
  fila?: number | null;
  columna?: number | null;
  fechaAnterior: string | null;
  fechaNueva: string | null;
  contrastado?: boolean | null;
  nombre?: string | null;
  imagenUrl?: string | null;
};

export default function ResumenScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CambioRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("tiendaId");
      if (id) setTiendaId(id);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!tiendaId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(fetchResumenUrl(tiendaId));
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: any[] = await res.json();
        setRows(data.map(mapRow));
      } catch (e: any) {
        setError(e?.message ?? "No se pudo cargar el resumen de hoy.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tiendaId]);

  const grouped = useMemo(() => {
    const map = new Map<string, CambioRow[]>();
    for (const r of rows) {
      const key = (r.familia ?? "Sin familia").trim() || "Sin familia";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const hasData = rows.length > 0;

  const generarPDF = async () => {
    if (!hasData) {
      showAlert("Sin datos", "Hoy no hay cambios registrados.");
      return;
    }
    const html = buildHtml(grouped);
    try {
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { dialogTitle: "Compartir resumen (PDF)" });
      }
    } catch (e: any) {
      showAlert("Error", e?.message ?? "No se pudo generar el PDF.");
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Image source={require("@/assets/images/back.png")} style={styles.backIcon} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Resumen de hoy</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? "…"}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={generarPDF}
            style={[styles.primaryBtn, !hasData && { opacity: 0.6 }]}
            disabled={!hasData || loading}
          >
            <Text style={styles.primaryTxt}>Generar PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cambios de hoy</Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !hasData ? (
            <Text style={{ color: UI.sub }}>Hoy no hay cambios registrados.</Text>
          ) : (
            grouped.map(([fam, list]) => (
              <View key={fam} style={{ marginBottom: 16 }}>
                <Text style={styles.famHeader}>— {fam} —</Text>
                {list.map((r, idx) => (
                  <View key={`${r.productoCodigo}-${idx}`} style={styles.row}>
                    <Image
                      style={styles.thumb}
                      source={{ uri: r.imagenUrl || `${API_BASE_URL}/images/productos/${r.productoCodigo}.png` }}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {r.productoCodigo} {r.nombre ? `· ${r.nombre}` : ""}
                      </Text>
                      <Text style={styles.rowSub}>
                        Anterior: {r.fechaAnterior || "-"} · Actual: {r.fechaNueva || "-"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        (r.contrastado ?? false) ? styles.badgeOk : styles.badgeKo,
                      ]}
                    >
                      <Text style={styles.badgeText}>{(r.contrastado ?? false) ? "Contrastado" : "No contrastado"}</Text>
                    </View>
                  </View>
                ))}
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

/* ---------------- helpers ---------------- */

function mapRow(x: any): CambioRow {
  return {
    tornilloId: x.tornilloId ?? x.id ?? null,
    tiendaId: x.tiendaId,
    productoCodigo: x.productoCodigo,
    familia: x.familia ?? null,
    nombreModulo: x.nombreModulo ?? null,
    fila: x.fila ?? null,
    columna: x.columna ?? null,
    fechaAnterior: x.fechaAnterior ?? null,
    fechaNueva: x.fechaNueva ?? null,
    contrastado: x.contrastado ?? false,
    nombre: x.nombre ?? null,
    imagenUrl: x.imagenUrl ?? null,
  };
}

function buildHtml(groups: [string, CambioRow[]][]) {
  const css = `
  body { font-family: Arial, sans-serif; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 12px 0; }
  h2 { font-size: 16px; margin: 16px 0 6px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #E5E7EB; padding: 6px 8px; font-size: 12px; }
  th { background: #F9FAFB; text-align: left; }
  .fam { margin-top: 16px; }
  .img { width: 60px; height: 60px; object-fit: contain; }
  .badge { display:inline-block; padding: 2px 8px; border-radius: 999px; font-weight: bold; }
  .ok { background:#DCFCE7; color:#065F46; }
  .no { background:#FEE2E2; color:#991B1B; }
  `;
  const sections = groups.map(([fam, list]) => {
    const rows = list
      .map(
        (r) => `
      <tr>
        <td><img class="img" src="${r.imagenUrl || `${API_BASE_URL}/images/productos/${r.productoCodigo}.png`}" /></td>
        <td>${r.productoCodigo}${r.nombre ? ` · ${escapeHtml(r.nombre)}` : ""}</td>
        <td>${r.fechaAnterior ?? "-"}</td>
        <td>${r.fechaNueva ?? "-"}</td>
        <td><span class="badge ${r.contrastado ? "ok" : "no"}">${r.contrastado ? "Sí" : "No"}</span></td>
      </tr>`
      )
      .join("");
    return `
      <div class="fam">
        <h2>—— ${escapeHtml(fam)} ——</h2>
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Producto</th>
              <th>Fecha anterior</th>
              <th>Fecha actual</th>
              <th>Contrastado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  });

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${css}</style>
    </head>
    <body>
      <h1>Resumen de cambios — ${new Date().toLocaleDateString()}</h1>
      ${sections.join("")}
    </body>
  </html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function showAlert(title: string, msg: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, alignItems: "center", backgroundColor: UI.bg },

  appBar: {
    width: "100%",
    maxWidth: 960,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  appBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: UI.border,
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { width: 22, height: 22, resizeMode: "contain" },
  appBarTitle: { fontSize: 20, fontWeight: "800", color: UI.text },
  appBarSub: { marginTop: 2, color: UI.sub, fontSize: 12 },

  primaryBtn: {
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: UI.green,
    borderRadius: 10, alignItems: "center",
  },
  primaryTxt: { color: "#fff", fontWeight: "bold" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI.text,
  },
  badgeOk: { backgroundColor: "#DCFCE7" },
  badgeKo: { backgroundColor: "#FEE2E2" },

  card: {
    width: "100%",
    maxWidth: 960,
    backgroundColor: UI.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    marginTop: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: UI.text, marginBottom: 8 },

  famHeader: { fontSize: 14, fontWeight: "700", color: UI.text, marginBottom: 6 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8,
  },
  thumb: { width: 46, height: 46, resizeMode: "contain" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: UI.text },
  rowSub: { fontSize: 12, color: UI.sub },

  error: { color: "#E11D48" },
  footer: { color: UI.sub, fontSize: 12, textAlign: "center" },
});
