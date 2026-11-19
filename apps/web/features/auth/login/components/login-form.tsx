"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useForm } from "@tanstack/react-form"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"
import { cn } from "@/core/lib/utils"
import { PasswordInput } from "@/features/auth/components/password-input"
import { RateLimitBanner } from "@/features/auth/components/rate-limit-banner"
import { SocialLoginButtons } from "@/features/auth/components/social-login-buttons"
import { TermsPrivacyNote } from "@/features/auth/components/terms-privacy-note"
import { ResendVerificationForm } from "@/features/auth/verify-email/components/resend-verification-form"
import { env } from "@/env"

import { UnverifiedEmailError, useLoginMutation } from "../api/login.hooks"
import { LoginSchema } from "../api/login.schema"

// Seeded dev accounts (kept in sync with packages/db/src/seed.ts). Shared
// password matches the seed's default. Only ever rendered in non-production
// dev builds with the explicit flag enabled.
const DEV_ACCOUNTS = [
	{ label: "Admin", email: "admin@bcs.local", division: "Global" },
	{ label: "Planner", email: "planner.ops@bcs.local", division: "Operations" },
	{ label: "Approver", email: "approver.ops@bcs.local", division: "Operations" },
	{ label: "Executor", email: "executor.ops@bcs.local", division: "Operations" },
	{ label: "Planner", email: "planner.rd@bcs.local", division: "R&D" },
	{ label: "Approver", email: "approver.rd@bcs.local", division: "R&D" },
] as const

