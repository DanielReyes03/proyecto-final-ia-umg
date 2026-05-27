'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CheckCircle, XCircle, Zap } from 'lucide-react'

function ToolCallBadge({ tc }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
      tc.success
        ? 'bg-green-500/15 text-green-400 border-green-500/20'
        : 'bg-red-500/15 text-red-400 border-red-500/20'
    }`}>
      {tc.success ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {tc.display_name || tc.tool_name.replace(/^(query_postgresql_|query_sqlserver_|call_rest_api_)/, '')}
      {tc.duration_ms && <span className="opacity-60 ml-0.5">{tc.duration_ms}ms</span>}
    </span>
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isError = message.is_error

  const bubbleCls = isUser
    ? 'bg-blue-600 text-white rounded-br-sm'
    : isError
      ? 'bg-red-500/10 text-red-300 rounded-bl-sm border border-red-500/20'
      : 'bg-[#242424] text-gray-100 rounded-bl-sm border border-white/[0.08]'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${bubbleCls}`}>
        {/* Tool calls badges */}
        {!isUser && !isError && message.tool_calls_made?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/10">
            <Zap size={12} className="text-yellow-400 mt-0.5 shrink-0" />
            {message.tool_calls_made.map((tc, i) => <ToolCallBadge key={i} tc={tc} />)}
          </div>
        )}

        {/* Content */}
        {isUser
          ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          : (
            <div className="prose-dark text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )
        }

        {/* Timestamp */}
        <p className={`text-[10px] mt-1.5 text-right ${isUser ? 'text-blue-200/70' : isError ? 'text-red-400/50' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
