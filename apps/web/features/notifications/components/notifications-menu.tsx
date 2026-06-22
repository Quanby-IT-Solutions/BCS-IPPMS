"use client"

import { useState } from "react"
import Link from "next/link"
import {
	CheckmarkCircle02Icon,
	Notification03Icon,
	NotificationOff01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { NotificationItem } from "@repo/contracts"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import {
	useMarkAllNotificationsReadMutation,
	useMarkNotificationReadMutation,
	useNotificationsQuery,
	useUnreadNotificationCountQuery,
} from "@/features/notifications/api/notifications.hooks"

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 1000 * 60 * 60 * 24 * 365],
	["month", 1000 * 60 * 60 * 24 * 30],
	["day", 1000 * 60 * 60 * 24],
	["hour", 1000 * 60 * 60],
	["minute", 1000 * 60],
]

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

function formatRelativeTime(value: Date | string): string {
	// Typed as Date by the contract, but the oRPC client delivers an ISO string
	// at runtime; coerce before calling Date methods.
	const diff = new Date(value).getTime() - Date.now()
	const abs = Math.abs(diff)

	for (const [unit, ms] of RELATIVE_UNITS) {
		if (abs >= ms) {
			return relativeFormatter.format(Math.round(diff / ms), unit)
		}
	}

	return "just now"
}

export function NotificationsMenu() {
	const [open, setOpen] = useState(false)
	const unreadCount = useUnreadNotificationCountQuery()
	const notifications = useNotificationsQuery({ limit: 8 })
	const markRead = useMarkNotificationReadMutation()
	const markAllRead = useMarkAllNotificationsReadMutation()

	const count = unreadCount.data?.count ?? 0
	const hasUnread = count > 0
	const items = notifications.data ?? []

	const handleSelect = (item: NotificationItem) => {
		if (!item.isRead) {
			markRead.mutate(item.id)
		}
		if (item.linkPath) {
			setOpen(false)
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative"
						aria-label={hasUnread ? `Notifications, ${count} unread` : "Notifications"}
					/>
				}
			>
				<HugeiconsIcon icon={Notification03Icon} strokeWidth={2} className="size-5" />
				{hasUnread ? (
					<Badge
						variant="destructive"
						className="bg-destructive text-destructive-foreground pointer-events-none absolute -top-0.5 -right-0.5 size-4 min-w-4 rounded-full px-0.5 text-[10px] leading-none tabular-nums"
					>
						{count > 99 ? "99+" : count}
					</Badge>
				) : null}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
					<p className="text-sm font-semibold">Notifications</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						disabled={!hasUnread || markAllRead.isPending}
						onClick={() => markAllRead.mutate()}
					>
						<HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3.5" />
						Mark all read
					</Button>
				</div>
				<NotificationList
					isLoading={notifications.isLoading}
					isError={notifications.isError}
					items={items}
					onSelect={handleSelect}
				/>
			</PopoverContent>
		</Popover>
	)
}

interface NotificationListProps {
	isLoading: boolean
	isError: boolean
	items: NotificationItem[]
	onSelect: (item: NotificationItem) => void
}

function NotificationList({ isLoading, isError, items, onSelect }: NotificationListProps) {
	if (isLoading) {
		return (
			<div className="flex flex-col gap-3 p-3">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-4/5" />
			</div>
		)
	}

	if (isError) {
		return (
			<div className="p-4">
				<p className="text-muted-foreground text-sm">Could not load notifications.</p>
			</div>
		)
	}

	if (items.length === 0) {
		return (
			<Empty className="border-0 p-6">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<HugeiconsIcon icon={NotificationOff01Icon} strokeWidth={2} />
					</EmptyMedia>
					<EmptyTitle>No notifications</EmptyTitle>
					<EmptyDescription>You are all caught up.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<ScrollArea className="max-h-80">
			<ul className="flex flex-col py-1">
				{items.map(item => (
					<li key={item.id}>
						<NotificationRow item={item} onSelect={onSelect} />
					</li>
				))}
			</ul>
		</ScrollArea>
	)
}

interface NotificationRowProps {
	item: NotificationItem
	onSelect: (item: NotificationItem) => void
}

function NotificationRow({ item, onSelect }: NotificationRowProps) {
	const content = (
		<div className="flex items-start gap-2.5">
			<span
				className={cn(
					"mt-1.5 size-2 shrink-0 rounded-full",
					item.isRead ? "bg-muted-foreground/30" : "bg-primary"
				)}
				aria-hidden
			/>
			<div className="min-w-0 flex-1">
				<p className={cn("truncate text-sm", !item.isRead && "font-medium")}>{item.title}</p>
				{item.body ? (
					<p className="text-muted-foreground line-clamp-2 text-xs">{item.body}</p>
				) : null}
				<p className="text-muted-foreground mt-0.5 text-[11px]">
					{formatRelativeTime(item.createdAt)}
				</p>
			</div>
		</div>
	)

	const className =
		"hover:bg-muted/60 focus-visible:bg-muted/60 block w-full px-3 py-2.5 text-left outline-none transition-colors"

	if (item.linkPath) {
		return (
			<Link href={item.linkPath} className={className} onClick={() => onSelect(item)}>
				{content}
			</Link>
		)
	}

	return (
		<button type="button" className={className} onClick={() => onSelect(item)}>
			{content}
		</button>
	)
}
