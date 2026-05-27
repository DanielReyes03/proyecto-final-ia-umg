'use client'
import { useState, useEffect, useCallback } from 'react'
import { getAvailableConnections } from '@/services/api'

export function useConnections() {
  const [connections, setConnections] = useState([])
  const [activeIds, setActiveIds] = useState([])
  const [loading, setLoading] = useState(true)

  // Load persisted active IDs from localStorage (client-side only)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('activeConnectionIds') || '[]')
      setActiveIds(saved)
    } catch {}
  }, [])

  const fetchConnections = useCallback(async () => {
    try {
      setConnections(await getAvailableConnections())
    } catch (err) {
      console.error('Error fetching connections:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConnections() }, [fetchConnections])

  const toggleConnection = useCallback((id) => {
    setActiveIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('activeConnectionIds', JSON.stringify(next))
      return next
    })
  }, [])

  return { connections, activeIds, toggleConnection, loading, refetch: fetchConnections }
}
