import { View, Text, StyleSheet } from 'react-native'

// Fase 1: implementar Daily Diary UI con barra calórica + barras de macros
export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NutriSnap</Text>
      <Text style={styles.subtitle}>Tu diario de hoy</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
  },
})
