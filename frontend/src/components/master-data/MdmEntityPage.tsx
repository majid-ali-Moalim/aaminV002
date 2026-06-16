'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Download,
  Eye,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { mdmService } from '@/lib/api'
import { MDM_ENTITIES, type MdmEntityKey } from '@/lib/master-data/config'

type Row = Record<string, any>

interface MdmEntityPageProps {
  entityKey: MdmEntityKey
  readOnly?: boolean
}

export default function MdmEntityPage({ entityKey, readOnly = false }: MdmEntityPageProps) {
  const def = MDM_ENTITIES[entityKey]
  const [items, setItems] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewRow, setViewRow] = useState<Row | null>(null)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<Record<string, Row[]>>({})

  const loadOptions = useCallback(async () => {
    const needed = def.fields.filter((f) => f.optionsKey).map((f) => f.optionsKey!)
    const unique = [...new Set(needed)]
    const next: Record<string, Row[]> = {}
    await Promise.all(
      unique.map(async (key) => {
        const data = await mdmService.listAll(key, { status: 'active' })
        next[key] = Array.isArray(data) ? data : []
      }),
    )
    setOptions(next)
  }, [def.fields])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await mdmService.list(entityKey, {
        search: search || undefined,
        status: statusFilter,
        page,
        limit: 15,
        includeInactive: statusFilter !== 'active',
      })
      setItems(res?.items ?? [])
      setTotal(res?.total ?? 0)
    } catch {
      toast.error(`Failed to load ${def.label}`)
    } finally {
      setLoading(false)
    }
  }, [entityKey, search, statusFilter, page, def.label])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditRow(null)
    setForm({})
    setModalOpen(true)
  }

  const openEdit = (row: Row) => {
    setEditRow(row)
    const initial: Record<string, string> = {}
    def.fields.forEach((f) => {
      initial[f.key] = row[f.key]?.toString?.() ?? row[f.key] ?? ''
    })
    setForm(initial)
    setModalOpen(true)
  }

  const handleSave = async () => {
    for (const f of def.fields) {
      if (f.required && !form[f.key]?.trim?.()) {
        toast.error(`${f.label} is required`)
        return
      }
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      def.fields.forEach((f) => {
        const v = form[f.key]
        if (v === '' || v === undefined) return
        payload[f.key] = f.type === 'number' ? Number(v) : v
      })
      if (editRow) {
        await mdmService.update(entityKey, editRow.id, payload)
        toast.success(`${def.singular} updated`)
      } else {
        await mdmService.create(entityKey, payload)
        toast.success(`${def.singular} created`)
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row: Row) => {
    if (readOnly) return
    try {
      if (row.isActive) await mdmService.deactivate(entityKey, row.id)
      else await mdmService.activate(entityKey, row.id)
      toast.success(row.isActive ? 'Deactivated' : 'Activated')
      load()
    } catch {
      toast.error('Status update failed')
    }
  }

  const handleDelete = async (row: Row) => {
    if (readOnly || !confirm(`Archive this ${def.singular.toLowerCase()}?`)) return
    try {
      await mdmService.remove(entityKey, row.id)
      toast.success('Archived')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const exportCsv = () => {
    const headers = def.tableColumns.map((c) => c.label).join(',')
    const rows = items
      .map((row) =>
        def.tableColumns
          .map((c) => {
            const v = renderCell(row, c.key, c.render)
            return `"${String(v).replace(/"/g, '""')}"`
          })
          .join(','),
      )
      .join('\n')
    const blob = new Blob([[headers, rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entityKey}.csv`
    a.click()
  }

  const totalPages = Math.max(1, Math.ceil(total / 15))

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              placeholder={`Search ${def.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-gray-200 dark:border-gray-700 px-3 text-sm font-medium bg-white dark:bg-gray-900"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter)
              setPage(1)
            }}
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          {!readOnly && (
            <Button size="sm" className="rounded-xl" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Add {def.singular}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No {def.label.toLowerCase()} found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <tr>
                  {def.tableColumns.map((c) => (
                    <th key={c.key} className="px-4 py-3">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    {def.tableColumns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {renderCell(row, c.key, c.render)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => setViewRow(row)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"
                              onClick={() => toggleActive(row)}
                            >
                              {row.isActive ? (
                                <PowerOff className="w-4 h-4" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                              onClick={() => handleDelete(row)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm">
            <span className="text-gray-500">
              Page {page} of {totalPages} ({total} records)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-lg">
                {editRow ? `Edit ${def.singular}` : `New ${def.singular}`}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {def.fields.map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {f.label}
                    {f.required && ' *'}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm bg-white dark:bg-gray-800"
                      rows={3}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  ) : f.type === 'select' && f.optionsKey ? (
                    <select
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800"
                      value={form[f.key] ?? ''}
                      disabled={Boolean(f.optionsFilterBy && !form[f.optionsFilterBy])}
                      onChange={(e) => {
                        const next = { ...form, [f.key]: e.target.value }
                        if (f.key === 'regionId') next.districtId = ''
                        setForm(next)
                      }}
                    >
                      <option value="">
                        {f.optionsFilterBy && !form[f.optionsFilterBy]
                          ? `Select ${def.fields.find((x) => x.key === f.optionsFilterBy)?.label?.toLowerCase() ?? 'parent'} first`
                          : 'Select...'}
                      </option>
                      {(options[f.optionsKey] ?? [])
                        .filter((o) => {
                          if (!f.optionsFilterBy) return true
                          const parentVal = form[f.optionsFilterBy]
                          if (!parentVal) return false
                          return o[f.optionsFilterBy] === parentVal
                        })
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'color' ? 'color' : 'text'}
                      className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 px-3 text-sm bg-white dark:bg-gray-800"
                      placeholder={f.placeholder}
                      value={form[f.key] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-black">{def.singular} Details</h3>
              <button type="button" onClick={() => setViewRow(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="p-5 space-y-3 text-sm">
              {def.tableColumns.map((c) => (
                <div key={c.key} className="flex justify-between gap-4">
                  <dt className="text-gray-500 font-medium">{c.label}</dt>
                  <dd className="font-bold text-right">{renderCell(viewRow, c.key, c.render)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-2 border-t">
                <dt className="text-gray-500">Created</dt>
                <dd>{viewRow.createdAt ? new Date(viewRow.createdAt).toLocaleString() : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Updated</dt>
                <dd>{viewRow.updatedAt ? new Date(viewRow.updatedAt).toLocaleString() : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

function renderCell(row: Row, key: string, render?: string) {
  if (render === 'status') {
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
          row.isActive
            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    )
  }
  if (render === 'region') return row.region?.name ?? '—'
  if (render === 'district') return row.district?.name ?? '—'
  if (render === 'category') return row.incidentCategory?.name ?? '—'
  if (render === 'color')
    return (
      <span className="inline-flex items-center gap-2">
        <span className="w-4 h-4 rounded-full border" style={{ background: row.color }} />
        {row.color}
      </span>
    )
  if (render === 'sortOrder') return row.sortOrder ?? '—'
  return row[key] ?? '—'
}
