import Link from "next/link"

import { Logo } from "@/core/components/logo"
import { ThemeToggle } from "@/core/components/theme-toggle"
import { cn } from "@/core/lib/utils"

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden font-sans">
			{/* High-End Enterprise Background Blueprint & Glows */}
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
			<div className="bg-primary/5 dark:bg-primary/10 pointer-events-none absolute -top-40 -right-40 size-96 rounded-full blur-3xl" />
			<div className="bg-accent/5 dark:bg-accent/10 pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full blur-3xl" />

			{/* Floating Theme Toggle in Top Right */}
			<div className="absolute top-4 right-4 z-50 rounded-lg border border-zinc-200/80 bg-white/70 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/70">
				<ThemeToggle />
			</div>

			<div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-12 md:max-w-4xl">
				{/* Official Government Enterprise Brand Header */}
				<header className="flex flex-col items-center text-center">
					<div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold tracking-wider text-zinc-600 uppercase shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
						<span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
						SECURE PORTAL &bull; BCS IPPMS
					</div>

					<Logo href="/" className="h-auto scale-105 self-center select-none hover:opacity-90" />

					<p className="text-muted-foreground mt-3 max-w-md text-xs leading-relaxed font-medium text-balance">
						Sovereign, audit-controlled authentication for the Philippine Bureau of Communications
						Services.
					</p>
				</header>

				{/* Immersive Main Forms Container */}
				<main className="flex flex-1 flex-col">{children}</main>

				{/* Navigation Links and Utility Footer */}
				<footer className="mt-4 flex flex-col items-center justify-center gap-4 text-center">
					<div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
						<Link
							className={cn(
								"underline-offset-4 transition hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
							)}
							href="/"
						>
							Back to Homepage
						</Link>
						<span className="dark:text-zinc-850 text-zinc-300" aria-hidden="true">
							&bull;
						</span>
						<Link
							className={cn(
								"underline-offset-4 transition hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
							)}
							href="/login"
						>
							Login Console
						</Link>
						<span className="dark:text-zinc-850 text-zinc-300" aria-hidden="true">
							&bull;
						</span>
						<Link
							className={cn(
								"underline-offset-4 transition hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
							)}
							href="/register"
						>
							Enroll Credentials
						</Link>
						<span className="dark:text-zinc-850 text-zinc-300" aria-hidden="true">
							&bull;
						</span>
						<Link
							className={cn(
								"underline-offset-4 transition hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
							)}
							href="/session"
						>
							Session Monitor
						</Link>
					</div>

					<p className="text-[10px] tracking-wide text-zinc-400 dark:text-zinc-500">
						Authorized Personnel Only &copy; {new Date().getFullYear()} Bureau of Communications
						Services
					</p>
				</footer>
			</div>
		</div>
	)
}
