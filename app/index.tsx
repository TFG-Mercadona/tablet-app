import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: usuario, password: contrasena }),
      });

      if (response.ok) {
        await AsyncStorage.setItem('tiendaId', usuario);
        router.push('/home'); // Ajusta esta ruta según la siguiente pantalla tras login
      } else {
        Alert.alert('Error', 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error en el login', error);
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={usuario}
        onChangeText={setUsuario}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={contrasena}
        onChangeText={setContrasena}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Iniciar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.link}>
        Si no sabes tu usuario o contraseña{' '}
        <Text style={styles.linkAction}>pulsa aquí</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 40,
  },
  input: {
    height: 45,
    borderRadius: 6,
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#00994d',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#555',
  },
  linkAction: {
    color: '#3c6fdc',
  },
});
