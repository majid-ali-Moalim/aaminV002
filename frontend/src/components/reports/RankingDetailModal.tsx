'use client'

import { useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'
import type { ReportCaseTable } from '@/lib/reports/reportRankingUtils'
import { downloadSectionPdf, type PdfReportInput } from '@/lib/reports/exportPdf'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  detailTable: ReportCaseTable | null
  pdfMeta?: PdfReportInput
  pdfFilename?: string
}

export default function RankingDetailModal({
  open,
  onClose,
  title,
  subtitle,
  detailTable,
  pdfMeta,
  pdfFilename,
}: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)

  if (!open) return null

  const handlePdf = async () => {
    if (!detailTable || !pdfMeta) return
    setPdfLoading(true)
    try {
      const safeName = (pdfFilename || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')
      await downloadSectionPdf(
        { ...pdfMeta, subtitle: title, includeSummary: false },
        { title, columns: detailTable.columns, rows: detailTable.rows },
        `${safeName}.pdf`,
      )
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detailTable && detailTable.rows.length > 0 && pdfMeta && (
              <button
                type="button"
                onClick={() => void handlePdf()}
                disabled={pdfLoading}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-2 disabled:opacity-60"
              >
                {pdfLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                PDF Report
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-100 text-slate-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!detailTable || detailTable.rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">No matching case records found.</p>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {detailTable.rows.length} case record(s)
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-700">
                      {detailTable.columns.map((col) => (
                        <th key={col} className="px-3 py-2 whitespace-nowrap border-r border-slate-100 last:border-r-0">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailTable.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-slate-800 whitespace-nowrap border-r border-slate-50 last:border-r-0"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
