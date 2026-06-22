"use client"

import * as React from "react"
import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"

import { buttonVariants, type ButtonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

export const BCS_LOGO_SRC = "/logo/bcs.png"

export interface LogoIconProps {
	size?: number
	className?: string
	priority?: boolean
}

export const LogoIcon = React.memo(({ size = 32, className, priority }: LogoIconProps) => {
	return (
		<Image
			src={BCS_LOGO_SRC}
			alt="Bureau of Communications Services logo"
			width={size}
			height={size}
			priority={priority}
			className={cn("shrink-0 object-contain", className)}
		/>
	)
})
LogoIcon.displayName = "LogoIcon"

export interface LogoProps {
	text?: string
	href?: Route<string>
	showIcon?: boolean
	iconSize?: number
	priority?: boolean
	size?: ButtonVariants["size"]
	variant?: ButtonVariants["variant"]
	className?: string
}

export function Logo({
	text = "Bureau of Communications Services",
	href,
	size = "lg",
	variant = "link",
	showIcon = true,
	iconSize = 40,
	priority,
	className,
}: LogoProps) {
	const content = (
		<>
			{showIcon && <LogoIcon size={iconSize} priority={priority} />}
			{text}
		</>
	)

	if (href) {
		return (
			<Link
				className={cn(buttonVariants({ size, variant }), "text-foreground h-auto gap-2", className)}
				href={href}
			>
				{content}
			</Link>
		)
	}

	return (
		<span
			className={cn(
				buttonVariants({ size, variant }),
				"text-foreground pointer-events-none h-auto gap-2",
				className
			)}
		>
			{content}
		</span>
	)
}
