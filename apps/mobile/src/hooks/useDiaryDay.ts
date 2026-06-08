import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { DayDiaryResponse } from '@nutrisnap/shared'

export function useDiaryDay(date: string) {
  const [data, setData] = useState<DayDiaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.get<DayDiaryResponse>(`/diary/day?date=${date}`)
      setData(result)
    } catch {
      setError('No se pudieron cargar las entradas')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refresh: load }
}