const DEV_PASSWORD = "password123"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const [showResend, setShowResend] = useState(false)
	const { mutateAsync: login, isPending, isError, error } = useLoginMutation()

	// Guard: never expose quick dev access in production, even if the flag leaks.
	const showDevLogin = env.NEXT_PUBLIC_ENABLE_DEV_LOGIN && env.NODE_ENV !== "production"
	const isUnverified = error instanceof UnverifiedEmailError
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft, isActive } = useRateLimitCountdown(
		rateLimit.isRateLimit ? rateLimit.retryAfter : null
	)

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: LoginSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				await login(value)
			} catch {
				// The mutation stores the error, and the banner reads that state.
				// Catching keeps TanStack Form's handleSubmit() from rejecting,
				// which would be an unhandled rejection on the form's submit handler.
			}
		},
	})

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="border-border/60 overflow-hidden p-0 shadow-xl backdrop-blur-md dark:bg-zinc-950/40">
				<CardContent className="grid p-0 md:grid-cols-12">
					<form
						className="col-span-12 p-6 md:col-span-7 md:p-8 lg:p-10"
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<FieldGroup className="gap-5">
							{/* Form Top Header */}
							<div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
								<Image
									src="/logo/bcs.png"
									alt="Bureau of Communications Services logo"
									width={56}
									height={56}
									priority
									className="size-14 object-contain md:hidden"
								/>
								<h1 className="text-2xl font-extrabold tracking-tight text-[#0B1E3F] dark:text-zinc-50">
									Portal Authenticator
								</h1>
								<p className="text-muted-foreground text-xs font-semibold">
									Sign in using authorized system credentials
								</p>
							</div>

							{isError && isUnverified && (
								<div
									role="alert"
									data-testid="login-unverified-error"
									className="bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 flex flex-col items-start gap-1 rounded-xl border p-3.5 text-xs font-medium"
								>
									<span>Please verify your email before signing in.</span>
									<Button
										type="button"
										variant="link"
										className="text-destructive h-auto px-0 text-xs font-semibold"
										onClick={() => setShowResend(true)}
									>
										Resend verification email
									</Button>
								</div>
							)}

							{isError && !isUnverified && rateLimit.isRateLimit && (
								<RateLimitBanner message={rateLimit.message} secondsLeft={secondsLeft} />
							)}

							{isError && !isUnverified && !rateLimit.isRateLimit && (
								<div
									role="alert"
									data-testid="login-error"
									className="bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 rounded-xl border p-3.5 text-xs font-medium"
								>
									{error instanceof Error ? error.message : "An unexpected error occurred"}
								</div>
							)}

							{showResend && isUnverified && (
								<ResendVerificationForm prefillEmail={(error as UnverifiedEmailError).email} />
							)}

							<form.Field
								name="email"
								children={field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel
												htmlFor={field.name}
												className="text-xs font-bold tracking-wider text-zinc-500 uppercase"
											>
												Email Address
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												type="email"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												placeholder="personnel@bcs.gov.ph"
												autoComplete="email"
												required
												disabled={isPending}
												className="border-zinc-250 rounded-xl py-5 dark:border-zinc-800"
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							/>

							<form.Field
								name="password"
								children={field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<div className="flex items-center">
												<FieldLabel
													htmlFor={field.name}
													className="text-xs font-bold tracking-wider text-zinc-500 uppercase"
												>
													Password
												</FieldLabel>
												<Link
													href="/forgot-password"
													className={cn(
														buttonVariants({ size: "sm", variant: "link" }),
														"text-primary ml-auto h-auto px-0 text-xs font-semibold hover:no-underline"
													)}
												>
													Forgot Password?
												</Link>
											</div>
											<PasswordInput
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												required
												autoComplete="current-password"
												disabled={isPending}
												className="border-zinc-250 rounded-xl py-5 dark:border-zinc-800"
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							/>

							<Field className="mt-1">
								<Button
									type="submit"
									disabled={isPending || isActive}
									className="bg-primary hover:bg-primary/95 shadow-primary/20 w-full rounded-xl py-5 text-sm font-extrabold text-white shadow-md hover:cursor-pointer"
								>
									{isActive ? (
										<span>Try again in {secondsLeft}s</span>
									) : isPending ? (
										<span className="flex items-center gap-2">
											<svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													strokeWidth="4"
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
												/>
											</svg>
											Validating Secure Session...
										</span>
									) : (
										<span className="flex items-center justify-center gap-1.5">
											<svg
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2.5"
												className="shrink-0"
											>
												<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
												<path d="M7 11V7a5 5 0 0 1 10 0v4" />
											</svg>
											Authenticate Account
										</span>
									)}
								</Button>
							</Field>

							<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:*:data-[slot=field-separator-content]:bg-zinc-950">
								Or OAuth Provider
							</FieldSeparator>

							<SocialLoginButtons action="login" />

							{showDevLogin && (
								<Field className="mt-2 text-zinc-400">
									<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:*:data-[slot=field-separator-content]:bg-zinc-950">
										Quick Dev Access Keys
									</FieldSeparator>
									<div className="grid grid-cols-2 gap-2.5">
										{DEV_ACCOUNTS.map(account => {
											const isGlobal = account.division === "Global"
											return (
												<Button
													key={account.email}
													type="button"
													variant="outline"
													size="sm"
													disabled={isPending}
													onClick={() => login({ email: account.email, password: DEV_PASSWORD })}
													className="hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/5 flex h-auto flex-col items-start gap-1 rounded-xl border-zinc-200/80 p-3 text-left transition duration-150 hover:cursor-pointer dark:border-zinc-800/80"
												>
													<div className="flex w-full items-center justify-between">
														<span className="text-xs font-bold tracking-tight text-[#0B1E3F] dark:text-zinc-200">
															{account.label}
														</span>
														<span
															className={cn(
																"rounded-md px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase",
																isGlobal
																	? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
																	: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
															)}
														>
															{account.division}
														</span>
													</div>
													<span className="text-[10px] font-medium text-zinc-400">
														{account.email.split("@")[0]}
													</span>
												</Button>
											)
										})}
									</div>
									<FieldDescription className="mt-1 text-center text-[11px] font-medium">
										Default development passkey:{" "}
										<code className="bg-muted rounded-md border border-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-500 dark:bg-zinc-900">
											{DEV_PASSWORD}
										</code>
									</FieldDescription>
								</Field>
							)}

							<FieldDescription className="text-center text-xs font-medium">
								Don&apos;t have an credential lock?{" "}
								<Link
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-primary h-auto px-0 text-xs font-bold hover:no-underline"
									)}
									href="/register"
								>
									Sign up
								</Link>
							</FieldDescription>
						</FieldGroup>
					</form>
					<div className="relative col-span-12 hidden flex-col items-center justify-center gap-8 overflow-hidden border-l border-white/5 bg-[#0B1E3F] p-10 text-center md:col-span-5 md:flex">
						{/* Background grid */}
						<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px]" />
						<div className="bg-primary/20 pointer-events-none absolute top-1/4 right-0 size-72 rounded-full opacity-45 blur-3xl" />
						<div className="pointer-events-none absolute bottom-1/4 left-0 size-72 rounded-full bg-amber-500/10 opacity-30 blur-3xl" />

						<div className="relative z-10 flex flex-col items-center gap-6">
							<div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[9px] font-extrabold tracking-widest text-amber-500 uppercase">
								SYSTEM TERMINAL
							</div>

							<Image
								src="/logo/bcs.png"
								alt="Bureau of Communications Services logo"
								width={140}
								height={140}
								priority
								className="size-32 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] filter transition duration-350 hover:scale-105"
							/>
							<div className="space-y-3">
								<h3 className="max-w-xs text-xs leading-snug font-extrabold tracking-widest text-white uppercase">
									Bureau of Communications Services
								</h3>
								<div className="mx-auto h-0.5 w-12 rounded-full bg-amber-500/40" />
								<p className="max-w-[240px] text-[10px] leading-relaxed font-bold tracking-wider text-zinc-300 uppercase">
									Integrated Project &amp; Production Management Information System
								</p>
							</div>

							<div className="max-w-[240px] rounded-xl border border-zinc-700/40 bg-zinc-800/10 p-4 text-left text-[11px] leading-relaxed font-semibold text-zinc-400 backdrop-blur-xs">
								<span className="font-bold text-zinc-200">Accountability Standard:</span> This
								terminal logs all operations, plate burns, delivery dispatch, and supervisor
								clearances in an immutable audit ledger.
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
			<TermsPrivacyNote />
		</div>
	)
}
