import type { ReportFormat } from "@repo/contracts"

import type { ReportDataset } from "./reports.service"

/** A rendered report file ready to stream as a download. */
export interface RenderedReport {
	body: Buffer
	contentType: string
	filename: string
}

// ============================================================================
// CSV
// ============================================================================

/**
 * Escape a CSV cell: quote values containing delimiters/quotes/newlines and
 * neutralize spreadsheet formula injection by prefixing leading =, +, -, @.
 */
function csvEscape(value: string): string {
	let str = value
	if (/^[=+\-@]/.test(str)) str = `'${str}`
	if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
	return str
}

function toCsv(dataset: ReportDataset): string {
	const lines = [dataset.columns.map(csvEscape).join(",")]
	for (const row of dataset.rows) {
		lines.push(row.map(csvEscape).join(","))
	}
	return lines.join("\r\n")
}

// ============================================================================
// EXCEL — SpreadsheetML 2003 (XML) — opens natively in Excel, no dependency
// ============================================================================

function xmlEscape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}

function xmlCell(value: string): string {
	return `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`
}

function xmlRow(values: string[]): string {
	return `<Row>${values.map(xmlCell).join("")}</Row>`
}

function toExcelXml(dataset: ReportDataset): string {
	const headerRows: string[] = [
		xmlRow([dataset.title]),
		xmlRow(["Generated", dataset.generatedAt.toISOString()]),
	]

	const filters = dataset.filters
	const filterPairs: [string, string | null][] = [
		["From", filters.from ? filters.from.toISOString() : null],
		["To", filters.to ? filters.to.toISOString() : null],
		["Division ID", filters.divisionId !== null ? String(filters.divisionId) : null],
		["Status", filters.status],
		["Module", filters.module],
	]
	for (const [label, value] of filterPairs) {
		if (value !== null) headerRows.push(xmlRow([label, value]))
	}

	const summaryRows = dataset.summary.map(item => xmlRow([item.label, String(item.value)]))

	const tableRows = [xmlRow(dataset.columns), ...dataset.rows.map(xmlRow)]

	const allRows = [
		...headerRows,
		xmlRow([]),
		xmlRow(["Summary"]),
		...summaryRows,
		xmlRow([]),
		...tableRows,
	]

	return [
		'<?xml version="1.0"?>',
		'<?mso-application progid="Excel.Sheet"?>',
		'<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
			'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
		'<Worksheet ss:Name="Report">',
		"<Table>",
		allRows.join(""),
		"</Table>",
		"</Worksheet>",
		"</Workbook>",
	].join("")
}

// ============================================================================
// PDF — minimal hand-built PDF 1.4 (Courier), no dependency
// ============================================================================

const PDF_PAGE_WIDTH = 612
const PDF_PAGE_HEIGHT = 792
const PDF_MARGIN = 40
const PDF_FONT_SIZE = 9
const PDF_LEADING = 12
const PDF_TOP = PDF_PAGE_HEIGHT - PDF_MARGIN
const PDF_LINES_PER_PAGE = Math.floor((PDF_PAGE_HEIGHT - 2 * PDF_MARGIN) / PDF_LEADING)
const PDF_MAX_CHARS = 92

/** Reduce a string to printable ASCII (Courier/WinAnsi safe) and truncate. */
function pdfSanitize(value: string): string {
	const ascii = value.replace(/[^\x20-\x7e]/g, "?")
	return ascii.length > PDF_MAX_CHARS ? `${ascii.slice(0, PDF_MAX_CHARS - 1)}>` : ascii
}

/** Escape the characters significant inside a PDF literal string. */
function pdfEscape(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

/** Flatten a dataset into the ordered text lines that make up the document. */
function pdfLines(dataset: ReportDataset): string[] {
	const lines: string[] = [dataset.title, `Generated: ${dataset.generatedAt.toISOString()}`]

	const filters = dataset.filters
	if (filters.from) lines.push(`From: ${filters.from.toISOString()}`)
	if (filters.to) lines.push(`To: ${filters.to.toISOString()}`)
	if (filters.divisionId !== null) lines.push(`Division ID: ${filters.divisionId}`)
	if (filters.status) lines.push(`Status: ${filters.status}`)
	if (filters.module) lines.push(`Module: ${filters.module}`)

	lines.push("", "Summary")
	for (const item of dataset.summary) lines.push(`  ${item.label}: ${item.value}`)

	lines.push("", dataset.columns.join(" | "))
	for (const row of dataset.rows) lines.push(row.join(" | "))

	return lines.map(pdfSanitize)
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = []
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
	return out.length ? out : [[]]
}

function toPdf(dataset: ReportDataset): Buffer {
	const pages = chunk(pdfLines(dataset), PDF_LINES_PER_PAGE)

	// Object layout: 1=Catalog, 2=Pages, 3=Font, then per page a Page + Contents.
	const fontObjNum = 3
	const objects: string[] = []
	const pageObjNums: number[] = []
	const contentObjNums: number[] = []

	let nextObj = fontObjNum + 1
	for (let i = 0; i < pages.length; i++) {
		pageObjNums.push(nextObj++)
		contentObjNums.push(nextObj++)
	}

	objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
	objects[2] = `<< /Type /Pages /Kids [${pageObjNums
		.map(n => `${n} 0 R`)
		.join(" ")}] /Count ${pageObjNums.length} >>`
	objects[fontObjNum] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"

	pages.forEach((pageLines, idx) => {
		const pageNum = pageObjNums[idx]!
		const contentNum = contentObjNums[idx]!

		const textOps = [
			"BT",
			`/F1 ${PDF_FONT_SIZE} Tf`,
			`${PDF_LEADING} TL`,
			`1 0 0 1 ${PDF_MARGIN} ${PDF_TOP} Tm`,
		]
		pageLines.forEach((line, lineIdx) => {
			const op = `(${pdfEscape(line)}) Tj`
			textOps.push(lineIdx === 0 ? op : `T* ${op}`)
		})
		textOps.push("ET")
		const stream = textOps.join("\n")

		objects[contentNum] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`
		objects[
			pageNum
		] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>`
	})

	const totalObjs = nextObj - 1
	let pdf = "%PDF-1.4\n"
	const offsets: number[] = []
	for (let i = 1; i <= totalObjs; i++) {
		offsets[i] = Buffer.byteLength(pdf, "latin1")
		pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
	}

	const xrefOffset = Buffer.byteLength(pdf, "latin1")
	pdf += `xref\n0 ${totalObjs + 1}\n`
	pdf += "0000000000 65535 f \n"
	for (let i = 1; i <= totalObjs; i++) {
		pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
	}
	pdf += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

	return Buffer.from(pdf, "latin1")
}

// ============================================================================
// PUBLIC
// ============================================================================

/** Render a dataset into the requested download format. */
export function renderReport(dataset: ReportDataset, format: ReportFormat): RenderedReport {
	const base = `report-${dataset.type}`

	switch (format) {
		case "csv":
			return {
				body: Buffer.from(toCsv(dataset), "utf-8"),
				contentType: "text/csv; charset=utf-8",
				filename: `${base}.csv`,
			}
		case "excel":
			return {
				body: Buffer.from(toExcelXml(dataset), "utf-8"),
				contentType: "application/vnd.ms-excel",
				filename: `${base}.xls`,
			}
		case "pdf":
			return {
				body: toPdf(dataset),
				contentType: "application/pdf",
				filename: `${base}.pdf`,
			}
	}
}
