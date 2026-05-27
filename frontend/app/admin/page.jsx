'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, ArrowLeft, RefreshCw, CheckCircle, XCircle,
  Upload, FileText, Loader2, BookOpen,
} from 'lucide-react'
import ConnectionForm from '@/components/ConnectionForm'
import {
  getAdminConnections, deleteConnection, getToolLogs,
  getDocuments, uploadDocument, deleteDocument,
} from '@/services/api'

const typeLabel = {
  postgresql: 'PostgreSQL',
  sqlserver: 'SQL Server',
  rest_api: 'REST API',
  knowledge_base: 'Base de Conocimiento',
}
const typeColor = {
  postgresql: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  sqlserver: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  rest_api: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  knowledge_base: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

// ── Knowledge Base card ────────────────────────────────────────────────────────
function KnowledgeBaseCard({ conn }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingFile, setDeletingFile] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try { setDocs(await getDocuments(conn.id)) }
    catch { setDocs([]) }
    finally { setLoading(false) }
  }, [conn.id])

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError('')
    setUploading(true)
    setUploadProgress(0)

    for (const file of files) {
      try {
        await uploadDocument(conn.id, file, (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
        })
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'Error al subir el archivo'
        setError(`${file.name}: ${msg}`)
      }
    }

    setUploading(false)
    setUploadProgress(0)
    if (fileRef.current) fileRef.current.value = ''
    loadDocs()
  }

  const handleDelete = async (filename) => {
    if (!window.confirm(`¿Eliminar "${filename}"?`)) return
    setDeletingFile(filename)
    try {
      await deleteDocument(conn.id, filename)
      setDocs((prev) => prev.filter((d) => d.filename !== filename))
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar')
    } finally {
      setDeletingFile(null)
    }
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <BookOpen size={16} className="text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-white">{conn.name}</p>
            <p className="text-[11px] text-gray-500">{docs.length} documento{docs.length !== 1 ? 's' : ''} indexado{docs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 size={12} className="animate-spin" />{uploadProgress}%</>
              : <><Upload size={12} /> Subir documento</>
            }
          </button>
        </div>
      </div>

      {error && (
        <p className="mx-5 mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-gray-600" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">
          Sin documentos. Sube el primero con el botón de arriba.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {docs.map((doc) => (
            <li key={doc.filename} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={14} className="text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{doc.filename}</p>
                  <p className="text-[11px] text-gray-500">{doc.chunks} fragmento{doc.chunks !== 1 ? 's' : ''} indexado{doc.chunks !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.filename)}
                disabled={deletingFile === doc.filename}
                className="p-1.5 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors shrink-0 ml-4"
              >
                {deletingFile === doc.filename
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />
                }
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Main admin page ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [connections, setConnections] = useState([])
  const [logs, setLogs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [logFilter, setLogFilter] = useState({ tool_name: '', date_from: '', date_to: '' })
  const [tab, setTab] = useState('connections')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!localStorage.getItem('token') || user.role !== 'admin') {
      router.replace('/chat')
    }
  }, [router])

  const loadConnections = useCallback(async () => {
    try { setConnections(await getAdminConnections()) } catch {}
  }, [])

  const loadLogs = useCallback(async () => {
    try { setLogs(await getToolLogs(logFilter)) } catch {}
  }, [logFilter])

  useEffect(() => { loadConnections() }, [loadConnections])
  useEffect(() => { if (tab === 'logs') loadLogs() }, [tab, loadLogs])

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta conexión?')) return
    setDeleting(id)
    try { await deleteConnection(id); await loadConnections() }
    finally { setDeleting(null) }
  }

  const kbConnections = connections.filter((c) => c.type === 'knowledge_base')

  const thCls = 'text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3'
  const tdCls = 'px-4 py-3 text-sm text-gray-300'

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="border-b border-white/[0.08] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/chat')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={15} /> Volver al chat
        </button>
        <span className="text-white/20">|</span>
        <h1 className="text-base font-semibold">Panel de administración</h1>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 w-fit mb-6 border border-white/[0.08]">
          {[
            ['connections', 'Conexiones'],
            ['rag', 'RAG / Documentos'],
            ['logs', 'Logs de tools'],
          ].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Connections tab */}
        {tab === 'connections' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400">
                {connections.length} conexión{connections.length !== 1 ? 'es' : ''} configurada{connections.length !== 1 ? 's' : ''}
              </h2>
              <button onClick={() => { setEditTarget(null); setShowForm(true) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors">
                <Plus size={15} /> Agregar conexión
              </button>
            </div>

            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/[0.08]">
                  <tr>
                    <th className={thCls}>Nombre</th>
                    <th className={thCls}>Tipo</th>
                    <th className={thCls}>Estado</th>
                    <th className={thCls}>Creada</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {connections.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-600 text-sm">Sin conexiones. Agrega la primera.</td></tr>
                  )}
                  {connections.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                      <td className={tdCls}><p className="font-medium text-white">{c.name}</p></td>
                      <td className={tdCls}>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${typeColor[c.type] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
                          {typeLabel[c.type] || c.type}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <span className={`inline-flex items-center gap-1 text-xs ${c.is_active ? 'text-green-400' : 'text-gray-600'}`}>
                          {c.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className={tdCls}><span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('es')}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { setEditTarget(c); setShowForm(true) }}
                            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-gray-500 hover:text-white transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RAG tab */}
        {tab === 'rag' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400">
                Bases de conocimiento — gestión de documentos
              </h2>
              <button
                onClick={() => { setEditTarget(null); setShowForm(true); setTab('connections') }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white transition-colors"
              >
                <Plus size={15} /> Nueva base de conocimiento
              </button>
            </div>

            {kbConnections.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl p-10 text-center">
                <BookOpen size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium mb-1">Sin bases de conocimiento</p>
                <p className="text-gray-600 text-xs">
                  Crea una conexión de tipo "Base de Conocimiento" desde el tab Conexiones.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kbConnections.map((conn) => (
                  <KnowledgeBaseCard key={conn.id} conn={conn} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logs tab */}
        {tab === 'logs' && (
          <div>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tool</label>
                <input className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 w-52"
                  placeholder="Filtrar por nombre…" value={logFilter.tool_name}
                  onChange={(e) => setLogFilter((p) => ({ ...p, tool_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input type="date" className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={logFilter.date_from} onChange={(e) => setLogFilter((p) => ({ ...p, date_from: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input type="date" className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={logFilter.date_to} onChange={(e) => setLogFilter((p) => ({ ...p, date_to: e.target.value }))} />
              </div>
              <button onClick={loadLogs} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm text-white transition-colors">
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>

            <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-white/[0.08]">
                  <tr>
                    <th className={thCls}>Tool</th>
                    <th className={thCls}>Resumen</th>
                    <th className={thCls}>Duración</th>
                    <th className={thCls}>Estado</th>
                    <th className={thCls}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-600 text-sm">Sin logs registrados</td></tr>
                  )}
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                      <td className={tdCls}>
                        <code className="text-xs text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {l.tool_name.replace(/^(query_postgresql_|query_sqlserver_|call_rest_api_|search_knowledge_base_)/, '')}
                        </code>
                      </td>
                      <td className={tdCls}><p className="text-xs text-gray-400 truncate max-w-xs">{l.input_summary}</p></td>
                      <td className={tdCls}><span className="text-xs text-gray-400">{l.duration_ms}ms</span></td>
                      <td className={tdCls}>
                        {l.success
                          ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} />OK</span>
                          : <span className="flex items-center gap-1 text-xs text-red-400"><XCircle size={12} />Error</span>}
                      </td>
                      <td className={tdCls}><span className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString('es')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ConnectionForm
          existing={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={() => { setShowForm(false); setEditTarget(null); loadConnections() }}
        />
      )}
    </div>
  )
}
