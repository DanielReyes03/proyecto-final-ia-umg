'use client'
import { Database, Server, Globe } from 'lucide-react'

const typeIcon = { postgresql: Database, sqlserver: Server, rest_api: Globe }

function ToolChip({ name, type }) {
  const Icon = typeIcon[type] || Database
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
      <Icon size={11} className="shrink-0 animate-pulse" />
      <span>Consultando {name}…</span>
      <span className="flex gap-0.5 ml-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
    </span>
  )
}

export default function ToolIndicator({ pendingToolIds, connections }) {
  if (!pendingToolIds?.length) return null
  const active = connections.filter((c) => pendingToolIds.includes(c.id))
  if (!active.length) return null
  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {active.map((c) => <ToolChip key={c.id} name={c.name} type={c.type} />)}
    </div>
  )
}
