"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"

import { ThemeToggle } from "@/core/components/theme-toggle"
import { authClient } from "@/services/better-auth/auth-client"

import { BcsLogo } from "./bcs-logo"
import { IppmsLogo } from "./ippms-logo"

// Standard fade-up animation settings
const scrollFadeUp = {
	initial: { opacity: 0, y: 30 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-100px" },
	transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
}

const staggerContainer = {
	initial: {},
	whileInView: {
		transition: {
			staggerChildren: 0.1,
		},
	},
}

export function IppmsLandingPage() {
	const { data: session } = authClient.useSession()
	const isLoggedIn = !!session
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [activeWorkflowStep, setActiveWorkflowStep] = useState(0)
	const [activeProdStep, setActiveProdStep] = useState(0)

	// Cycle through animated flows automatically
	useEffect(() => {
		const wfInterval = setInterval(() => {
			setActiveWorkflowStep(prev => (prev + 1) % 4)
		}, 3000)

		const prodInterval = setInterval(() => {
			setActiveProdStep(prev => (prev + 1) % 4)
		}, 4000)

		return () => {
			clearInterval(wfInterval)
			clearInterval(prodInterval)
		}
	}, [])

	return (
		<div className="bg-background text-foreground selection:bg-primary/20 selection:text-primary min-h-screen w-full overflow-x-hidden font-sans antialiased">
			{/* SECTION 1: Philippine Gov Header + Navbar */}
			<header className="border-border/80 bg-background/95 sticky top-0 z-50 w-full border-b backdrop-blur-md">
				{/* Official Philippine Government Top-Bar */}
				<div className="w-full border-b border-zinc-800 bg-[#0B1E3F] px-4 py-1.5 text-[11px] font-medium text-slate-100 md:px-8">
					<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<svg
								width="12"
								height="12"
								viewBox="0 0 100 100"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="shrink-0 text-amber-400"
							>
								<circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" />
								<polygon
									points="50,15 54,30 68,30 57,40 61,55 50,45 39,55 43,40 32,30 46,30"
									fill="currentColor"
								/>
							</svg>
							<span>BANSANG PILIPINAS • Official Government Agency Workspace</span>
						</div>
						<div className="flex items-center gap-4">
							<span className="hidden opacity-70 sm:inline">Bureau of Communications Services</span>
							<a
								href="https://www.gov.ph"
								target="_blank"
								rel="noopener noreferrer"
								className="font-semibold text-amber-400 transition hover:underline"
							>
								GOV.PH Portal
							</a>
						</div>
					</div>
				</div>

				{/* Primary Navigation Menu */}
				<div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
					<div className="flex items-center gap-6">
						<Link href="/" className="transition hover:opacity-90">
							<IppmsLogo iconSize={40} showText={true} />
						</Link>
						<div className="bg-border hidden h-8 w-px xl:block" />
						<div className="hidden xl:block">
							<BcsLogo size={36} showIcon={false} />
						</div>
					</div>

					{/* Desktop Navigation Links */}
					<nav className="hidden items-center gap-7 text-[14px] font-semibold text-zinc-600 lg:flex dark:text-zinc-300">
						<a href="#problems" className="hover:text-primary py-1 transition">
							Pain Points
						</a>
						<a href="#modules" className="hover:text-primary py-1 transition">
							Core Modules
						</a>
						<a href="#flows" className="hover:text-primary py-1 transition">
							Operations
						</a>
						<a href="#security" className="hover:text-primary py-1 transition">
							Security
						</a>
						<a href="#technical" className="hover:text-primary py-1 transition">
							SLA & Tech
						</a>
					</nav>

					{/* Actions Right */}
					<div className="hidden items-center gap-3 sm:flex">
						<ThemeToggle />
						<a
							href="#briefing"
							className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
						>
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="shrink-0"
							>
								<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
								<line x1="16" x2="16" y1="2" y2="6" />
								<line x1="8" x2="8" y1="2" y2="6" />
								<line x1="3" x2="21" y1="10" y2="10" />
								<path d="M8 14h.01" />
								<path d="M12 14h.01" />
								<path d="M16 14h.01" />
								<path d="M8 18h.01" />
								<path d="M12 18h.01" />
								<path d="M16 18h.01" />
							</svg>
							Briefing Request
						</a>
						<Link
							href={isLoggedIn ? "/dashboard" : "/login"}
							className="bg-primary hover:bg-primary/95 shadow-primary/10 hover:shadow-primary/25 border-primary/20 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-bold text-white shadow-md transition"
						>
							<svg
								width="15"
								height="15"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="shrink-0"
							>
								{isLoggedIn ? (
									<>
										<rect x="3" y="3" width="18" height="18" rx="2" />
										<path d="M9 3v18" />
										<path d="M16 12h2" />
										<path d="M12 12h2" />
									</>
								) : (
									<>
										<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
										<polyline points="10 17 15 12 10 7" />
										<line x1="15" x2="3" y1="12" y2="12" />
									</>
								)}
							</svg>
							{isLoggedIn ? "Go to Dashboard" : "System Access"}
						</Link>
					</div>

					{/* Mobile Menu Buttons */}
					<div className="flex items-center gap-2 lg:hidden">
						<ThemeToggle />
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="rounded-lg border border-zinc-200 p-2 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
							aria-label="Toggle mobile menu"
						>
							{mobileMenuOpen ? (
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<line x1="18" x2="6" y1="6" y2="18" />
									<line x1="6" x2="18" y1="6" y2="18" />
								</svg>
							) : (
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<line x1="4" x2="20" y1="12" y2="12" />
									<line x1="4" x2="20" y1="6" y2="6" />
									<line x1="4" x2="20" y1="18" y2="18" />
								</svg>
							)}
						</button>
					</div>
				</div>

				{/* Mobile Dropdown Panel */}
				<AnimatePresence>
					{mobileMenuOpen && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							className="border-border bg-background flex flex-col gap-5 border-t px-4 py-6 text-sm font-semibold text-zinc-600 lg:hidden dark:text-zinc-300"
						>
							<a
								href="#problems"
								onClick={() => setMobileMenuOpen(false)}
								className="hover:text-primary py-1 transition"
							>
								Pain Points
							</a>
							<a
								href="#modules"
								onClick={() => setMobileMenuOpen(false)}
								className="hover:text-primary py-1 transition"
							>
								Core Modules
							</a>
							<a
								href="#flows"
								onClick={() => setMobileMenuOpen(false)}
								className="hover:text-primary py-1 transition"
							>
								Operations
							</a>
							<a
								href="#security"
								onClick={() => setMobileMenuOpen(false)}
								className="hover:text-primary py-1 transition"
							>
								Security
							</a>
							<a
								href="#technical"
								onClick={() => setMobileMenuOpen(false)}
								className="hover:text-primary py-1 transition"
							>
								SLA & Tech
							</a>
							<div className="bg-border my-2 h-px" />
							<div className="flex flex-col gap-3 sm:flex-row">
								<a
									href="#briefing"
									onClick={() => setMobileMenuOpen(false)}
									className="rounded-lg border border-zinc-300 px-4 py-2.5 text-center font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
								>
									Request Briefing
								</a>
								<Link
									href={isLoggedIn ? "/dashboard" : "/login"}
									className="bg-primary hover:bg-primary/95 border-primary/20 rounded-lg border px-4 py-2.5 text-center font-bold text-white shadow-md transition"
								>
									{isLoggedIn ? "Go to Dashboard" : "System Access"}
								</Link>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</header>

			{/* SECTION 2: HERO */}
			<section className="border-border/70 relative overflow-hidden border-b pt-12 pb-24 md:pt-20 md:pb-32">
				{/* Background Grid Pattern of Government Blueprint */}
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
				<div className="bg-primary/5 dark:bg-primary/10 pointer-events-none absolute top-1/4 right-0 size-96 rounded-full blur-3xl" />
				<div className="bg-accent/5 dark:bg-accent/10 pointer-events-none absolute bottom-1/4 left-0 size-96 rounded-full blur-3xl" />

				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
						{/* Left Column: Headline */}
						<motion.div
							{...scrollFadeUp}
							className="flex flex-col items-start text-left lg:col-span-6"
						>
							<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-bold tracking-wider text-zinc-600 uppercase shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
								<span className="size-2 animate-pulse rounded-full bg-emerald-500" />
								PHILIPPINE BCS ENTERPRISE SOLUTION
							</div>

							<h1 className="mb-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-[#0B1E3F] md:text-5xl xl:text-6xl dark:text-zinc-50">
								One integrated system for the Bureau’s{" "}
								<span className="text-primary bg-clip-text">entire project and production</span>{" "}
								lifecycle
							</h1>

							<p className="mb-8 max-w-xl text-lg leading-relaxed font-medium text-zinc-600 dark:text-zinc-400">
								Exclusively developed for the{" "}
								<span className="font-semibold text-slate-800 dark:text-zinc-200">
									Bureau of Communications Services (BCS)
								</span>
								. From job order induction and structural approval loops to production press queues,
								dispatch tracking, and security auditing.
							</p>

							<div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
								<Link
									href={isLoggedIn ? "/dashboard" : "/login"}
									className="bg-primary hover:bg-primary/95 shadow-primary/20 hover:shadow-primary/30 border-primary/20 group inline-flex items-center justify-center gap-2.5 rounded-xl border px-7 py-4 text-[15px] font-extrabold text-white shadow-lg transition duration-150 active:scale-95"
								>
									{isLoggedIn ? "Go to Dashboard" : "Log In to System"}
									{/* Right arrow SVG */}
									<svg
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.5"
										className="transition-transform group-hover:translate-x-1"
									>
										<line x1="5" x2="19" y1="12" y2="12" />
										<polyline points="12 5 19 12 12 19" />
									</svg>
								</Link>
								<a
									href="#modules"
									className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 px-7 py-4 text-[15px] font-bold text-zinc-700 transition duration-150 hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
								>
									Explore Modules
								</a>
							</div>

							{/* Authority Stats */}
							<div className="mt-10 grid w-full grid-cols-3 gap-6 border-t border-zinc-200 pt-10 text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-500">
								<div>
									<div className="text-2xl font-extrabold text-[#0B1E3F] dark:text-zinc-200">
										100%
									</div>
									<div className="pt-1 font-semibold">Sovereign Hosting</div>
								</div>
								<div>
									<div className="text-2xl font-extrabold text-[#0B1E3F] dark:text-zinc-200">
										0.0s
									</div>
									<div className="pt-1 font-semibold">Latency Overhead</div>
								</div>
								<div>
									<div className="text-primary text-2xl font-extrabold">BCS</div>
									<div className="pt-1 font-semibold">Exclusive Build</div>
								</div>
							</div>
						</motion.div>

						{/* Right Column: Stunning Dashboard Mockup */}
						<motion.div
							{...scrollFadeUp}
							transition={{ delay: 0.2, ...scrollFadeUp.transition }}
							className="relative flex w-full justify-center lg:col-span-6"
						>
							<div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-zinc-300/60 bg-slate-900/10 p-1.5 shadow-2xl backdrop-blur-sm md:p-3 dark:border-zinc-800/60 dark:bg-zinc-950/40">
								{/* Top Window Control Bar */}
								<div className="mb-2.5 flex items-center justify-between border-b border-zinc-200/50 px-3 pb-2.5 dark:border-zinc-800">
									<div className="flex items-center gap-1.5">
										<span className="size-3 rounded-full bg-rose-400" />
										<span className="size-3 rounded-full bg-amber-400" />
										<span className="size-3 rounded-full bg-emerald-400" />
									</div>
									<span className="font-mono text-[10px] text-zinc-400 select-none">
										ippms.bcs.gov.ph/console
									</span>
									<span className="size-4" />
								</div>

								{/* Dashboard UI Frame */}
								<div className="flex aspect-[4/3] w-full flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left text-zinc-800 select-none dark:border-slate-800/80 dark:bg-[#0B132B] dark:text-zinc-100">
									{/* Mock Dashboard Top Widget Row */}
									<div className="grid grid-cols-3 gap-3">
										<div className="rounded-lg border border-zinc-200/70 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-[#141F3C]">
											<div className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
												Active projects
											</div>
											<div className="pt-1 text-xl font-extrabold text-[#0B1E3F] dark:text-zinc-50">
												42
											</div>
											<div className="flex items-center gap-0.5 pt-0.5 text-[9px] font-semibold text-emerald-500">
												<svg
													width="8"
													height="8"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="3"
												>
													<polyline points="18 15 12 9 6 15" />
												</svg>
												+12% this week
											</div>
										</div>
										<div className="rounded-lg border border-zinc-200/70 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-[#141F3C]">
											<div className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
												Pending approvals
											</div>
											<div className="pt-1 text-xl font-extrabold text-amber-500">7</div>
											<div className="flex items-center gap-0.5 pt-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
												<span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
												Requires action
											</div>
										</div>
										<div className="rounded-lg border border-zinc-200/70 bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-[#141F3C]">
											<div className="text-[9px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
												Production Output
											</div>
											<div className="pt-1 text-xl font-extrabold text-[#0B1E3F] dark:text-zinc-50">
												8,450
											</div>
											<div className="pt-0.5 text-[9px] font-semibold text-indigo-500 dark:text-indigo-400">
												Printed units dispatch
											</div>
										</div>
									</div>

									{/* Central Area: Chart + Recent Queue */}
									<div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-12">
										{/* Mini Graph */}
										<div className="flex flex-col gap-2 rounded-lg border border-zinc-200/70 bg-slate-50 p-3 sm:col-span-7 dark:border-slate-800/80 dark:bg-[#141F3C]">
											<div className="flex items-center justify-between pb-1">
												<span className="text-[10px] font-extrabold text-[#0B1E3F] dark:text-zinc-300">
													Production Queue Load
												</span>
												<span className="bg-primary/10 text-primary border-primary/20 rounded border px-1.5 py-0.5 text-[8px] font-bold">
													REAL-TIME
												</span>
											</div>
											{/* SVG Bar Chart representing system integration */}
											<div className="flex flex-1 items-end justify-between gap-1.5 px-1 pt-2">
												{[40, 20, 60, 45, 90, 30, 75, 40, 85, 55, 70, 95].map((h, i) => (
													<motion.div
														key={i}
														initial={{ height: 0 }}
														animate={{ height: `${h}%` }}
														transition={{ duration: 1, delay: i * 0.05 }}
														className={`w-full rounded-sm ${
															i === 4
																? "bg-amber-400"
																: i === 11
																	? "bg-primary"
																	: "bg-[#0B1E3F] opacity-75 dark:bg-zinc-600"
														}`}
													/>
												))}
											</div>
										</div>

										{/* Recent Dispatch Logs */}
										<div className="flex flex-col gap-2 rounded-lg border border-zinc-200/70 bg-slate-50 p-3 text-[9px] sm:col-span-5 dark:border-slate-800/80 dark:bg-[#141F3C]">
											<div className="pb-1 text-[10px] font-extrabold text-[#0B1E3F] dark:text-zinc-300">
												Queue Pipeline
											</div>

											<div className="flex-1 space-y-2 overflow-hidden">
												<div className="flex items-center justify-between rounded border border-zinc-200/70 bg-white p-1.5 dark:border-slate-800 dark:bg-[#0B132B]/80">
													<span className="max-w-[70px] truncate font-semibold text-zinc-700 dark:text-zinc-300">
														JO_#2026-90A
													</span>
													<span className="rounded bg-sky-100 px-1.5 py-0.5 text-[8px] font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
														PRESS
													</span>
												</div>
												<div className="flex items-center justify-between rounded border border-zinc-200/70 bg-white p-1.5 dark:border-slate-800 dark:bg-[#0B132B]/80">
													<span className="max-w-[70px] truncate font-semibold text-zinc-700 dark:text-zinc-300">
														PR-PresidentIAL
													</span>
													<span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
														DISPATCH
													</span>
												</div>
												<div className="flex items-center justify-between rounded border border-zinc-200/70 bg-white p-1.5 opacity-60 dark:border-slate-800 dark:bg-[#0B132B]/80">
													<span className="max-w-[70px] truncate font-semibold text-zinc-700 dark:text-zinc-300">
														BCS-Newsletter
													</span>
													<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
														APPROVAL
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* SECTION 3: THE PROBLEM & SHIELD OF RESOLUTION */}
			<section
				id="problems"
				className="border-border/70 border-b bg-zinc-50/50 py-24 dark:bg-zinc-950/20"
			>
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<motion.div {...scrollFadeUp} className="mx-auto mb-16 max-w-2xl text-center">
						<h2 className="text-primary mb-3 text-xs font-bold tracking-widest uppercase">
							CONSTITUTIONAL OPERATIONS
						</h2>
						<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
							Eliminating Fragmented Bureaucracy
						</h3>
						<p className="text-zinc-650 mt-4 font-medium dark:text-zinc-400">
							Philippine government communications require strict accountability. Under isolated
							manual systems, critical production operations suffer from predictable blockages.
						</p>
					</motion.div>

					{/* Pain point grid */}
					<motion.div
						variants={staggerContainer}
						initial="initial"
						whileInView="whileInView"
						viewport={{ once: true, margin: "-100px" }}
						className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
					>
						{[
							{
								num: "01",
								prob: "Fragile Document Pipelines",
								desc: "Physical copy routing and manual paper chains are easily mislaid, causing severe operational blindspots across BCS divisions.",
								svg: (
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M21 7V3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
										<path d="M14 2v4a2 2 0 0 0 2 2h4" />
										<path d="M10.4 12.6a1 1 0 1 0-1.8 1.8" />
										<path d="m15.4 15.6-3-3" />
									</svg>
								),
							},
							{
								num: "02",
								prob: "Manual Approval Hurdles",
								desc: "Approvals stall without active tracing. Finding which desk a critical job order occupies takes half an office's workday.",
								svg: (
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
										<path d="m9 12 2 2 4-4" />
										<circle cx="12" cy="12" r="10" />
									</svg>
								),
							},
							{
								num: "03",
								prob: "Isolated Production Queues",
								desc: "The print press floor acts disconnected from procurement and designer layouts, rendering job prioritizations unpredictable.",
								svg: (
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
										<rect width="12" height="8" x="6" y="14" rx="1" />
										<path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
									</svg>
								),
							},
							{
								num: "04",
								prob: "Opaque Audit Visibility",
								desc: "Retrieving user access timelines and edit histories to satisfy BCS constitutional standards requires weeks of manual compilation.",
								svg: (
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
										<path d="M12 6v6l4 2" />
									</svg>
								),
							},
						].map((item, idx) => (
							<motion.div
								key={idx}
								variants={scrollFadeUp}
								className="bg-background group flex flex-col justify-between rounded-2xl border border-zinc-200 p-5 transition-all duration-250 hover:scale-[1.02] hover:shadow-lg dark:border-zinc-800/80"
							>
								<div>
									<div className="flex items-center justify-between pb-6">
										<div className="rounded-xl bg-rose-500/10 p-3 text-rose-600 transition-colors group-hover:bg-rose-500/20 dark:text-rose-400">
											{item.svg}
										</div>
										<span className="dark:text-zinc-650 font-mono text-sm font-extrabold text-zinc-300 select-none">
											{item.num}
										</span>
									</div>
									<h4 className="mb-2 text-base font-extrabold tracking-tight text-[#0B1E3F]/90 dark:text-zinc-200">
										{item.prob}
									</h4>
									<p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
										{item.desc}
									</p>
								</div>
								<div className="flex items-center gap-1 pt-6 text-[11px] font-bold text-rose-500">
									<span className="size-1.5 shrink-0 rounded-full bg-rose-500" />
									STALLS PERFORMANCE
								</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* SECTION 4: CORE MODULES */}
			<section id="modules" className="border-border/70 scroll-mt-20 border-b py-24">
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<motion.div {...scrollFadeUp} className="mx-auto mb-16 max-w-2xl text-center">
						<h2 className="mb-3 text-xs font-bold tracking-widest text-[#B45309] uppercase">
							EXCLUSIVE GOVERNMENT MODULES
						</h2>
						<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
							Five Columns of BCS IPPMS Workflows
						</h3>
						<p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
							Purpose-built layout systems fully matching the five administrative operational
							pillars of the Bureau of Communications Services of the Philippines.
						</p>
					</motion.div>

					{/* 5 module card group */}
					<motion.div
						variants={staggerContainer}
						initial="initial"
						whileInView="whileInView"
						viewport={{ once: true, margin: "-100px" }}
						className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
					>
						{[
							{
								title: "Project Lifecycle",
								desc: "Initiate communication programs with complete material requests, timeline expectations, personnel profiles, and resource assignment scopes.",
								theme: "border-l-primary",
								badge: "PROJ-LIFE",
								icon: (
									<svg
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.2"
										className="text-primary"
									>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
										<path d="m10 8 6 4-6 4V8z" />
									</svg>
								),
							},
							{
								title: "Approval Loop",
								desc: "Strict digital routing of Job Orders through designated Bureau officers. Multi-level authorizations with structural audit locks.",
								theme: "border-l-amber-500",
								badge: "APP-FLOW",
								icon: (
									<svg
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.2"
										className="text-amber-500"
									>
										<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
										<polyline points="22 4 12 14.01 9 11.01" />
									</svg>
								),
							},
							{
								title: "Dispatch Queue",
								desc: "End-to-end print queue supervision, plate preparation, press-run outputs, and regional logistics dispatch sheets.",
								theme: "border-l-indigo-600",
								badge: "DISP-PRN",
								icon: (
									<svg
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.2"
										className="text-indigo-600"
									>
										<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
										<path d="M9 3v18" />
										<path d="m14 9 3 3-3 3" />
									</svg>
								),
							},
							{
								title: "Analytics Hub",
								desc: "Real-time dashboard updates reflecting raw project speed, cost charts, personnel throughput, and target audience circulation margins.",
								theme: "border-l-emerald-600",
								badge: "ANLY-CRT",
								icon: (
									<svg
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.2"
										className="text-emerald-600"
									>
										<path d="M3 3v18h18" />
										<path d="m18.7 8-5.1 5.2-2.8-2.7L7 14.3" />
									</svg>
								),
							},
							{
								title: "Audit & Security",
								desc: "Role-Based Access Control (RBAC), automatic tamper-proof logs, sovereign network locking, and comprehensive activity records.",
								theme: "border-l-[#0B1E3F]",
								badge: "SEC-LOG",
								icon: (
									<svg
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2.2"
										className="text-[#0B1E3F] dark:text-zinc-300"
									>
										<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
									</svg>
								),
							},
						].map((item, idx) => (
							<motion.div
								key={idx}
								variants={scrollFadeUp}
								className={`bg-background rounded-2xl border border-l-[5px] border-zinc-200 p-5 hover:shadow-md dark:border-zinc-800/80 ${item.theme} flex flex-col justify-between transition-all duration-200 hover:scale-[1.01]`}
							>
								<div>
									<div className="mb-5 flex items-center justify-between">
										<div className="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-900">{item.icon}</div>
										<span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] font-extrabold tracking-wider text-zinc-500 dark:bg-zinc-800">
											{item.badge}
										</span>
									</div>
									<h4 className="mb-2 text-[15px] leading-tight font-extrabold text-[#0B1E3F] dark:text-zinc-100">
										{item.title}
									</h4>
									<p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
										{item.desc}
									</p>
								</div>
								<div className="flex justify-end pt-6">
									<span className="text-primary inline-flex cursor-pointer items-center gap-0.5 text-[11px] font-extrabold hover:underline">
										View Spec
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
										>
											<line x1="5" x2="19" y1="12" y2="12" />
											<polyline points="12 5 19 12 12 19" />
										</svg>
									</span>
								</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* SECTION 5: APPROVAL WORKFLOW FLOW DIAGRAM */}
			<section
				id="flows"
				className="border-border/70 scroll-mt-20 border-b bg-zinc-50/50 py-24 dark:bg-zinc-950/20"
			>
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
						<motion.div {...scrollFadeUp} className="text-left lg:col-span-5">
							<span className="text-primary block pb-3 text-xs font-bold tracking-widest uppercase">
								BUREAU CHAIN OF COMMAND
							</span>
							<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
								Verifiable Approval Loops
							</h3>
							<p className="text-zinc-650 mt-4 mb-6 leading-relaxed font-medium dark:text-zinc-400">
								Job orders undergo complete digital routing through designated Philippine BCS
								command structures. No order passes to the printing floor without sequential
								verification.
							</p>

							<div className="space-y-4">
								<div
									className={`rounded-xl border p-4 transition-colors ${activeWorkflowStep === 0 ? "border-primary/40 bg-white shadow-sm dark:bg-[#141F3C]" : "border-transparent"}`}
								>
									<div className="flex items-center gap-3">
										<span
											className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${activeWorkflowStep === 0 ? "bg-primary text-white" : "bg-zinc-200 dark:bg-zinc-800"}`}
										>
											1
										</span>
										<div>
											<h5 className="text-sm font-extrabold text-slate-900 dark:text-zinc-200">
												Induction & Draft (Officer Level)
											</h5>
											<p className="pt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
												Author uploads specifications, assets & timeline constraints.
											</p>
										</div>
									</div>
								</div>
								<div
									className={`rounded-xl border p-4 transition-colors ${activeWorkflowStep === 1 ? "border-amber-500/45 bg-white shadow-sm dark:bg-[#141F3C]" : "border-transparent"}`}
								>
									<div className="flex items-center gap-3">
										<span
											className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${activeWorkflowStep === 1 ? "bg-amber-500 text-white" : "bg-zinc-200 dark:bg-zinc-800"}`}
										>
											2
										</span>
										<div>
											<h5 className="text-sm font-extrabold text-slate-900 dark:text-zinc-200">
												Division Validation (Head Level)
											</h5>
											<p className="pt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
												Head confirms resources, checks budgets & signals forward.
											</p>
										</div>
									</div>
								</div>
								<div
									className={`rounded-xl border p-4 transition-colors ${activeWorkflowStep === 2 ? "border-primary/40 bg-white shadow-sm dark:bg-[#141F3C]" : "border-transparent"}`}
								>
									<div className="flex items-center gap-3">
										<span
											className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${activeWorkflowStep === 2 ? "bg-primary text-white" : "bg-zinc-200 dark:bg-zinc-800"}`}
										>
											3
										</span>
										<div>
											<h5 className="text-sm font-extrabold text-slate-900 dark:text-zinc-200">
												Executive Consent (Director Level)
											</h5>
											<p className="pt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
												Director provides secure sign-off with permanent digital key seal.
											</p>
										</div>
									</div>
								</div>
							</div>
						</motion.div>

						{/* Interactive SVG Diagram */}
						<motion.div
							{...scrollFadeUp}
							transition={{ delay: 0.15, ...scrollFadeUp.transition }}
							className="flex justify-center lg:col-span-7"
						>
							<div className="w-full max-w-[620px] rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-xl select-none md:p-8 dark:border-slate-800 dark:bg-[#0B132B]">
								<div className="flex items-center justify-between border-b border-zinc-100 pb-6 dark:border-slate-800">
									<div className="flex items-center gap-2">
										<span className="size-2 animate-pulse rounded-full bg-emerald-500" />
										<span className="font-mono text-[10px] font-bold tracking-wider text-zinc-500">
											SYSTEM FLOW-INTEGRATION
										</span>
									</div>
									<span className="font-serif text-xs text-zinc-400 italic">IPPMS-WF-SECURE</span>
								</div>

								{/* The Flow Visualizer */}
								<div className="relative flex flex-col items-center justify-between gap-8 py-12 md:flex-row md:gap-4">
									{/* Absolute connector lines behind nodes */}
									<div className="absolute top-1/2 right-0 left-0 z-0 hidden h-1 -translate-y-1/2 bg-zinc-100 md:block dark:bg-slate-800/80" />

									{/* Active glow overlay line */}
									<div
										className="from-primary absolute top-1/2 left-0 z-0 hidden h-1 -translate-y-1/2 bg-gradient-to-r to-amber-500 transition-all duration-700 md:block"
										style={{
											width:
												activeWorkflowStep === 0
													? "10%"
													: activeWorkflowStep === 1
														? "50%"
														: activeWorkflowStep === 2
															? "90%"
															: "100%",
										}}
									/>

									{/* Node 1: Officer */}
									<div
										className={`relative z-10 w-full rounded-2xl border p-5 text-center transition-all duration-300 md:w-36 ${
											activeWorkflowStep === 0
												? "bg-primary/5 border-primary shadow-primary/5 scale-[1.05] shadow-lg"
												: "bg-background border-zinc-200 dark:border-slate-800"
										}`}
									>
										<div
											className={`mx-auto flex size-10 items-center justify-center rounded-full border text-xs font-bold ${
												activeWorkflowStep === 0
													? "bg-primary border-primary text-white"
													: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
											}`}
										>
											OFF
										</div>
										<h6 className="pt-3 text-xs leading-none font-extrabold text-[#0B1E3F] dark:text-zinc-200">
											Officer Desk
										</h6>
										<span className="block pt-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-500">
											JO Induction
										</span>
										<div className="pt-3">
											<span
												className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${
													activeWorkflowStep === 0
														? "bg-sky-100 font-bold text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
														: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
												}`}
											>
												Drafting
											</span>
										</div>
									</div>

									{/* Connector for mobile */}
									<div className="flex size-6 items-center justify-center text-zinc-300 md:hidden">
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<line x1="12" x2="12" y1="5" y2="19" />
											<polyline points="19 12 12 19 5 12" />
										</svg>
									</div>

									{/* Node 2: Head */}
									<div
										className={`relative z-10 w-full rounded-2xl border p-5 text-center transition-all duration-300 md:w-36 ${
											activeWorkflowStep === 1
												? "scale-[1.05] border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/5"
												: "bg-background border-zinc-200 dark:border-slate-800"
										}`}
									>
										<div
											className={`mx-auto flex size-10 items-center justify-center rounded-full border text-xs font-bold ${
												activeWorkflowStep === 1
													? "border-amber-500 bg-amber-500 text-white"
													: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
											}`}
										>
											HD
										</div>
										<h6 className="pt-3 text-xs leading-none font-extrabold text-[#0B1E3F] dark:text-zinc-200">
											Division Head
										</h6>
										<span className="block pt-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-500">
											Budget Verify
										</span>
										<div className="pt-3">
											<span
												className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${
													activeWorkflowStep === 1
														? "bg-amber-100 font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
														: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
												}`}
											>
												Pending
											</span>
										</div>
									</div>

									{/* Connector for mobile */}
									<div className="flex size-6 items-center justify-center text-zinc-300 md:hidden">
										<svg
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<line x1="12" x2="12" y1="5" y2="19" />
											<polyline points="19 12 12 19 5 12" />
										</svg>
									</div>

									{/* Node 3: Executive */}
									<div
										className={`relative z-10 w-full rounded-2xl border p-5 text-center transition-all duration-300 md:w-36 ${
											activeWorkflowStep === 2
												? "bg-primary/5 border-primary shadow-primary/5 scale-[1.05] shadow-lg"
												: "bg-background border-zinc-200 dark:border-slate-800"
										}`}
									>
										<div
											className={`mx-auto flex size-10 items-center justify-center rounded-full border text-xs font-bold ${
												activeWorkflowStep === 2
													? "bg-primary border-primary text-white"
													: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
											}`}
										>
											DIR
										</div>
										<h6 className="pt-3 text-xs leading-none font-extrabold text-[#0B1E3F] dark:text-zinc-200">
											Executive Dir.
										</h6>
										<span className="block pt-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-500">
											Final Seal Key
										</span>
										<div className="pt-3">
											<span
												className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${
													activeWorkflowStep === 2
														? "bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
														: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
												}`}
											>
												Sign-off
											</span>
										</div>
									</div>
								</div>

								{/* Terminal audit logs mapping below diagram */}
								<div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-slate-50 p-4 font-mono text-[10px] text-zinc-500 dark:border-slate-800/80 dark:bg-[#141F3C]/80 dark:text-zinc-400">
									<div className="dark:border-slate-850 mb-1.5 flex items-center justify-between border-b border-zinc-200/50 pb-1.5 text-zinc-400 dark:text-zinc-500">
										<span>SECURITY AUDIT KEY CONSOLE</span>
										<span className="text-zinc-300">SECURE: HASH-V1</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-emerald-500">[OK]</span>
										<span>JO_#2026-11B signed by Officer J. Dela Cruz @ 09:32:11 PHT</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-emerald-500">[OK]</span>
										<span>Forwarded block to Division validation... SHA256-verified</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-amber-500">[PEND]</span>
										<span>Awaiting Head signature authorize token verify...</span>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* SECTION 6: PRODUCTION & CIRCULATION FLOW */}
			<section className="border-border/70 scroll-mt-20 border-b py-24">
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<motion.div {...scrollFadeUp} className="mx-auto mb-16 max-w-2xl text-center">
						<span className="mb-3 block text-xs font-bold tracking-widest text-[#4f46e5] uppercase">
							CIRCULATION INFRASTRUCTURE
						</span>
						<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
							From Press Floor to Dispatch
						</h3>
						<p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
							Complete real-time oversight of materials as they transform from virtual job
							assignments into high-quality physical government communications layouts.
						</p>
					</motion.div>

					<div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						{[
							{
								step: "01",
								title: "Job Order Induction",
								subtitle: "Specifications Lock",
								desc: "Design specifications, color parameters, paper dimensions, and quantity parameters are electronically logged and signed off.",
								badge: "STAGE 1",
								isCurrent: activeProdStep === 0,
								icon: (
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<rect x="3" y="3" width="18" height="18" rx="2" />
										<path d="M12 8v8" />
										<path d="M8 12h8" />
									</svg>
								),
							},
							{
								step: "02",
								title: "Production Routing",
								subtitle: "Press Queue Integration",
								desc: "Automated routing to active print plates. Floor supervisors monitor output speeds, paper margins, and chemical run lists.",
								badge: "STAGE 2",
								isCurrent: activeProdStep === 1,
								icon: (
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M17 3a2.82 2.82 0 1 1 4 4L7.5 21H3v-4.5L16.5 3z" />
									</svg>
								),
							},
							{
								step: "03",
								title: "Postal Dispatch Sheets",
								subtitle: "Verification & Packing",
								desc: "Secured physical bundles are processed, batch-labeled, and packed with automatic generation of accountability dispatch sheets.",
								badge: "STAGE 3",
								isCurrent: activeProdStep === 2,
								icon: (
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<rect x="3" y="3" width="18" height="18" rx="2" />
										<path d="M9 17h6" />
										<path d="M9 12h6" />
										<path d="M9 7h4" />
									</svg>
								),
							},
							{
								step: "04",
								title: "Directed Circulation",
								subtitle: "Fulfillment & Archiving",
								desc: "Physical materials drop to regional distribution nodes. Digital receipts with visual confirmation are filed on servers.",
								badge: "STAGE 4",
								isCurrent: activeProdStep === 3,
								icon: (
									<svg
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
										<path d="m9 12 2 2 4-4" />
									</svg>
								),
							},
						].map((item, idx) => (
							<motion.div
								key={idx}
								variants={scrollFadeUp}
								className={`relative flex h-[300px] flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
									item.isCurrent
										? "border-[#0B1E3F] bg-slate-900 text-white shadow-xl dark:border-zinc-800 dark:bg-slate-950"
										: "bg-background border-zinc-200 dark:border-slate-800/80"
								}`}
							>
								{/* Step identifier bubble */}
								<div className="absolute top-4 right-4 font-mono text-[36px] font-extrabold opacity-10 select-none">
									{item.step}
								</div>

								<div>
									<div className="mb-6 flex items-center gap-2">
										<div
											className={`rounded-lg p-2.5 ${item.isCurrent ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900"}`}
										>
											{item.icon}
										</div>
										<span
											className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider ${
												item.isCurrent
													? "bg-primary/25 text-primary-foreground"
													: "bg-zinc-150 text-zinc-550 dark:bg-zinc-800 dark:text-zinc-400"
											}`}
										>
											{item.badge}
										</span>
									</div>

									<h4
										className={`mb-1 text-[15px] leading-tight font-extrabold ${item.isCurrent ? "text-white" : "text-[#0B1E3F] dark:text-zinc-100"}`}
									>
										{item.title}
									</h4>
									<p
										className={`mb-3 text-[11px] font-semibold tracking-wider uppercase ${item.isCurrent ? "text-amber-400" : "text-amber-600 dark:text-amber-500"}`}
									>
										{item.subtitle}
									</p>
									<p
										className={`text-xs leading-relaxed ${item.isCurrent ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400"}`}
									>
										{item.desc}
									</p>
								</div>

								{/* Status light */}
								<div className="flex items-center gap-1.5 pt-4 text-[10px] font-extrabold select-none">
									<span
										className={`size-2 rounded-full ${item.isCurrent ? "animate-pulse bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-700"}`}
									/>
									{item.isCurrent ? "ACTIVE IN PIPELINE" : "STANDBY"}
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* SECTION 7: ROLE-SPECIFIC DASHBOARD PREVIEWS */}
			<section className="border-border/70 border-b bg-zinc-50/50 py-24 dark:bg-zinc-950/20">
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<motion.div {...scrollFadeUp} className="mx-auto mb-16 max-w-2xl text-center">
						<span className="text-primary mb-3 block text-xs font-bold tracking-widest uppercase">
							TARGETED PERFORMANCES
						</span>
						<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
							Role-Specific Consolidated Consoles
						</h3>
						<p className="text-zinc-[650] mt-4 font-medium dark:text-zinc-400">
							Individual login experiences filtered entirely by administrative credentials. Every
							BCS officer views exactly information scope needed for their core duty.
						</p>
					</motion.div>

					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						{[
							{
								role: "Division Head Portal",
								focus: "Resource Coordination & Priorities",
								desc: "A centralized dashboard for approving layouts and requesting raw material counts from warehouses. Tracks specific communication projects.",
								lines: [
									{
										col1: "Newsletter_#22A",
										col2: "Layout Draft",
										badgeColor:
											"bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
									},
									{
										col1: "Manila_Flyer_#04",
										col2: "Awaiting Plates",
										badgeColor:
											"bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
									},
									{
										col1: "Gov_Manual_2026",
										col2: "Complete Seal",
										badgeColor:
											"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
									},
								],
							},
							{
								role: "Production & Press Queue",
								focus: "Press Floor Speeds & Margins",
								desc: "Monitors plate preparation, raw paper inventory, chemical levels, ink runs, and batch completions. Immediate dispatcher warning signals.",
								lines: [
									{
										col1: "Plate_3A-Rotary",
										col2: "Optimal Cool",
										badgeColor:
											"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
									},
									{
										col1: "Ink_Cyan-Reservoir",
										col2: "82% Level",
										badgeColor: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
									},
									{
										col1: "Batch_4_Queue",
										col2: "Active Print",
										badgeColor: "bg-primary/10 text-primary dark:text-sky-300",
									},
								],
							},
							{
								role: "Compliance & Safety Auditor",
								focus: "Tamper-Proof Audit Pipeline",
								desc: "A high-security, view-only timeline. Logs database writes, security configurations, sign-ons, access origins, and structural error margins.",
								lines: [
									{
										col1: "DB_WRITE: Schema",
										col2: "User_Admin-2",
										badgeColor:
											"bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
									},
									{
										col1: "CLIENT: Local Sec",
										col2: "Sovereign IP",
										badgeColor:
											"bg-[#0B1E3F]/10 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300",
									},
									{
										col1: "KEY_GEN: Sign-off",
										col2: "SHA256 Encrypt",
										badgeColor:
											"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
									},
								],
							},
						].map((item, idx) => (
							<motion.div
								key={idx}
								variants={scrollFadeUp}
								className="bg-background rounded-2xl border border-zinc-200 p-6 transition-all duration-200 hover:shadow-lg dark:border-slate-800"
							>
								{/* Top Header Card */}
								<div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-slate-800">
									<div>
										<h4 className="font-serif text-base font-extrabold text-[#0B1E3F] italic dark:text-zinc-100">
											{item.role}
										</h4>
										<p className="pt-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-500">
											{item.focus}
										</p>
									</div>
									<span className="bg-primary size-2 rounded-full" />
								</div>

								<p className="mb-6 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
									{item.desc}
								</p>

								{/* Miniature Grid Inside Console preview */}
								<div className="border-zinc-250/60 flex flex-col gap-2 overflow-hidden rounded-xl border bg-slate-50 p-3 dark:border-slate-800/80 dark:bg-[#141F3C]/50">
									{item.lines.map((line, lIdx) => (
										<div
											key={lIdx}
											className="bg-background dark:border-slate-850 flex items-center justify-between rounded border border-zinc-100 px-2 py-1.5 text-[10px]"
										>
											<span className="text-zinc-650 max-w-[130px] truncate font-mono dark:text-zinc-300">
												{line.col1}
											</span>
											<span
												className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide ${line.badgeColor}`}
											>
												{line.col2}
											</span>
										</div>
									))}
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* SECTION 8: SECURITY & ACCOUNTABILITY */}
			<section id="security" className="border-border/70 scroll-mt-20 border-b py-24">
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
						{/* Left Column: Features Grid */}
						<motion.div
							variants={staggerContainer}
							initial="initial"
							whileInView="whileInView"
							viewport={{ once: true, margin: "-100px" }}
							className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-7"
						>
							{[
								{
									title: "Hierarchical RBAC",
									desc: "Roles are aligned strictly within the Philippine government hierarchy. Division heads, operators, and compliance observers operate safely inside clear data parameters.",
									icon: (
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className="text-primary"
										>
											<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
											<circle cx="9" cy="7" r="4" />
											<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
											<path d="M16 3.13a4 4 0 0 1 0 7.75" />
										</svg>
									),
								},
								{
									title: "Absolute Isolation",
									desc: "Structural barriers secure database queries, guaranteeing zero cross-department leakage. National communications and reports remain isolated, encrypted, and safe.",
									icon: (
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className="text-indigo-600"
										>
											<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
											<path d="M7 11V7a5 5 0 0 1 10 0v4" />
										</svg>
									),
								},
								{
									title: "Tamper-Proof Audit",
									desc: "Every edit, sign-off, or dispatch routing triggers an immediate write-event in a permanent audit log database, fulfilling sovereign accountability guidelines.",
									icon: (
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className="text-amber-500"
										>
											<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
											<path d="M12 6v6l4 2" />
										</svg>
									),
								},
								{
									title: "Unlimited Stakeholders",
									desc: "A pure license scale allows the system to remain scale-free. Provision unlimited administrative users, press floor operatives, and regional directors without cost adjustments.",
									icon: (
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className="text-emerald-500"
										>
											<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
											<circle cx="9" cy="7" r="4" />
											<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
											<path d="M16 3.13a4 4 0 0 1 0 7.75" />
										</svg>
									),
								},
							].map((item, idx) => (
								<motion.div
									key={idx}
									variants={scrollFadeUp}
									className="bg-background dark:hover:border-slate-750 rounded-xl border border-zinc-200 p-5 transition hover:border-zinc-300 dark:border-slate-800"
								>
									<div className="mb-3 flex items-center gap-3">
										<div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">{item.icon}</div>
										<h4 className="text-sm leading-tight font-extrabold text-[#0B1E3F] dark:text-zinc-100">
											{item.title}
										</h4>
									</div>
									<p className="text-zinc-[650] text-xs leading-relaxed dark:text-zinc-400">
										{item.desc}
									</p>
								</motion.div>
							))}
						</motion.div>

						{/* Right Column: Narrative */}
						<motion.div
							{...scrollFadeUp}
							className="flex flex-col justify-center text-left lg:col-span-5"
						>
							<span className="text-primary mb-3 block text-xs font-bold tracking-widest uppercase">
								SOVEREIGN TRUST
							</span>
							<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
								National Security Integrity
							</h3>

							<div className="bg-primary my-6 h-1.5 w-12 rounded" />

							<p className="mb-6 text-sm leading-relaxed font-medium text-zinc-600 dark:text-zinc-400">
								The BCS IPPMS operates entirely inside dedicated government networks. The software
								layer uses two-factor authorization validation and deep cryptographic seals to
								secure information.
							</p>

							<blockquote className="mb-6 max-w-sm rounded-r-lg border-l-4 border-amber-500 bg-amber-500/5 py-1 pl-4 font-serif text-sm text-zinc-500 italic dark:bg-amber-500/3 dark:text-zinc-400">
								&ldquo;Government communications represent a sovereign trust. IPPMS hardens
								operations to secure records from external and internal threats.&rdquo;
							</blockquote>

							<div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-slate-800/80 dark:bg-[#141F3C]/40">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="shrink-0 text-emerald-500"
								>
									<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
								<div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
									SYSTEM HOSTING:{" "}
									<span className="font-bold text-slate-800 dark:text-zinc-300">
										Philippine Gov Sovereignty Engine (DICT Stack Compliant)
									</span>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* SECTION 9: TECHNICAL & LICENSING SPECIFICATIONS */}
			<section
				id="technical"
				className="bg-zinc-55/50 border-border/70 scroll-mt-20 border-b py-24 dark:bg-zinc-950/40"
			>
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<motion.div {...scrollFadeUp} className="mx-auto mb-16 max-w-2xl text-center">
						<span className="text-primary mb-3 block text-xs font-bold tracking-widest uppercase">
							ENGINEERING STANDARDS
						</span>
						<h3 className="text-3xl leading-tight font-extrabold tracking-tight text-[#0B1E3F] md:text-4xl dark:text-zinc-50">
							Two-Tier Architectural Blueprint
						</h3>
						<p className="text-zinc-[650] mt-4 text-sm font-medium dark:text-zinc-400">
							Engineered strictly on robust enterprise technologies to guarantee structural
							compatibility with Philippine Government database regulations.
						</p>
					</motion.div>

					{/* Technical Specifications Columns */}
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
						{/* Tech Stack Card */}
						<motion.div
							{...scrollFadeUp}
							className="bg-background dark:border-slate-850 flex flex-col justify-between rounded-2xl border border-zinc-200 p-6"
						>
							<div>
								<div className="border-zinc-150 mb-4 flex items-center justify-between border-b pb-4 dark:border-slate-800">
									<h4 className="text-base font-extrabold text-[#0B1E3F] dark:text-zinc-100">
										Architectural Stack
									</h4>
									<span className="dark:text-zinc-350 rounded bg-[#0b1e3f]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0b1e3f] dark:bg-zinc-800">
										TWO-TIER
									</span>
								</div>

								<p className="mt-2 mb-6 text-xs text-zinc-500 dark:text-zinc-400">
									Standardized database architectures ensure instant response and high-volume report
									compilation speeds.
								</p>

								<div className="space-y-4 text-xs font-semibold">
									<div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-slate-800 dark:bg-zinc-900">
										<span className="text-zinc-500">Core Engine</span>
										<span className="dark:text-zinc-350 font-mono font-bold text-[#0B1E3F]">
											PHP MVC (Clean Framework)
										</span>
									</div>
									<div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-slate-800 dark:bg-zinc-900">
										<span className="text-zinc-500">Database</span>
										<span className="dark:text-zinc-350 font-mono font-bold text-[#0B1E3F]">
											Microsoft SQL Server
										</span>
									</div>
									<div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 dark:border-slate-800 dark:bg-zinc-900">
										<span className="text-zinc-500">API Standard</span>
										<span className="dark:text-zinc-350 font-mono font-bold text-[#0B1E3F]">
											RESTful Endpoints
										</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-1 pt-8 text-[11px] font-bold text-emerald-500">
								<span className="size-1.5 rounded-full bg-emerald-500" />
								100% DICT COMPLIANT
							</div>
						</motion.div>

						{/* SLA Response Tiers */}
						<motion.div
							{...scrollFadeUp}
							transition={{ delay: 0.1, ...scrollFadeUp.transition }}
							className="bg-background dark:border-slate-850 flex flex-col justify-between rounded-2xl border border-zinc-200 p-6"
						>
							<div>
								<div className="border-zinc-150 mb-4 flex items-center justify-between border-b pb-4 dark:border-slate-800">
									<h4 className="text-base font-extrabold text-[#0B1E3F] dark:text-zinc-100">
										Support Level (SLA)
									</h4>
									<span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600">
										PHILIPPINES
									</span>
								</div>

								<p className="mt-2 mb-6 text-xs text-zinc-500 dark:text-zinc-400">
									Government tasks require uninterrupted focus. Our dedicated support team enforces
									immediate SLA responses.
								</p>

								<div className="space-y-3">
									<div className="bg-red-550/[0.03] flex items-center gap-3 rounded-lg border border-red-500/30 p-3">
										<span className="size-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
										<div className="text-[11px]">
											<div className="leading-none font-bold text-rose-600 uppercase dark:text-rose-400">
												Severity 1 (Critical)
											</div>
											<div className="pt-1 text-zinc-500">Response Guarantee: &lt; 2 Hours</div>
										</div>
									</div>
									<div className="bg-amber-550/[0.03] flex items-center gap-3 rounded-lg border border-amber-500/30 p-3">
										<span className="size-2 shrink-0 rounded-full bg-amber-500" />
										<div className="text-[11px]">
											<div className="leading-none font-bold text-amber-600 uppercase dark:text-amber-400">
												Severity 2 (Moderate)
											</div>
											<div className="pt-1 text-zinc-500">Response Guarantee: &lt; 8 Hours</div>
										</div>
									</div>
									<div className="bg-emerald-550/[0.03] flex items-center gap-3 rounded-lg border border-emerald-500/30 p-3">
										<span className="size-2 shrink-0 rounded-full bg-emerald-500" />
										<div className="text-[11px]">
											<div className="leading-none font-bold text-emerald-600 uppercase dark:text-emerald-400">
												Severity 3 (Standard)
											</div>
											<div className="pt-1 text-zinc-500">Response Guarantee: &lt; 24 Hours</div>
										</div>
									</div>
								</div>
							</div>

							<span className="block size-2" />
						</motion.div>

						{/* Perpetual Licensing Card */}
						<motion.div
							{...scrollFadeUp}
							transition={{ delay: 0.15, ...scrollFadeUp.transition }}
							className="bg-background dark:border-slate-850 flex flex-col justify-between rounded-2xl border border-b-[5px] border-zinc-200 border-b-amber-500 p-6"
						>
							<div>
								<div className="border-zinc-150 mb-4 flex items-center justify-between border-b pb-4 dark:border-slate-800">
									<h4 className="text-base font-extrabold text-[#0B1E3F] dark:text-zinc-100">
										Licensing Agreement
									</h4>
									<span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600">
										SECURE OWNERSHIP
									</span>
								</div>

								<div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center dark:bg-amber-500/5">
									<div className="text-xs font-bold text-amber-600 uppercase dark:text-amber-500">
										PROVISION TYPE
									</div>
									<div className="pt-1 text-xl leading-none font-extrabold text-[#0B1E3F] uppercase dark:text-zinc-100">
										Perpetual License
									</div>
									<div className="text-zinc-550 pt-1 text-[11px] font-semibold">
										Zero Recurring Subscription Bills
									</div>
								</div>

								<ul className="space-y-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
									<li className="flex items-center gap-2">
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											className="text-emerald-500"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										One-Time Acquisition Cost
									</li>
									<li className="flex items-center gap-2">
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											className="text-emerald-500"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										Sovereign DICT Cloud Deployable
									</li>
									<li className="flex items-center gap-2">
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											className="text-emerald-500"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										Unlimited Users &amp; Press Staff
									</li>
									<li className="flex items-center gap-2">
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											className="text-emerald-500"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
										Full Source Code Handover options
									</li>
								</ul>
							</div>

							<div className="text-zinc-450 pt-8 font-mono text-[11px] font-bold text-zinc-400 uppercase select-none">
								LICENSE-ID: BCS-IPPMS-2026
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* SECTION 10: CLOSING - CTA BANNER */}
			<section
				id="briefing"
				className="relative scroll-mt-20 overflow-hidden bg-[#0B1E3F] py-24 text-slate-100"
			>
				{/* Background sun ray representation */}
				<div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 translate-x-1/4 translate-y-1/4 opacity-10 select-none">
					<svg
						width="100%"
						height="100%"
						viewBox="0 0 100 100"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle cx="50" cy="50" r="45" stroke="var(--accent)" strokeWidth="6" />
						<path
							d="M50 0L50 100M0 50L100 50m15-35L15 85m70 0L15 15"
							stroke="var(--accent)"
							strokeWidth="2"
						/>
					</svg>
				</div>

				<div className="relative z-10 mx-auto max-w-5xl px-4 text-center md:px-8">
					<motion.div {...scrollFadeUp}>
						<span className="mb-6 inline-block rounded-full border border-amber-500/30 bg-amber-500/20 px-3.5 py-1.5 text-[11px] leading-none font-extrabold tracking-wider text-amber-400 uppercase">
							ACTIVATE SECURE SYSTEM
						</span>

						<h2 className="mx-auto mb-6 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight text-white md:text-5xl">
							Integrated. Accountable. Built for the Bureau of Communications Services.
						</h2>

						<p className="mx-auto mb-10 max-w-xl text-sm leading-relaxed font-medium text-slate-300">
							Modernize job orders, secure validation flows, audit print floor records, and optimize
							target audience circulation with sovereign digital control.
						</p>

						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Link
								href={isLoggedIn ? "/dashboard" : "/login"}
								className="bg-primary hover:bg-primary/95 border-primary/20 group inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-bold text-white shadow-lg transition duration-150"
							>
								{isLoggedIn ? "Go to Dashboard" : "Log In to Dashboard"}
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									className="transition-transform group-hover:translate-x-1"
								>
									<line x1="5" x2="19" y1="12" y2="12" />
									<polyline points="12 5 19 12 12 19" />
								</svg>
							</Link>
							<a
								href="mailto:support@bcs.gov.ph?subject=IPPMS%20Briefing%20Request"
								className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 text-sm font-bold text-white transition duration-150 hover:bg-white/10"
							>
								Request Executive Briefing
							</a>
						</div>
					</motion.div>
				</div>
			</section>

			{/* SECTION 11: FOOTER */}
			<footer className="border-t border-zinc-900 bg-slate-950 pt-16 pb-8 text-left text-zinc-400 select-none">
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="grid grid-cols-2 gap-8 border-b border-zinc-900 pb-12 md:grid-cols-2 lg:grid-cols-12">
						{/* Col 1: System info & Logos */}
						<div className="col-span-2 flex flex-col gap-5 lg:col-span-4">
							<IppmsLogo showText={true} iconSize={36} textClassName="text-white" />
							<p className="max-w-sm pt-2 text-xs leading-relaxed text-zinc-500">
								The Integrated Project and Production Management Information System acts as the
								unified sovereign operational platform of the Philippine Bureau of Communications
								Services (BCS).
							</p>
							<div className="mt-2">
								<BcsLogo size={32} />
							</div>
						</div>

						{/* Col 2: System links */}
						<div className="col-span-1 flex flex-col gap-3 text-xs font-semibold lg:col-span-2">
							<h5 className="pb-2 text-[11px] font-extrabold tracking-wider text-zinc-300 uppercase">
								System
							</h5>
							<Link
								href={isLoggedIn ? "/dashboard" : "/login"}
								className="hover:text-primary transition"
							>
								Database Console
							</Link>
							<a href="#flows" className="hover:text-primary transition">
								Workflow Router
							</a>
							<a href="#security" className="hover:text-primary transition">
								Security Audits
							</a>
							<a href="#technical" className="hover:text-primary transition">
								SLA Support
							</a>
						</div>

						{/* Col 3: Resources links */}
						<div className="col-span-1 flex flex-col gap-3 text-xs font-semibold lg:col-span-2">
							<h5 className="pb-2 text-[11px] font-extrabold tracking-wider text-zinc-300 uppercase">
								Resources
							</h5>
							<a
								href="https://www.gov.ph"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-primary transition"
							>
								Philippine GOV.PH
							</a>
							<a
								href="https://bcs.gov.ph"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-primary transition"
							>
								BCS Main Website
							</a>
							<a
								href="https://dict.gov.ph"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-primary transition"
							>
								DICT Cloud Standards
							</a>
							<a href="#technical" className="hover:text-primary transition">
								Acquisition Terms
							</a>
						</div>

						{/* Col 4: Support info */}
						<div className="col-span-1 flex flex-col gap-3 text-xs font-semibold lg:col-span-2">
							<h5 className="pb-2 text-[11px] font-extrabold tracking-wider text-zinc-300 uppercase">
								Support Tiers
							</h5>
							<span className="hover:text-primary transition">DICT-Level Response</span>
							<span className="hover:text-primary transition">SLA Status Console</span>
							<span className="hover:text-primary transition">Severity-1 Hotlines</span>
							<span className="hover:text-primary transition">Developer Code Handover</span>
						</div>

						{/* Col 5: Institutional address */}
						<div className="col-span-1 flex flex-col gap-3 text-xs font-semibold lg:col-span-2">
							<h5 className="pb-2 text-[11px] font-extrabold tracking-wider text-zinc-300 uppercase">
								The Bureau
							</h5>
							<span className="leading-relaxed font-semibold text-zinc-500">
								Bureau of Communications Services
								<br />
								PCS Building, San Miguel,
								<br />
								Manila, Philippines
							</span>
						</div>
					</div>

					{/* Under Footer */}
					<div className="text-zinc-650 flex flex-col items-center justify-between gap-4 pt-8 text-[11px] font-semibold md:flex-row">
						<div className="text-zinc-500">
							&copy; {new Date().getFullYear()} Bureau of Communications Services (BCS),
							Philippines. All Rights Reserved.
						</div>
						<div className="flex gap-4">
							<span className="cursor-pointer hover:underline">Sovereign Data Privacy</span>
							<span>&bull;</span>
							<span className="cursor-pointer hover:underline">Constitutional Terms of Use</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
