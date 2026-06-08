import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { router } from 'expo-router'

export default function DisclaimerScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>🌿</Text>
        <Text style={styles.title}>Antes de empezar</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Esta app es un complemento</Text>
          <Text style={styles.cardText}>
            NutriSnap no reemplaza a tu profesional de salud. Es una herramienta
            de acompañamiento para ayudarte a registrar y entender tus hábitos
            alimentarios.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>¿Cómo funciona?</Text>
          <Text style={styles.cardText}>
            Registrás tus comidas y peso. La app calcula tus calorías y macros,
            y te da sugerencias motivacionales. Tu nutricionista puede conectarse
            para ver tu progreso si vos lo autorizás.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tus datos son tuyos</Text>
          <Text style={styles.cardText}>
            Solo vos podés ver tu diario. Si vinculás a un profesional, tenés
            control total y podés desconectarlo en cualquier momento.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/onboarding/role')}>
          <Text style={styles.btnText}>Entendido, empezar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 32, paddingBottom: 16 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#212121', textAlign: 'center', marginBottom: 32 },
  card: {
    backgroundColor: '#F5F5F5', borderRadius: 16,
    padding: 20, marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212121', marginBottom: 8 },
  cardText: { fontSize: 14, color: '#616161', lineHeight: 22 },
  footer: { padding: 24, paddingBottom: 40 },
  btn: {
    backgroundColor: '#4CAF50', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
