"use client"

import { useState } from "react"
import { ChartBarLineIcon, Download01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import type { ReportFormat, ReportType } from "@repo/contracts"

import { PageHeader } from "@/core/components/page-header"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Field, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useDivisionsQuery } from "@/features/divisions/api/divisions.hooks"
import {
	exportReport,
	useReportPreviewQuery,
	type ReportParamsForm,
} from "@/features/reports/api/reports.hooks"
import { FileImport } from "@/features/reports/components/file-import"

const NO_DIVISION = "__none__"

const REPORT_TYPES: { value: ReportType; label: string }[] = [
	{ value: "project_summary", label: "Project Summary" },
	{ value: "task_summary", label: "Task Summary" },
	{ value: "audit_summary", label: "Audit Summary" },
]

interface ReportForm {
	type: ReportType
	from: string
	to: string
	divisionId: string
	status: string
	module: string
}

const DEFAULT_FORM: ReportForm = {
	type: "project_summary",
	from: "",
	to: "",
	divisionId: NO_DIVISION,
	status: "",
	module: "",
}

function toParams(form: ReportForm): ReportParamsForm {
	return {
		type: form.type,
		from: form.from || undefined,
		to: form.to || undefined,
		divisionId: form.divisionId === NO_DIVISION ? undefined : Number(form.divisionId),
		status: form.type === "audit_summary" ? undefined : form.status.trim() || undefined,
		module: form.type === "audit_summary" ? form.module.trim() || undefined : undefined,
	}
}

export function ReportsView() {
	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={ChartBarLineIcon}
				title="Reports"
				description="Generate operational reports and export them, or import files."
			/>

			<Tabs defaultValue="generator">
				<TabsList>
					<TabsTrigger value="generator">Report Generator</TabsTrigger>
					<TabsTrigger value="import">File Import</TabsTrigger>
				</TabsList>
				<TabsContent value="generator" className="pt-4">
					<ReportGenerator />
				</TabsContent>
				<TabsContent value="import" className="pt-4">
					<FileImport />
				</TabsContent>
			</Tabs>
		</section>
	)
}

function ReportGenerator() {
	const { data: divisions } = useDivisionsQuery()
	const [form, setForm] = useState<ReportForm>(DEFAULT_FORM)
	const [submitted, setSubmitted] = useState<ReportParamsForm | null>(null)
	const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(null)

	const params = submitted ?? toParams(form)
	const {
		data: preview,
		isFetching,
		isError,
		error,
	} = useReportPreviewQuery(params, submitted !== null)

	const isAudit = form.type === "audit_summary"

	function generate() {
		setSubmitted(toParams(form))
	}

	async function handleExport(format: ReportFormat) {
		setExportingFormat(format)
		try {
			await exportReport(submitted ?? toParams(form), format)
			toast.success(`Exported ${format.toUpperCase()}`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Export failed")
		} finally {
			setExportingFormat(null)
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-3">
				<Field>
					<FieldLabel htmlFor="report-type">Report type</FieldLabel>
					<Select
						value={form.type}
						onValueChange={value => {
							if (typeof value === "string") {
								setForm(f => ({ ...f, type: value as ReportType }))
							}
						}}
					>
						<SelectTrigger id="report-type" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{REPORT_TYPES.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				<Field>
					<FieldLabel htmlFor="report-from">From</FieldLabel>
					<Input
						id="report-from"
						type="date"
						value={form.from}
						onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="report-to">To</FieldLabel>
					<Input
						id="report-to"
						type="date"
						value={form.to}
						onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="report-division">Division</FieldLabel>
					<Select
						value={form.divisionId}
						onValueChange={value => {
							if (typeof value === "string") setForm(f => ({ ...f, divisionId: value }))
						}}
					>
						<SelectTrigger id="report-division" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_DIVISION}>All divisions</SelectItem>
							{(divisions ?? []).map(division => (
								<SelectItem key={division.id} value={String(division.id)}>
									{division.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				{isAudit ? (
					<Field>
						<FieldLabel htmlFor="report-module">Module</FieldLabel>
						<Input
							id="report-module"
							value={form.module}
							onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
							placeholder="e.g. divisions"
						/>
					</Field>
				) : (
					<Field>
						<FieldLabel htmlFor="report-status">Status</FieldLabel>
						<Input
							id="report-status"
							value={form.status}
							onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
							placeholder="e.g. active"
						/>
					</Field>
				)}

				<div className="flex items-end">
					<Button onClick={generate} disabled={isFetching}>
						{isFetching ? "Generating..." : "Generate preview"}
					</Button>
				</div>
			</div>

			{isError ? (
				<p className="text-destructive text-sm">
					{error instanceof Error ? error.message : "Failed to generate report"}
				</p>
			) : null}

			{submitted && isFetching ? (
				<div className="flex flex-col gap-3">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			) : null}

			{preview && !isFetching ? (
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-semibold">{preview.title}</h3>
							<p className="text-muted-foreground text-sm">
								Generated {new Date(preview.generatedAt).toLocaleString()} · {preview.totalRows}{" "}
								total rows
							</p>
						</div>
						<div className="flex gap-2">
							{(["csv", "excel", "pdf"] as ReportFormat[]).map(format => (
								<Button
									key={format}
									variant="outline"
									size="sm"
									onClick={() => handleExport(format)}
									disabled={exportingFormat !== null}
								>
									<HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
									{exportingFormat === format ? "..." : format.toUpperCase()}
								</Button>
							))}
						</div>
					</div>

					{preview.summary.length ? (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{preview.summary.map(item => (
								<Card key={item.label}>
									<CardHeader>
										<CardTitle className="text-muted-foreground text-sm font-medium">
											{item.label}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-2xl font-bold tabular-nums">{item.value}</p>
									</CardContent>
								</Card>
							))}
						</div>
					) : null}

					{preview.columns.length ? (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										{preview.columns.map(column => (
											<TableHead key={column}>{column}</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{preview.rows.map((row, rowIdx) => (
										<TableRow key={rowIdx}>
											{preview.columns.map((_, colIdx) => (
												<TableCell key={colIdx} className="text-sm whitespace-nowrap">
													{row[colIdx] ?? ""}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : null}

					{preview.rows.length < preview.totalRows ? (
						<p className="text-muted-foreground text-xs">
							Showing a sample of {preview.rows.length} of {preview.totalRows} rows. Export for the
							full dataset.
						</p>
					) : null}
				</div>
			) : null}
		</div>
	)
}
