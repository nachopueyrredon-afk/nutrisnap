import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { supabase } from '../src/lib/supabase'

type Mode = 'login' | 'signup'

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Completá todos los campos')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) Alert.alert('Error', error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) Alert.alert('Error', error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>NutriSnap</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Iniciá sesión' : 'Creá tu cuenta'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholderTextColor="#9E9E9E"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholderTextColor="#9E9E9E"
        />

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{mode === 'login' ? 'Entrar' : 'Registrarme'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? '¿No tenés cuenta? Registrate'
              : '¿Ya tenés cuenta? Iniciá sesión'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', padding: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: '#4CAF50', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#757575', textAlign: 'center', marginBottom: 40 },
  input: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    marginBottom: 12, color: '#212121',
  },
  btn: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 24, alignItems: 'center' },
  switchText: { color: '#4CAF50', fontSize: 14 },
})
