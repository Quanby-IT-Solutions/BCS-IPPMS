"use client"

import { useState } from "react"
import { Download01Icon, FileValidationIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/page-header"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Field, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	exportAuditLogs,
	useAuditLogsQuery,
	type AuditLogFilters,
} from "@/features/audit/api/audit.hooks"

const PAGE_SIZE = 25

interface FilterForm {
	from: string
	to: string
	actorId: string
	module: string
}

const EMPTY_FORM: FilterForm = { from: "", to: "", actorId: "", module: "" }

export function AuditView() {
	const [form, setForm] = useState<FilterForm>(EMPTY_FORM)
	const [applied, setApplied] = useState<FilterForm>(EMPTY_FORM)
	const [offset, setOffset] = useState(0)
	const [exporting, setExporting] = useState(false)

	const filters: AuditLogFilters = {
		from: applied.from || undefined,
		to: applied.to || undefined,
		actorId: applied.actorId.trim() || undefined,
		module: applied.module.trim() || undefined,
		limit: PAGE_SIZE,
		offset,
	}

	const { data, isLoading, isError, error, isFetching } = useAuditLogsQuery(filters)

	function applyFilters() {
		setOffset(0)
		setApplied(form)
	}

	function resetFilters() {
		setForm(EMPTY_FORM)
		setApplied(EMPTY_FORM)
		setOffset(0)
	}

	async function handleExport() {
		setExporting(true)
		try {
			await exportAuditLogs({
				from: filters.from,
				to: filters.to,
				actorId: filters.actorId,
				module: filters.module,
			})
			toast.success("Export started")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to export audit logs")
		} finally {
			setExporting(false)
		}
	}

	const total = data?.total ?? 0
	const items = data?.items ?? []
	const pageStart = total === 0 ? 0 : offset + 1
	const pageEnd = offset + items.length
	const canPrev = offset > 0
	const canNext = offset + PAGE_SIZE < total

	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={FileValidationIcon}
				title="Audit Log"
				description="Browse and export system activity."
				actions={
					<Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
						<HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
						{exporting ? "Exporting..." : "Export CSV"}
					</Button>
				}
			/>

			<div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
				<Field>
					<FieldLabel htmlFor="audit-from">From</FieldLabel>
					<Input
						id="audit-from"
						type="date"
						value={form.from}
						onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="audit-to">To</FieldLabel>
					<Input
						id="audit-to"
						type="date"
						value={form.to}
						onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="audit-actor">Actor ID</FieldLabel>
					<Input
						id="audit-actor"
						value={form.actorId}
						onChange={e => setForm(f => ({ ...f, actorId: e.target.value }))}
						placeholder="User id"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="audit-module">Module</FieldLabel>
					<Input
						id="audit-module"
						value={form.module}
						onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
						placeholder="e.g. divisions"
					/>
				</Field>
				<div className="flex items-end gap-2">
					<Button onClick={applyFilters} size="sm" disabled={isFetching}>
						Apply
					</Button>
					<Button onClick={resetFilters} size="sm" variant="outline">
						Reset
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{isError ? (
				<p className="text-destructive text-sm">
					{error instanceof Error ? error.message : "Failed to load audit logs"}
				</p>
			) : null}

			{!isLoading && !isError && items.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-44">Timestamp</TableHead>
								<TableHead>Actor</TableHead>
								<TableHead>Action</TableHead>
								<TableHead>Module</TableHead>
								<TableHead>Entity</TableHead>
								<TableHead className="w-0">Details</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map(log => (
								<TableRow key={log.id}>
									<TableCell className="align-top text-sm whitespace-nowrap tabular-nums">
										{new Date(log.createdAt).toLocaleString()}
									</TableCell>
									<TableCell className="text-muted-foreground align-top text-xs">
										{log.actorId ?? "system"}
									</TableCell>
									<TableCell className="align-top">
										<Badge variant="outline">{log.action}</Badge>
									</TableCell>
									<TableCell className="text-muted-foreground align-top text-sm">
										{log.module ?? "—"}
									</TableCell>
									<TableCell className="text-muted-foreground align-top text-xs">
										{log.entityType
											? `${log.entityType}${log.entityId ? `#${log.entityId}` : ""}`
											: "—"}
									</TableCell>
									<TableCell className="align-top">
										{log.metadata && Object.keys(log.metadata).length ? (
											<Popover>
												<PopoverTrigger render={<Button variant="ghost" size="sm" />}>
													View
												</PopoverTrigger>
												<PopoverContent className="w-80">
													<pre className="max-h-64 overflow-auto text-xs whitespace-pre-wrap">
														{JSON.stringify(log.metadata, null, 2)}
													</pre>
												</PopoverContent>
											</Popover>
										) : (
											<span className="text-muted-foreground text-xs">—</span>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : null}

			{!isLoading && !isError && items.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={FileValidationIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No matching audit events</EmptyTitle>
						<EmptyDescription>Adjust the filters to widen your search.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			{!isError && total > 0 ? (
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-sm tabular-nums">
						{pageStart}–{pageEnd} of {total}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
							disabled={!canPrev || isFetching}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setOffset(o => o + PAGE_SIZE)}
							disabled={!canNext || isFetching}
						>
							Next
						</Button>
					</div>
				</div>
			) : null}
		</section>
	)
}
