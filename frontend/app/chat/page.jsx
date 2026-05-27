'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ChatPanel from '@/components/ChatPanel'
import { useChat } from '@/hooks/useChat'
import { useConnections } from '@/hooks/useConnections'

export default function ChatPage() {
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/login')
  }, [router])

  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') || '{}')
    : {}

  const { connections, activeIds, toggleConnection } = useConnections()
  const {
    conversations,
    currentConvId,
    messages,
    pendingTools,
    loading,
    error,
    send,
    loadConversation,
    startNewConversation,
  } = useChat(activeIds)

  const handleLogout = () => {
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onSelectConv={loadConversation}
        onNewConv={startNewConversation}
        connections={connections}
        activeIds={activeIds}
        onToggleConnection={toggleConnection}
        user={user}
        onAdminClick={() => router.push('/admin')}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {currentConvId
                ? conversations.find((c) => c.id === currentConvId)?.title || 'Conversación'
                : 'Nueva conversación'}
            </h2>
            {activeIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {activeIds.length} fuente{activeIds.length > 1 ? 's' : ''} activa
                {activeIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            Cerrar sesión
          </button>
        </header>

        <ChatPanel
          messages={messages}
          pendingTools={pendingTools}
          connections={connections}
          loading={loading}
          error={error}
          onSend={send}
        />
      </main>
    </div>
  )
}
