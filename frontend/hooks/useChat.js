'use client'
import { useState, useCallback, useEffect } from 'react'
import { sendMessage, getConversations, getMessages } from '@/services/api'

export function useChat(activeConnectionIds) {
  const [conversations, setConversations] = useState([])
  const [currentConvId, setCurrentConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [pendingTools, setPendingTools] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchConversations = useCallback(async () => {
    try {
      setConversations(await getConversations())
    } catch (err) {
      console.error('Error fetching conversations:', err)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const loadConversation = useCallback(async (convId) => {
    setCurrentConvId(convId)
    setMessages([])
    try {
      setMessages(await getMessages(convId))
    } catch (err) {
      console.error('Error loading messages:', err)
    }
  }, [])

  const startNewConversation = useCallback(() => {
    setCurrentConvId(null)
    setMessages([])
  }, [])

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setError(null)

    if (activeConnectionIds.length > 0) setPendingTools(activeConnectionIds)

    try {
      const result = await sendMessage(text, currentConvId, activeConnectionIds)
      setPendingTools([])

      const assistantContent = result.response?.trim()
        ? result.response
        : '_(El agente no generó una respuesta. Intenta de nuevo o reformula la pregunta.)_'

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: assistantContent,
          tool_calls_made: result.tool_calls_made,
          created_at: new Date().toISOString(),
        },
      ])

      // Actualizar conversación en sidebar
      if (!currentConvId) {
        setCurrentConvId(result.conversation_id)
        await fetchConversations()
      } else {
        await fetchConversations() // refresca título si cambió
      }
    } catch (err) {
      setPendingTools([])
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      const errorMsg = isTimeout
        ? 'La respuesta tardó demasiado (el modelo local puede ser lento). Espera unos segundos y revisa si aparece la respuesta en la conversación.'
        : `Error: ${err.response?.data?.detail || err.message || 'Error desconocido'}`

      // Agregar mensaje de error como burbuja del sistema — NO borrar el mensaje del usuario
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
          is_error: true,
          created_at: new Date().toISOString(),
        },
      ])
      setError(null) // el error ya está en la burbuja, no en el banner
    } finally {
      setLoading(false)
    }
  }, [loading, currentConvId, activeConnectionIds, fetchConversations])

  return {
    conversations, currentConvId, messages, pendingTools,
    loading, error, send, loadConversation, startNewConversation, fetchConversations,
  }
}
