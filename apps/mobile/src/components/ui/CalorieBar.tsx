import { View, Text, StyleSheet } from 'react-native'

interface Props {
  consumed: number
  target: number
}

export function CalorieBar({ consumed, target }: Props) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const remaining = Math.max(target - consumed, 0)
  const isOver = consumed > target

  const barColor = isOver ? '#EF5350' : pct > 0.85 ? '#FF9800' : '#4CAF50'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.consumed}>{Math.round(consumed)}</Text>
          <Text style={styles.label}>consumidas</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
          </View>
          <Text style={[styles.pct, { color: barColor }]}>{Math.round(pct * 100)}%</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.remaining, isOver && { color: '#EF5350' }]}>
            {isOver ? `+${Math.round(consumed - target)}` : Math.round(remaining)}
          </Text>
          <Text style={styles.label}>{isOver ? 'de más' : 'restantes'}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consumed: { fontSize: 24, fontWeight: '800', color: '#212121', textAlign: 'center' },
  remaining: { fontSize: 24, fontWeight: '800', color: '#212121', textAlign: 'center' },
  label: { fontSize: 11, color: '#9E9E9E', textAlign: 'center', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', gap: 6 },
  track: { height: 10, width: '100%', backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  pct: { fontSize: 12, fontWeight: '700' },
  right: { alignItems: 'flex-end' },
})
