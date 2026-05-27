'use client'
import { useRef, useEffect, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import ToolIndicator from './ToolIndicator'

const SAMPLE_QUESTIONS = [
  '¿Cuáles son los 5 productos más vendidos?',
  '¿Qué clientes tienen órdenes pendientes de entrega?',
  'Compara las ventas por categoría entre ambas bases de datos',
  '¿Cuál es el empleado con más ventas este año?',
  'Dame un resumen ejecutivo del estado del negocio',
]

export default function ChatPanel({ messages, pendingTools, connections, loading, error, onSend }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingTools])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    onSend(text)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = '48px'
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center gap-6 text-center px-4">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🧠</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Gerente General IA</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                Consulta múltiples bases de datos simultáneamente y obtén análisis ejecutivos.
              </p>
            </div>
            <div className="w-full max-w-lg space-y-2">
              <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-3">Preguntas de ejemplo</p>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => onSend(q)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-gray-300 hover:border-blue-500/40 hover:text-white hover:bg-blue-500/5 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEmpty && messages.map((m) => <MessageBubble key={m.id} message={m} />)}

        <ToolIndicator pendingToolIds={pendingTools} connections={connections} />

        {loading && pendingTools.length === 0 && (
          <div className="flex justify-start mb-4">
            <div className="bg-[#242424] border border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center mb-4">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg">{error}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/[0.08]">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta al Gerente IA…"
            disabled={loading}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none transition-colors disabled:opacity-50"
            style={{ minHeight: 48, maxHeight: 140 }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
            }}
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
