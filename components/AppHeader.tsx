import React from "react";
import { SafeAreaView, View, Text, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
};

export default function AppHeader({
  title,
  subtitle,
  showBack = true,
  right,
}: Props) {
  const router = useRouter();
  return (
    <SafeAreaView style={{ backgroundColor: "#0F8A2F" }}>
      <View
        style={{
          height: 64,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0F8A2F",
        }}
      >
        <View style={{ width: 60 }}>
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
              {Platform.OS !== "web" && (
                <Text
                  style={{ color: "#fff", fontWeight: "600", marginLeft: -2 }}
                >
                  Atrás
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={{ width: 60, alignItems: "flex-end" }}>{right}</View>
      </View>
    </SafeAreaView>
  );
}
