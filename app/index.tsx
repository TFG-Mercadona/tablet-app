import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Image source={require('@/assets/images/calendar-alert.png')} style={styles.headerIcon} />
        <Text style={styles.versionText}>3718 | PROD | v1300</Text>
      </View>

      {/* Título */}
      <Text style={styles.title}>Tienda 3718</Text>

      {/* Sección de tareas */}
      <Text style={styles.sectionLabel}>Funciones</Text>

      <TouchableOpacity style={styles.row} onPress={() => router.push('/revisar')}>
        <Image source={require('@/assets/images/search.png')} style={styles.icon} />
        <Text style={styles.rowText}>Revisar</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row}>
        <Image source={require('@/assets/images/settings.png')} style={styles.icon} />
        <Text style={styles.rowText}>Ajustes</Text>
      </TouchableOpacity>

      {/* Sección EAC */}
      <Text style={styles.sectionLabel}>EAC</Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusCircle, { backgroundColor: 'red' }]} />
        <Text style={styles.statusText}>6 productos con caducados</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusCircle, { backgroundColor: 'orange' }]} />
        <Text style={styles.statusText}>12 productos próximos a retirar</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusCircle, { backgroundColor: 'green' }]} />
        <Text style={styles.statusText}>200 productos controlados</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIcon: {
    width: 50,
    height: 50,
    marginBottom: 5,
  },
  versionText: {
    fontSize: 12,
    color: '#555',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 16,
    color: 'gray',
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  rowText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
  },
});
