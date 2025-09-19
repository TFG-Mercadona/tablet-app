import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';

SplashScreen.preventAutoHideAsync();

const BRAND = { primary: '#0F8A2F', bg: '#F6F7F8', card: '#FFFFFF', text: '#111827', border: '#E5E7EB' };

const LightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: BRAND.primary, background: BRAND.bg, card: BRAND.card, text: BRAND.text, border: BRAND.border }
};
const Dark = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: BRAND.primary } };

export default function RootLayout() {
  const scheme = useColorScheme();
  const [loaded] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });

  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? Dark : LightTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: scheme === 'dark' ? Dark.colors.background : LightTheme.colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="revisar" />
        {/* el resto de pantallas heredan headerShown:false y usarán AppHeader propio */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
