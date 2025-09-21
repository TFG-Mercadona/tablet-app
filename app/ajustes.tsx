// app/ajustes.tsx
import React from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const UI = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  sub: '#6B7280',
  red: '#E11D48',
  amber: '#F59E0B',
};

export default function AjustesScreen() {
  const router = useRouter();
  const [tiendaId, setTiendaId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const id = await AsyncStorage.getItem('tiendaId');
        if (id) setTiendaId(id);
      } catch {/* noop */}
    })();
  }, []);

  const go = (pathname: string) => router.push({ pathname });

  return (
    <View style={styles.screen}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { minHeight: Dimensions.get('window').height }]}>
        {/* App bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
              <Image source={require('@/assets/images/back.png')} style={styles.backIcon} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Ajustes</Text>
              <Text style={styles.appBarSub}>Tienda {tiendaId ?? '…'}</Text>
            </View>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* Tarjeta de acciones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gestión</Text>

          <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => go('/ajustes/anadir-tornillo')}>
            <Image source={require('@/assets/images/add.png')} style={styles.icon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Añadir tornillo</Text>
              <Text style={styles.rowSub}>Dar de alta un tornillo para controlar</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => go('/ajustes/editar-tornillo')}>
            <Image source={require('@/assets/images/edit.png')} style={styles.icon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Editar tornillo</Text>
              <Text style={styles.rowSub}>Modificar caducidad, módulo o posición</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => go('/ajustes/eliminar-tornillo')}>
            <Image source={require('@/assets/images/remove.png')} style={styles.icon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Eliminar tornillo</Text>
              <Text style={styles.rowSub}>Quitar un tornillos del control</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de cámaras / organización */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cámaras y organización</Text>

          <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => go('/organizar')}>
            <Image source={require('@/assets/images/organizar.png')} style={styles.icon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Organizar cámaras</Text>
              <Text style={styles.rowSub}>Editar módulos, filas o columnas</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => go('/planograma')}>
            <Image source={require('@/assets/images/planograma.png')} style={styles.icon} />
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>Planogramas</Text>
              <Text style={styles.rowSub}>Observar planogramas con información detallada</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
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
  container: { padding: 20, alignItems: 'center', backgroundColor: UI.bg },

  appBar: {
    width: '100%', maxWidth: MAX_W, backgroundColor: UI.card, borderRadius: 16,
    borderWidth: 1, borderColor: UI.border, padding: 14, marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'web' ? 0.06 : 0.12,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: UI.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { width: 22, height: 22, resizeMode: 'contain' },
  appBarTitle: { fontSize: 20, fontWeight: '800', color: UI.text },
  appBarSub: { marginTop: 2, color: UI.sub, fontSize: 12 },

  card: {
    width: '100%', maxWidth: MAX_W, backgroundColor: UI.card, borderRadius: 16,
    borderWidth: 1, borderColor: UI.border, padding: 14, marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'web' ? 0.05 : 0.1,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: UI.text, marginBottom: 8 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { height: 1, backgroundColor: UI.border, marginVertical: 6 },
  icon: { width: 26, height: 26, marginRight: 12, resizeMode: 'contain' },
  rowTextWrap: { flex: 1 },
  rowText: { fontSize: 16, fontWeight: '700', color: UI.text },
  rowSub: { fontSize: 12, color: UI.sub, marginTop: 2 },
  chevron: { fontSize: 22, color: UI.sub, paddingHorizontal: 6 },

  footer: { color: UI.sub, fontSize: 12, textAlign: 'center' },
});
