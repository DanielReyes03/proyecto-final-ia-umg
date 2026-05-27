'use client'
import { Database, Server, Globe, BookOpen } from 'lucide-react'

const icons = { postgresql: Database, sqlserver: Server, rest_api: Globe, knowledge_base: BookOpen }
const labels = { postgresql: 'PostgreSQL', sqlserver: 'SQL Server', rest_api: 'REST API', knowledge_base: 'Base de Conocimiento' }
const colors = { postgresql: 'text-sky-400', sqlserver: 'text-orange-400', rest_api: 'text-purple-400', knowledge_base: 'text-emerald-400' }

export default function ConnectionCard({ connection, active, onToggle }) {
  const Icon = icons[connection.type] || Database
  const isActive = connection.is_active
  return (
    <button
      onClick={() => isActive && onToggle(connection.id)}
      disabled={!isActive}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left
        ${!isActive ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
        ${active && isActive ? 'bg-white/[0.08] border border-white/15' : 'border border-transparent'}
      `}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={15} className={colors[connection.type]} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{connection.name}</p>
          <p className="text-[11px] text-gray-500">{labels[connection.type]}</p>
        </div>
      </div>
      <div className="shrink-0 rounded-full transition-colors relative ml-2"
        style={{ width: 32, height: 18, background: active && isActive ? '#3b82f6' : 'rgba(255,255,255,0.15)' }}>
        <span className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform"
          style={{ width: 14, height: 14, transform: active && isActive ? 'translateX(14px)' : 'translateX(0)' }} />
      </div>
    </button>
  )
}
