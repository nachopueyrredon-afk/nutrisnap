import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface QuotaState {
  used: number
  limit: number | null
  remaining: number | null
  is_premium: boolean
}

export function useAiQuota() {
  const [quota, setQuota] = useState<QuotaState | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      const data = await api.get<QuotaState>('/ai/quota')
      setQuota(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  return { quota, loading, refresh }
}
