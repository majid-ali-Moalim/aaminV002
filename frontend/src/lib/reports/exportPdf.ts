import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReportTable = {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

type PdfReportInput = {
  title: string
  subtitle?: string
  periodLabel?: string
  summary?: Array<{ label: string; value: string | number; suffix?: string }>
  table?: ReportTable
  secondaryTable?: ReportTable
}

export function downloadReportPdf(input: PdfReportInput, filename: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 40

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(input.title, 40, y)
  y += 22

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (input.subtitle) {
    doc.text(input.subtitle, 40, y)
    y += 16
  }
  if (input.periodLabel) {
    doc.text(`Period: ${input.periodLabel}`, 40, y)
    y += 16
  }

  if (input.summary?.length) {
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Summary', 40, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    const summaryText = input.summary
      .map((s) => `${s.label}: ${s.value}${s.suffix ?? ''}`)
      .join('   |   ')
    const lines = doc.splitTextToSize(summaryText, pageWidth - 80)
    doc.text(lines, 40, y)
    y += lines.length * 12 + 10
  }

  const renderTable = (table: ReportTable) => {
    doc.setFont('helvetica', 'bold')
    doc.text(table.title, 40, y)
    y += 8
    autoTable(doc, {
      startY: y,
      head: [table.columns],
      body: table.rows.map((row) => row.map((cell) => String(cell ?? ''))),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [239, 45, 45], textColor: 255 },
      margin: { left: 40, right: 40 },
    })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    y += 20
  }

  if (input.table) renderTable(input.table)
  if (input.secondaryTable) renderTable(input.secondaryTable)

  doc.save(filename)
}

export function downloadMultiReportPdf(
  title: string,
  periodLabel: string,
  tables: ReportTable[],
  filename: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  let y = 40

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 40, y)
  y += 22
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${periodLabel}`, 40, y)
  y += 24

  tables.forEach((table, index) => {
    if (index > 0 && y > 500) {
      doc.addPage()
      y = 40
    }
    doc.setFont('helvetica', 'bold')
    doc.text(table.title, 40, y)
    y += 8
    autoTable(doc, {
      startY: y,
      head: [table.columns],
      body: table.rows.map((row) => row.map((cell) => String(cell ?? ''))),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [239, 45, 45], textColor: 255 },
      margin: { left: 40, right: 40 },
    })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    y += 24
  })

  doc.save(filename)
}
