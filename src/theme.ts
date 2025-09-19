// src/theme.ts
export const theme = {
  // Colores aproximados “Mercadona-like”
  colors: {
    // Marca
    primary: '#0F8A2F',       // verde principal
    primaryDark: '#0B6A24',
    accent: '#FF9900',        // naranja (hoy)
    danger: '#E53935',        // rojo (pasado)
    success: '#2ECC71',       // verde estado futuro
    // Neutros / superficies
    bg: '#F5F7F8',
    card: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    chipBg: '#FFFFFF',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  shadow: {
    card: {
      // sombras suaves compatibles web + native
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  },
  space: (n: number) => n * 4, // 4px grid
  layout: {
    maxWidth: 560, // ancho de tarjeta en tablet/web
    rowWidth: (screenWidth: number) => screenWidth - 40,
  },
  typography: {
    h1: { fontSize: 22, fontWeight: '700' as const },
    h2: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 14 },
  },
};
