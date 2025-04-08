import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const data = [
  { name: 'Lácteos Mural', image: require('@/assets/images/lacteos.png') },
  { name: 'Leche Muralita', image: require('@/assets/images/leche.png') },
  { name: 'Platos Preparados Refrigerados Mural', image: require('@/assets/images/platos.png') },
  { name: 'Zumo Muralita', image: require('@/assets/images/zumo.png') },
  { name: 'Charcutería', image: require('@/assets/images/charcuteria.png') },
];

export default function RevisarScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={require('@/assets/images/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Revisar</Text>
      </View>
      <View style={styles.divider} />

      {/* Título */}
      <Text style={styles.title}>Tienda 3718</Text>

      {/* Lista de productos */}
      {data.map((item, index) => (
        <View key={index} style={styles.productContainer}>
          <View style={styles.productRow}>
            {/* Imagen y nombre del pasillo */}
            <View style={styles.productInfo}>
              <Image source={item.image} style={styles.productImage} />
              <Text style={styles.productName}>{item.name}</Text>
            </View>
            {/* Indicadores a la derecha */}
            <View style={styles.indicatorGroup}>
              <View style={styles.indicatorColumn}>
                <View style={styles.indicatorWrapper}>
                  <View style={[styles.statusCircle, { backgroundColor: 'red' }]} />
                  <Text style={styles.statusText}>6 caducados</Text>
                </View>
                <View style={styles.indicatorWrapper}>
                  <View style={[styles.statusCircle, { backgroundColor: 'orange' }]} />
                  <Text style={styles.statusText}>12 retirar</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  divider: {
    height: 4,
    backgroundColor: '#ccc', // Puedes usar otro color si quieres
    width: '100%',
    marginVertical: 10, // Espacio arriba y abajo
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    width: 43,
    height: 30,
    marginRight: 10,
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  productContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  indicatorGroup: {
    alignItems: 'flex-start',
  },
  indicatorColumn: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    minWidth: 100, // Ancho fijo para mantener alineación
  },
  indicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // El texto se alinea a la derecha
    marginBottom: 8,
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  statusText: {
    fontSize: 16,
  },
});
