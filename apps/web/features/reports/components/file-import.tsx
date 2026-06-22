"use client"

import { useRef, useState } from "react"
import { Alert02Icon, CloudUploadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useUploadFileMutation } from "@/features/reports/api/files.hooks"

interface CsvPreview {
	headers: string[]
	rows: string[][]
	totalRows: number
	emptyCellRows: number
}

/** Minimal CSV parser: handles double-quoted fields and escaped quotes. */
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
	const records: string[][] = []
	let field = ""
	let record: string[] = []
	let inQuotes = false

	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"'
					i++
				} else {
					inQuotes = false
				}
			} else {
				field += char
			}
			continue
		}

		if (char === '"') {
			inQuotes = true
		} else if (char === ",") {
			record.push(field)
			field = ""
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[i + 1] === "\n") i++
			record.push(field)
			records.push(record)
			record = []
			field = ""
		} else {
			field += char
		}
	}

	if (field.length > 0 || record.length > 0) {
		record.push(field)
		records.push(record)
	}

	const nonEmpty = records.filter(r => r.some(cell => cell.trim().length > 0))
	const headers = nonEmpty[0] ?? []
	const rows = nonEmpty.slice(1)
	return { headers, rows }
}

const PREVIEW_LIMIT = 20

export function FileImport() {
	const inputRef = useRef<HTMLInputElement>(null)
	const upload = useUploadFileMutation()

	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [preview, setPreview] = useState<CsvPreview | null>(null)

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0] ?? null
		setSelectedFile(file)
		setPreview(null)

		if (!file) return
		if (!file.name.toLowerCase().endsWith(".csv")) {
			return
		}

		const reader = new FileReader()
		reader.onload = () => {
			const text = typeof reader.result === "string" ? reader.result : ""
			const { headers, rows } = parseCsv(text)
			const emptyCellRows = rows.filter(r => r.some(cell => cell.trim().length === 0)).length
			setPreview({
				headers,
				rows: rows.slice(0, PREVIEW_LIMIT),
				totalRows: rows.length,
				emptyCellRows,
			})
		}
		reader.readAsText(file)
	}

	async function handleUpload() {
		if (!selectedFile) return
		try {
			const record = await upload.mutateAsync(selectedFile)
			toast.success(`Uploaded "${record.originalName}"`)
			setSelectedFile(null)
			setPreview(null)
			if (inputRef.current) inputRef.current.value = ""
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Upload failed")
		}
	}

	const isCsv = selectedFile?.name.toLowerCase().endsWith(".csv") ?? false

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">File Repository / Import</h2>
				<p className="text-muted-foreground text-sm">
					Upload files to the repository. CSV files get a client-side preview before upload.
				</p>
			</div>

			<div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border p-3 text-sm">
				<HugeiconsIcon
					icon={Alert02Icon}
					strokeWidth={2}
					className="text-primary mt-0.5 size-4 shrink-0"
				/>
				<p className="text-muted-foreground">
					Server-side structured import with row-level validation is not yet available and is
					planned as a follow-up. For now the raw file is stored as-is via the file repository.
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<input
					ref={inputRef}
					type="file"
					onChange={handleFileChange}
					className="text-sm file:mr-3 file:rounded-md file:border file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
				/>
				<Button onClick={handleUpload} disabled={!selectedFile || upload.isPending} size="sm">
					<HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} />
					{upload.isPending ? "Uploading..." : "Upload"}
				</Button>
			</div>

			{selectedFile && !isCsv ? (
				<p className="text-muted-foreground text-sm">
					Preview is only available for .csv files. The selected file will still upload.
				</p>
			) : null}

			{preview ? (
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap gap-2">
						<Badge variant="secondary">{preview.totalRows} data rows</Badge>
						<Badge variant="secondary">{preview.headers.length} columns</Badge>
						<Badge variant={preview.emptyCellRows ? "destructive" : "default"}>
							{preview.emptyCellRows} rows with empty cells
						</Badge>
					</div>

					<div className="overflow-x-auto rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									{preview.headers.map((header, idx) => (
										<TableHead key={`${header}-${idx}`}>{header || `Column ${idx + 1}`}</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{preview.rows.map((row, rowIdx) => (
									<TableRow key={rowIdx}>
										{preview.headers.map((_, colIdx) => (
											<TableCell key={colIdx} className="text-sm whitespace-nowrap">
												{row[colIdx] ?? ""}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
					{preview.totalRows > PREVIEW_LIMIT ? (
						<p className="text-muted-foreground text-xs">
							Showing first {PREVIEW_LIMIT} of {preview.totalRows} rows.
						</p>
					) : null}
				</div>
			) : null}
		</div>
	)
}
