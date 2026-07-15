import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReportTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export type PdfReportInput = {
  title: string
  subtitle?: string
  periodLabel?: string
  summary?: Array<{ label: string; value: string | number; suffix?: string }>
  table?: ReportTable
  secondaryTable?: ReportTable
}

/** Aamin Ambulance brand palette */
const BRAND = {
  red: [179, 31, 36] as [number, number, number],
  orange: [242, 145, 32] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  surface: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
} as const

const LOGO_PATH = '/images/aamin-ambulance-logo.png'
const MARGIN_X = 40
const HEADER_FULL = 98
const HEADER_COMPACT = 52
const FOOTER_H = 34

let logoDataUrlCache: Promise<string | null> | null = null

async function loadLogoDataUrl(): Promise<string | null> {
  if (!logoDataUrlCache) {
    logoDataUrlCache = (async () => {
      try {
        const res = await fetch(LOGO_PATH)
        if (!res.ok) return null
        const blob = await res.blob()
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      } catch {
        return null
      }
    })()
  }
  return logoDataUrlCache
}

function formatGeneratedAt() {
  return new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const y = pageHeight - 22

  doc.setDrawColor(...BRAND.line)
  doc.setLineWidth(0.75)
  doc.line(MARGIN_X, y - 10, pageWidth - MARGIN_X, y - 10)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND.muted)
  doc.text('Aamin Ambulance — Confidential operational report', MARGIN_X, y)

  const generated = `Generated ${formatGeneratedAt()}`
  const genW = doc.getTextWidth(generated)
  doc.text(generated, (pageWidth - genW) / 2, y)

  const pageLabel = `Page ${doc.internal.getNumberOfPages()}`
  doc.text(pageLabel, pageWidth - MARGIN_X - doc.getTextWidth(pageLabel), y)

  doc.setTextColor(...BRAND.dark)
}

function drawFullHeader(doc: jsPDF, input: PdfReportInput, logo: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...BRAND.white)
  doc.rect(0, 0, pageWidth, HEADER_FULL, 'F')

  doc.setFillColor(...BRAND.red)
  doc.rect(0, 0, pageWidth, 4, 'F')

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', MARGIN_X, 14, 148, 42)
    } catch {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND.red)
      doc.text('AAMIN AMBULANCE', MARGIN_X, 36)
    }
  } else {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.red)
    doc.text('AAMIN AMBULANCE', MARGIN_X, 36)
  }

  const metaX = pageWidth - MARGIN_X
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...BRAND.dark)
  const titleLines = doc.splitTextToSize(input.title, 320)
  doc.text(titleLines, metaX, 28, { align: 'right' })

  let metaY = 28 + titleLines.length * 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.muted)

  if (input.subtitle) {
    const subLines = doc.splitTextToSize(input.subtitle, 320)
    doc.text(subLines, metaX, metaY, { align: 'right' })
    metaY += subLines.length * 11 + 2
  }
  if (input.periodLabel) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.orange)
    doc.text(`Period: ${input.periodLabel}`, metaX, metaY, { align: 'right' })
    metaY += 12
  }

  doc.setDrawColor(...BRAND.orange)
  doc.setLineWidth(2)
  doc.line(MARGIN_X, HEADER_FULL - 8, pageWidth - MARGIN_X, HEADER_FULL - 8)

  doc.setTextColor(...BRAND.dark)
  return HEADER_FULL
}

function drawCompactHeader(doc: jsPDF, input: PdfReportInput, logo: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...BRAND.surface)
  doc.rect(0, 0, pageWidth, HEADER_COMPACT, 'F')
  doc.setFillColor(...BRAND.red)
  doc.rect(0, 0, pageWidth, 3, 'F')

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', MARGIN_X, 10, 88, 25)
    } catch {
      /* skip */
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND.dark)
  doc.text(input.title, pageWidth - MARGIN_X, 26, { align: 'right' })

  doc.setDrawColor(...BRAND.line)
  doc.setLineWidth(0.5)
  doc.line(MARGIN_X, HEADER_COMPACT - 4, pageWidth - MARGIN_X, HEADER_COMPACT - 4)

  return HEADER_COMPACT
}

