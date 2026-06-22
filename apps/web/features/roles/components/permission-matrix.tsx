"use client"

import { useMemo, useState } from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { PermissionCatalogEntry, PermissionName } from "@repo/contracts"

import { Checkbox } from "@/core/components/ui/checkbox"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { usePermissionsQuery } from "@/features/user-management/api/rbac.hooks"

interface PermissionMatrixProps {
	value: PermissionName[]
	onChange: (next: PermissionName[]) => void
	disabled?: boolean
}

interface SubGroup {
	key: string
	label: string
	entries: PermissionCatalogEntry[]
}

interface ModuleGroup {
	key: string
	label: string
	subGroups: SubGroup[]
}

function moduleKeyOf(entry: PermissionCatalogEntry): string {
	return entry.module ?? entry.resource ?? "Other"
}

function subKeyOf(entry: PermissionCatalogEntry): string {
	return entry.subModule ?? entry.resource ?? "General"
}

function leafLabelOf(entry: PermissionCatalogEntry): string {
	return entry.action ?? entry.name
}

export function PermissionMatrix({ value, onChange, disabled }: PermissionMatrixProps) {
	const { data: permissions, isLoading, isError, error } = usePermissionsQuery()
	const [search, setSearch] = useState("")

	const selected = useMemo(() => new Set(value), [value])

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase()
		const list = permissions ?? []
		if (!term) return list
		return list.filter(entry => {
			const haystack = [entry.name, entry.module, entry.subModule, entry.action, entry.resource]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
			return haystack.includes(term)
		})
	}, [permissions, search])

	const groups = useMemo<ModuleGroup[]>(() => {
		const moduleMap = new Map<string, Map<string, PermissionCatalogEntry[]>>()
		for (const entry of filtered) {
			const mKey = moduleKeyOf(entry)
			const sKey = subKeyOf(entry)
			const subMap = moduleMap.get(mKey) ?? new Map<string, PermissionCatalogEntry[]>()
			const arr = subMap.get(sKey) ?? []
			arr.push(entry)
			subMap.set(sKey, arr)
			moduleMap.set(mKey, subMap)
		}
		return Array.from(moduleMap.entries()).map(([mKey, subMap]) => ({
			key: mKey,
			label: mKey,
			subGroups: Array.from(subMap.entries()).map(([sKey, entries]) => ({
				key: sKey,
				label: sKey,
				entries,
			})),
		}))
	}, [filtered])

	function setMany(names: PermissionName[], checked: boolean) {
		if (checked) {
			const next = new Set(value)
			for (const name of names) next.add(name)
			onChange(Array.from(next))
		} else {
			const remove = new Set(names)
			onChange(value.filter(name => !remove.has(name)))
		}
	}

	function toggleOne(name: PermissionName, checked: boolean) {
		setMany([name], checked)
	}

	function groupState(names: PermissionName[]): "all" | "none" | "some" {
		const total = names.length
		const count = names.filter(name => selected.has(name)).length
		if (count === 0) return "none"
		if (count === total) return "all"
		return "some"
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		)
	}

	if (isError) {
		return (
			<p className="text-destructive text-sm">
				{error instanceof Error ? error.message : "Failed to load permissions"}
			</p>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="relative">
				<HugeiconsIcon
					icon={Search01Icon}
					strokeWidth={2}
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
				/>
				<Input
					value={search}
					onChange={e => setSearch(e.target.value)}
					placeholder="Search permissions..."
					className="pl-8"
				/>
			</div>

			{groups.length === 0 ? (
				<p className="text-muted-foreground text-sm">No permissions match your search.</p>
			) : null}

			<div className="flex flex-col gap-5">
				{groups.map(group => {
					const moduleNames = group.subGroups.flatMap(sub => sub.entries.map(e => e.name))
					const mState = groupState(moduleNames)
					return (
						<div key={group.key} className="rounded-lg border">
							<div className="bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
								<Checkbox
									id={`module-${group.key}`}
									checked={mState === "all"}
									indeterminate={mState === "some"}
									onCheckedChange={checked => setMany(moduleNames, checked === true)}
									disabled={disabled}
								/>
								<label
									htmlFor={`module-${group.key}`}
									className="text-sm font-semibold tracking-wide"
								>
									{group.label}
								</label>
								<span className="text-muted-foreground ml-auto text-xs tabular-nums">
									{moduleNames.filter(n => selected.has(n)).length}/{moduleNames.length}
								</span>
							</div>
							<div className="flex flex-col gap-4 p-3">
								{group.subGroups.map(sub => {
									const subNames = sub.entries.map(e => e.name)
									const sState = groupState(subNames)
									return (
										<div key={sub.key} className="flex flex-col gap-2">
											<div className="flex items-center gap-2">
												<Checkbox
													id={`sub-${group.key}-${sub.key}`}
													checked={sState === "all"}
													indeterminate={sState === "some"}
													onCheckedChange={checked => setMany(subNames, checked === true)}
													disabled={disabled}
												/>
												<label
													htmlFor={`sub-${group.key}-${sub.key}`}
													className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
												>
													{sub.label}
												</label>
											</div>
											<div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
												{sub.entries.map(entry => (
													<div key={entry.name} className="flex items-start gap-2">
														<Checkbox
															id={`perm-${entry.name}`}
															checked={selected.has(entry.name)}
															onCheckedChange={checked => toggleOne(entry.name, checked === true)}
															disabled={disabled}
														/>
														<label
															htmlFor={`perm-${entry.name}`}
															className="flex flex-col gap-0.5 text-sm leading-tight font-normal"
														>
															<span>{leafLabelOf(entry)}</span>
															<span className="text-muted-foreground text-xs">{entry.name}</span>
														</label>
													</div>
												))}
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
