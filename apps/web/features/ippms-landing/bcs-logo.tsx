"use client"

import React from "react"

interface BcsLogoProps {
	className?: string
	size?: number
	showIcon?: boolean
}

export function BcsLogo({ className = "", size = 48, showIcon = true }: BcsLogoProps) {
	return (
		<div className={`flex items-center gap-3 select-none ${className}`}>
			{showIcon && (
				<img
					src="/logo/bcs.png"
					alt="Bureau of Communications Services Logo"
					width={size}
					height={size}
					className="shrink-0 object-contain transition-transform duration-200 hover:scale-105"
				/>
			)}
			<div className="flex flex-col leading-none">
				<div className="text-[12px] font-extrabold tracking-wider text-slate-900 uppercase dark:text-zinc-100">
					REPUBLIC OF THE PHILIPPINES
				</div>
				<div className="pt-0.5 text-[10px] font-bold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
					BUREAU OF COMMUNICATIONS SERVICES
				</div>
			</div>
		</div>
	)
}
