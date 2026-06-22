import { DeliveryTruck01Icon, MapsLocation01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { ShellPage, ShellSection, ShellStatCard } from "@/features/shells/components/shell-page"

interface MockInventoryItem {
	sku: string
	title: string
	onHand: number
	reserved: number
	location: string
}

const MOCK_INVENTORY: readonly MockInventoryItem[] = [
	{ sku: "PUB-0012", title: "Annual Report 2025", onHand: 1240, reserved: 300, location: "WH-A" },
	{ sku: "FRM-0455", title: "Census Form Pack", onHand: 8600, reserved: 1200, location: "WH-B" },
	{ sku: "MAN-0033", title: "Training Manual", onHand: 95, reserved: 80, location: "WH-A" },
	{ sku: "BRC-0077", title: "Investor Brochure", onHand: 4300, reserved: 0, location: "WH-C" },
]

interface MockMovement {
	id: string
	sku: string
	type: "Inbound" | "Outbound" | "Transfer"
	qty: number
	date: string
}

const MOCK_MOVEMENTS: readonly MockMovement[] = [
	{ id: "MV-9001", sku: "PUB-0012", type: "Inbound", qty: 500, date: "2026-06-09" },
	{ id: "MV-9002", sku: "MAN-0033", type: "Outbound", qty: 120, date: "2026-06-09" },
	{ id: "MV-9003", sku: "FRM-0455", type: "Transfer", qty: 2000, date: "2026-06-08" },
	{ id: "MV-9004", sku: "BRC-0077", type: "Outbound", qty: 700, date: "2026-06-07" },
]

const MOVEMENT_VARIANTS: Record<MockMovement["type"], "default" | "secondary" | "outline"> = {
	Inbound: "default",
	Outbound: "secondary",
	Transfer: "outline",
}

interface MockStorage {
	zone: string
	capacity: number
	used: number
	contents: string
}

const MOCK_STORAGE: readonly MockStorage[] = [
	{ zone: "WH-A", capacity: 100, used: 82, contents: "Publications, Manuals" },
	{ zone: "WH-B", capacity: 100, used: 64, contents: "Forms" },
	{ zone: "WH-C", capacity: 100, used: 35, contents: "Brochures" },
]

interface MockCirculation {
	id: string
	title: string
	channel: string
	status: "Active" | "Paused" | "Closed"
}

const MOCK_CIRCULATION: readonly MockCirculation[] = [
	{ id: "CR-301", title: "Annual Report Distribution", channel: "Direct Mail", status: "Active" },
	{ id: "CR-302", title: "Census Forms to LGUs", channel: "Courier", status: "Active" },
	{ id: "CR-303", title: "Manual Internal Issue", channel: "Internal", status: "Paused" },
	{ id: "CR-304", title: "Brochure Campaign Q1", channel: "Events", status: "Closed" },
]

const CIRCULATION_VARIANTS: Record<MockCirculation["status"], "default" | "secondary" | "outline"> =
	{
		Active: "default",
		Paused: "secondary",
		Closed: "outline",
	}

interface MockDispatch {
	id: string
	destination: string
	carrier: string
	items: number
}

const MOCK_DISPATCH: readonly MockDispatch[] = [
	{ id: "DS-7701", destination: "Region IV-A", carrier: "FastCourier", items: 1200 },
	{ id: "DS-7702", destination: "NCR Central", carrier: "In-house Fleet", items: 540 },
	{ id: "DS-7703", destination: "Region VII", carrier: "CargoLink", items: 2300 },
]

interface MockShipment {
	id: string
	location: string
	eta: string
}

const MOCK_SHIPMENTS: readonly MockShipment[] = [
	{ id: "DS-7701", location: "Calamba Hub", eta: "2026-06-12" },
	{ id: "DS-7702", location: "Quezon City Depot", eta: "2026-06-11" },
	{ id: "DS-7703", location: "Cebu Port", eta: "2026-06-14" },
]

export function CirculationShell() {
	return (
		<ShellPage
			icon={DeliveryTruck01Icon}
			title="Circulation"
			description="Inventory, stock movement, storage, dispatch, and logistics tracking."
		>
			<Tabs defaultValue="inventory">
				<TabsList>
					<TabsTrigger value="inventory">Inventory</TabsTrigger>
					<TabsTrigger value="movement">Stock Movement</TabsTrigger>
					<TabsTrigger value="storage">Storage</TabsTrigger>
					<TabsTrigger value="circulation">Circulation List</TabsTrigger>
					<TabsTrigger value="dispatch">Dispatch</TabsTrigger>
					<TabsTrigger value="logistics">Logistics Map</TabsTrigger>
				</TabsList>

				<TabsContent value="inventory" className="flex flex-col gap-4 pt-4">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<ShellStatCard label="Total SKUs" value="412" hint="Across 3 warehouses" />
						<ShellStatCard label="Units On Hand" value="14,235" hint="Available + reserved" />
						<ShellStatCard label="Reserved" value="1,580" hint="Pending dispatch" />
						<ShellStatCard label="Low Stock" value="7" hint="Below reorder point" />
					</div>
					<ShellSection title="Inventory Dashboard" description="Current stock positions by SKU.">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>SKU</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>On Hand</TableHead>
									<TableHead>Reserved</TableHead>
									<TableHead>Location</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_INVENTORY.map(item => (
									<TableRow key={item.sku}>
										<TableCell className="font-medium">{item.sku}</TableCell>
										<TableCell>{item.title}</TableCell>
										<TableCell className="tabular-nums">{item.onHand}</TableCell>
										<TableCell className="tabular-nums">{item.reserved}</TableCell>
										<TableCell className="text-muted-foreground">{item.location}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ShellSection>
				</TabsContent>

				<TabsContent value="movement" className="pt-4">
					<ShellSection
						title="Stock Movement Log"
						description="Recent inbound, outbound, and transfer events."
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Ref</TableHead>
									<TableHead>SKU</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Qty</TableHead>
									<TableHead>Date</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_MOVEMENTS.map(mv => (
									<TableRow key={mv.id}>
										<TableCell className="font-medium">{mv.id}</TableCell>
										<TableCell>{mv.sku}</TableCell>
										<TableCell>
											<Badge variant={MOVEMENT_VARIANTS[mv.type]}>{mv.type}</Badge>
										</TableCell>
										<TableCell className="tabular-nums">{mv.qty}</TableCell>
										<TableCell className="text-muted-foreground">{mv.date}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ShellSection>
				</TabsContent>

				<TabsContent value="storage" className="pt-4">
					<ShellSection title="Storage Allocation" description="Warehouse zone utilization.">
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{MOCK_STORAGE.map(zone => (
								<div
									key={zone.zone}
									className="border-border flex flex-col gap-2 rounded-lg border p-3"
								>
									<div className="flex items-center justify-between">
										<span className="font-medium">{zone.zone}</span>
										<span className="text-muted-foreground text-xs tabular-nums">{zone.used}%</span>
									</div>
									<div className="bg-muted h-2 w-full overflow-hidden rounded-full">
										<div className="bg-primary h-full" style={{ width: `${zone.used}%` }} />
									</div>
									<span className="text-muted-foreground text-xs">{zone.contents}</span>
								</div>
							))}
						</div>
					</ShellSection>
				</TabsContent>

				<TabsContent value="circulation" className="pt-4">
					<ShellSection
						title="Circulation Master List"
						description="Active and historical distribution programs."
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>Channel</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{MOCK_CIRCULATION.map(item => (
									<TableRow key={item.id}>
										<TableCell className="font-medium">{item.id}</TableCell>
										<TableCell>{item.title}</TableCell>
										<TableCell className="text-muted-foreground">{item.channel}</TableCell>
										<TableCell>
											<Badge variant={CIRCULATION_VARIANTS[item.status]}>{item.status}</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ShellSection>
				</TabsContent>

				<TabsContent value="dispatch" className="pt-4">
					<ShellSection title="Dispatch Documentation" description="Outbound dispatch records.">
						<ol className="flex flex-col gap-2">
							{MOCK_DISPATCH.map(d => (
								<li
									key={d.id}
									className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
								>
									<div className="flex flex-col">
										<span className="font-medium">{d.id}</span>
										<span className="text-muted-foreground text-xs">
											{d.destination} · {d.carrier}
										</span>
									</div>
									<Badge variant="secondary">{d.items} items</Badge>
								</li>
							))}
						</ol>
					</ShellSection>
				</TabsContent>

				<TabsContent value="logistics" className="pt-4">
					<ShellSection
						title="Logistics Tracking Map"
						description="Live shipment positions (preview)."
					>
						<div className="flex flex-col gap-4">
							<div className="border-border bg-muted/30 flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
								<HugeiconsIcon
									icon={MapsLocation01Icon}
									strokeWidth={2}
									className="text-muted-foreground size-8"
								/>
								<span className="text-muted-foreground text-sm">Map preview</span>
								<span className="text-muted-foreground text-xs">
									Interactive map not yet integrated
								</span>
							</div>
							<ul className="flex flex-col gap-2">
								{MOCK_SHIPMENTS.map(s => (
									<li
										key={s.id}
										className="border-border flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
									>
										<span className="inline-flex items-center gap-2">
											<HugeiconsIcon
												icon={MapsLocation01Icon}
												strokeWidth={2}
												className="text-primary size-4"
											/>
											<span className="font-medium">{s.id}</span>
											<span className="text-muted-foreground">{s.location}</span>
										</span>
										<Badge variant="outline">ETA {s.eta}</Badge>
									</li>
								))}
							</ul>
						</div>
					</ShellSection>
				</TabsContent>
			</Tabs>
		</ShellPage>
	)
}