function drawSummarySection(doc: jsPDF, startY: number, summary: PdfReportInput['summary']) {
  if (!summary?.length) return startY

  const pageWidth = doc.internal.pageSize.getWidth()
  const contentW = pageWidth - MARGIN_X * 2
  const cols = summary.length >= 8 ? 4 : summary.length >= 4 ? 3 : 2
  const gap = 10
  const cardW = (contentW - gap * (cols - 1)) / cols
  const cardH = 44

  let y = startY + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND.dark)
  doc.text('Executive Summary', MARGIN_X, y)
  y += 16

  summary.forEach((item, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = MARGIN_X + col * (cardW + gap)
    const cy = y + row * (cardH + gap)

    doc.setFillColor(...BRAND.surface)
    doc.setDrawColor(...BRAND.line)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, cy, cardW, cardH, 4, 4, 'FD')

    doc.setFillColor(...BRAND.red)
    doc.rect(x, cy, 4, cardH, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.muted)
    const labelLines = doc.splitTextToSize(item.label, cardW - 16)
    doc.text(labelLines, x + 12, cy + 14)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...BRAND.dark)
    const valueText = `${item.value}${item.suffix ?? ''}`
    doc.text(valueText, x + 12, cy + cardH - 12)
  })

  const rows = Math.ceil(summary.length / cols)
  return y + rows * (cardH + gap) + 12
}

function renderTable(
  doc: jsPDF,
  table: ReportTable,
  startY: number,
  input: PdfReportInput,
  logo: string | null,
): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = startY

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND.dark)
  doc.text(table.title, MARGIN_X, y)
  y += 10

  autoTable(doc, {
    startY: y,
    head: [table.columns],
    body: table.rows.map((row) => row.map((cell) => String(cell ?? ''))),
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 5, right: 4, bottom: 5, left: 4 },
      textColor: BRAND.dark,
      lineColor: BRAND.line,
      lineWidth: 0.25,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: BRAND.red,
      textColor: BRAND.white,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [255, 251, 250] },
    margin: { left: MARGIN_X, right: MARGIN_X, top: HEADER_COMPACT + 8, bottom: FOOTER_H + 8 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawCompactHeader(doc, input, logo)
      }
      drawFooter(doc)
    },
    willDrawPage: (data) => {
      if (data.pageNumber > 1 && data.cursor) {
        data.cursor.y = HEADER_COMPACT + 12
      }
    },
    showHead: 'everyPage',
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y

  if (y > pageHeight - FOOTER_H - 40) {
    doc.addPage()
    drawCompactHeader(doc, input, logo)
    drawFooter(doc)
    y = HEADER_COMPACT + 16
  } else {
    y += 18
  }

  return y
}

export async function downloadReportPdf(input: PdfReportInput, filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const logo = await loadLogoDataUrl()

  let y = drawFullHeader(doc, input, logo)
  y = drawSummarySection(doc, y, input.summary)

  if (input.table) {
    y = renderTable(doc, input.table, y, input, logo)
  }
  if (input.secondaryTable) {
    y = renderTable(doc, input.secondaryTable, y, input, logo)
  }

  if (!input.table && !input.secondaryTable) {
    drawFooter(doc)
  }

  doc.save(filename)
}

export async function downloadMultiReportPdf(
  title: string,
  periodLabel: string,
  tables: ReportTable[],
  filename: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const logo = await loadLogoDataUrl()
  const input: PdfReportInput = { title, periodLabel, subtitle: 'Combined export bundle' }

  let y = drawFullHeader(doc, input, logo)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.muted)
  doc.text(`${tables.length} report section(s) included in this document.`, MARGIN_X, y + 4)
  y += 22

  tables.forEach((table, index) => {
    const pageHeight = doc.internal.pageSize.getHeight()
    if (index > 0 && y > pageHeight - FOOTER_H - 80) {
      doc.addPage()
      y = drawCompactHeader(doc, input, logo)
      drawFooter(doc)
      y += 12
    }
    y = renderTable(doc, table, y, input, logo)
  })

  doc.save(filename)
}
