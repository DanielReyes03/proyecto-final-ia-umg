'use client'
import { Plus, MessageSquare, Settings } from 'lucide-react'
import ConnectionCard from './ConnectionCard'

export default function Sidebar({
  conversations, currentConvId, onSelectConv, onNewConv,
  connections, activeIds, onToggleConnection, user, onAdminClick,
}) {
  return (
    <aside className="flex flex-col h-full bg-[#1a1a1a] border-r border-white/[0.08] w-64 shrink-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Gerente IA</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">{user?.name}</p>
          </div>
          {user?.role === 'admin' && (
            <button onClick={onAdminClick}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-gray-500 hover:text-white transition-colors"
              title="Panel Admin">
              <Settings size={15} />
            </button>
          )}
        </div>
      </div>

      {/* New conversation */}
      <div className="px-3 pt-3 pb-2">
        <button onClick={onNewConv}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
          <Plus size={15} /> Nueva conversación
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {conversations.length === 0 && (
          <p className="text-center text-gray-600 text-xs mt-4 px-2">Sin conversaciones aún</p>
        )}
        {conversations.map((c) => (
          <button key={c.id} onClick={() => onSelectConv(c.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors mb-0.5 ${
              currentConvId === c.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}>
            <MessageSquare size={13} className="shrink-0" />
            <span className="truncate">{c.title}</span>
          </button>
        ))}
      </div>

      {/* Connections */}
      <div className="border-t border-white/[0.08] px-3 pt-3 pb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          Fuentes de datos
        </p>
        {connections.length === 0 && (
          <p className="text-xs text-gray-600 px-1">Sin conexiones configuradas</p>
        )}
        <div className="space-y-0.5">
          {connections.map((c) => (
            <ConnectionCard key={c.id} connection={c} active={activeIds.includes(c.id)} onToggle={onToggleConnection} />
          ))}
        </div>
      </div>
    </aside>
  )
}
