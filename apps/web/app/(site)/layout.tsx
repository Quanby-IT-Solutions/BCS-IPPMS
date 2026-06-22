import { redirect } from "next/navigation"

import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { getSession } from "@/services/better-auth/auth-server"
import { AppSidebar } from "@/features/dashboard/components/app-sidebar"
import { SiteHeader } from "@/features/dashboard/components/site-header"
import { getAccess } from "@/features/dashboard/server/get-access"

export default async function SiteLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const session = await getSession()

	if (!session) {
		redirect("/login")
	}

	const access = await getAccess()

	if (access.status === "error" && access.error === "forbidden") {
		redirect("/login")
	}

	const user = {
		name: session.user.name ?? null,
		email: session.user.email,
		image: session.user.image ?? null,
	}

	return (
		<SidebarProvider>
			<AppSidebar user={user} access={access} />
			<SidebarInset className="bg-background relative min-h-screen overflow-hidden">
				{/* High-End Enterprise Government Grid & Glows */}
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.015)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)]" />
				<div className="bg-primary/5 dark:bg-primary/8 pointer-events-none absolute -top-40 right-0 size-96 rounded-full opacity-50 blur-3xl" />
				<div className="bg-accent/4 dark:bg-accent/6 pointer-events-none absolute -bottom-40 left-0 size-96 rounded-full opacity-50 blur-3xl" />

				<div className="relative z-10 flex flex-1 flex-col">
					<SiteHeader />
					<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
						<main className="min-w-0">{children}</main>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
