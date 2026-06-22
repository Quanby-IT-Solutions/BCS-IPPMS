"use client"

import React from "react"

interface IppmsLogoProps {
	className?: string
	iconSize?: number
	showText?: boolean
	textClassName?: string
}

export function IppmsLogo({
	className = "",
	iconSize = 38,
	showText = true,
	textClassName = "",
}: IppmsLogoProps) {
	return (
		<div className={`flex items-center gap-3 select-none ${className}`}>
			<img
				src="/logo/bcs.png"
				alt="Bureau of Communications Services Logo"
				width={iconSize}
				height={iconSize}
				className="shrink-0 object-contain transition-transform duration-200 hover:scale-105"
			/>

			{/* Brand Text */}
			{showText && (
				<div className="flex flex-col leading-none">
					<div
						className={`flex items-center gap-1 font-sans text-xl font-extrabold tracking-wider text-slate-950 uppercase dark:text-zinc-50 ${textClassName}`}
					>
						IPPMS
						<span className="rounded border border-amber-500/30 bg-amber-500/15 px-1 py-0.5 text-[10px] leading-none font-bold text-amber-600 dark:text-amber-400">
							ENTERPRISE
						</span>
					</div>
					<div className="pt-0.5 font-mono text-[9px] font-semibold tracking-widest text-[#0B1E3F]/70 uppercase dark:text-zinc-400">
						PHILIPPINES • BCS
					</div>
				</div>
			)}
		</div>
	)
}
