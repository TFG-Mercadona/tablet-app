// app/+not-found.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";

const BRAND = {
  primary: "#0F8A2F",
  bg: "#F6F7F8",
  card: "#FFFFFF",
  text: "#111827",
  border: "#E5E7EB",
};

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <AppHeader title="No encontrado" showBack />
      <View style={styles.container}>
        <Text style={styles.emoji}>🧭</Text>
        <Text style={styles.title}>Pantalla no encontrada</Text>
        <Text style={styles.subtitle}>
          La ruta que has abierto no existe o se ha movido.
        </Text>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryTxt}>Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primary}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.primaryTxt}>Ir al inicio</Text>
          </TouchableOpacity>
        </View>

        {/* extra útil en web */}
        <Link href="/" replace style={styles.link}>
          Abrir inicio
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "800", color: BRAND.text },
  subtitle: {
    marginTop: 6,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 420,
  },
  row: { flexDirection: "row", gap: 12, marginTop: 18 },
  primary: {
    backgroundColor: BRAND.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryTxt: { color: "#fff", fontWeight: "700" },
  secondary: {
    backgroundColor: BRAND.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  secondaryTxt: { color: BRAND.text, fontWeight: "600" },
  link: {
    marginTop: 10,
    color: BRAND.primary,
    textDecorationLine: "underline",
  },
});
