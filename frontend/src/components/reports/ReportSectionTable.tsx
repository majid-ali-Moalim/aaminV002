'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react'
import {
  isLinkableRankingCell,
  parseRankingName,
} from '@/lib/reports/reportRankingUtils'

export type ReportTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

type Props = {
  table: ReportTable
  defaultCollapsed?: boolean
  onExportCsv: () => void
  onExportPdf: () => Promise<void> | void
  onRankingClick?: (columnIndex: number, name: string, rowIndex: number) => void
  isClickableCell?: (columnIndex: number, cell: string | number, rowIndex: number) => boolean
  onCellClick?: (columnIndex: number, cell: string | number, rowIndex: number) => void
}

export default function ReportSectionTable({
  table,
  defaultCollapsed = false,
  onExportCsv,
  onExportPdf,
  onRankingClick,
  isClickableCell,
  onCellClick,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await onExportPdf()
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900">{table.title}</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {table.columns.length} columns · {table.rows.length} row{table.rows.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCsv}
            className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void handlePdf()}
            disabled={pdfLoading}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1 disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            PDF
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead>
              <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                {table.columns.map((col) => (
                  <th key={col} className="px-4 py-3 whitespace-nowrap border-r border-slate-100 last:border-r-0">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.length === 0 ? (
                <tr>
                  <td colSpan={table.columns.length} className="px-4 py-8 text-center text-slate-500">
                    No matching records
                  </td>
                </tr>
              ) : (
                table.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    {row.map((cell, ci) => {
                      const rankingLinkable =
                        onRankingClick &&
                        isLinkableRankingCell(table.title, ci, cell)
                      const name = parseRankingName(cell)
                      const cellClickable =
                        onCellClick &&
                        isClickableCell?.(ci, cell, idx) &&
                        Number(cell) > 0
                      return (
                        <td
                          key={ci}
                          className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap border-r border-slate-50 last:border-r-0"
                        >
                          {rankingLinkable && name ? (
                            <button
                              type="button"
                              onClick={() => onRankingClick!(ci, name, idx)}
                              className="text-red-600 hover:text-red-800 hover:underline font-semibold text-left"
                            >
                              {cell}
                            </button>
                          ) : cellClickable ? (
                            <button
                              type="button"
                              onClick={() => onCellClick!(ci, cell, idx)}
                              className="text-red-600 hover:text-red-800 hover:underline font-semibold text-left"
                            >
                              {cell}
                            </button>
                          ) : (
                            cell
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
