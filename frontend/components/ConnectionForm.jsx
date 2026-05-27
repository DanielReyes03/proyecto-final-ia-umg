'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { createConnection, updateConnection } from '@/services/api'

const defaultConfigs = {
  postgresql: { host: '', port: '5432', database: '', user: '', password: '' },
  sqlserver: { host: '', port: '1433', database: '', user: '', password: '', instance: '' },
  rest_api: { base_url: '', default_headers: '{}' },
}

export default function ConnectionForm({ existing, onClose, onSaved }) {
  const isEdit = !!existing
  const [type, setType] = useState(existing?.type || 'postgresql')
  const [name, setName] = useState(existing?.name || '')
  const [iconName, setIconName] = useState(existing?.icon_name || 'database')
  const [isActive, setIsActive] = useState(existing?.is_active ?? true)
  const [config, setConfig] = useState(defaultConfigs[existing?.type || 'postgresql'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (k, v) => setConfig((prev) => ({ ...prev, [k]: v }))

  const buildPayload = () => {
    let parsedConfig = { ...config }
    if (type === 'rest_api') {
      try { parsedConfig.default_headers = JSON.parse(config.default_headers || '{}') }
      catch { throw new Error('Headers JSON inválido') }
    }
    if (type === 'postgresql' || type === 'sqlserver') {
      parsedConfig.port = parseInt(parsedConfig.port) || (type === 'postgresql' ? 5432 : 1433)
    }
    return { name, type, icon_name: iconName, is_active: isActive, config: parsedConfig }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('El nombre es requerido')
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isEdit) await updateConnection(existing.id, payload)
      else await createConnection(payload)
      onSaved()
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors'
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Editar conexión' : 'Nueva conexión'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className={labelCls}>Tipo de conexión</label>
            <div className="flex gap-2">
              {['postgresql', 'sqlserver', 'rest_api'].map((t) => (
                <button key={t} type="button"
                  onClick={() => { setType(t); setConfig(defaultConfigs[t]) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                  }`}>
                  {t === 'postgresql' ? 'PostgreSQL' : t === 'sqlserver' ? 'SQL Server' : 'REST API'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Nombre</label>
            <input className={inputCls} placeholder="Ej: PostgreSQL Northwind" value={name}
              onChange={(e) => setName(e.target.value)} required />
          </div>

          {(type === 'postgresql' || type === 'sqlserver') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Host</label>
                  <input className={inputCls} placeholder="localhost" value={config.host} onChange={(e) => setField('host', e.target.value)} required /></div>
                <div><label className={labelCls}>Puerto</label>
                  <input className={inputCls} type="number" value={config.port} onChange={(e) => setField('port', e.target.value)} required /></div>
              </div>
              <div><label className={labelCls}>Base de datos</label>
                <input className={inputCls} placeholder="northwind" value={config.database} onChange={(e) => setField('database', e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Usuario</label>
                  <input className={inputCls} placeholder="postgres" value={config.user} onChange={(e) => setField('user', e.target.value)} required /></div>
                <div><label className={labelCls}>Contraseña</label>
                  <input className={inputCls} type="password" placeholder="••••••••" value={config.password} onChange={(e) => setField('password', e.target.value)} /></div>
              </div>
              {type === 'sqlserver' && (
                <div><label className={labelCls}>Instancia (opcional)</label>
                  <input className={inputCls} placeholder="SQLEXPRESS" value={config.instance} onChange={(e) => setField('instance', e.target.value)} /></div>
              )}
            </>
          )}

          {type === 'rest_api' && (
            <>
              <div><label className={labelCls}>URL base</label>
                <input className={inputCls} placeholder="https://api.ejemplo.com" value={config.base_url} onChange={(e) => setField('base_url', e.target.value)} required /></div>
              <div><label className={labelCls}>Headers por defecto (JSON)</label>
                <textarea className={`${inputCls} resize-none`} rows={3}
                  placeholder='{"Authorization": "Bearer token"}' value={config.default_headers}
                  onChange={(e) => setField('default_headers', e.target.value)} /></div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-gray-400">Conexión activa</span>
            <button type="button" onClick={() => setIsActive(!isActive)}
              className="rounded-full transition-colors relative"
              style={{ width: 40, height: 20, background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.15)' }}>
              <span className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform"
                style={{ width: 16, height: 16, transform: isActive ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
          </div>

          {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors disabled:opacity-50">
              {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear conexión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
