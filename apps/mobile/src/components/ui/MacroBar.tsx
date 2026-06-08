import { View, Text, StyleSheet } from 'react-native'

interface Props {
  label: string
  consumed: number
  target: number
  color: string
  unit?: string
}

export function MacroBar({ label, consumed, target, color, unit = 'g' }: Props) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          <Text style={styles.consumed}>{Math.round(consumed)}</Text>
          <Text style={styles.separator}> / {target}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 13, color: '#616161', fontWeight: '600' },
  values: { fontSize: 13 },
  consumed: { fontWeight: '700', color: '#212121' },
  separator: { color: '#BDBDBD' },
  track: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
})
