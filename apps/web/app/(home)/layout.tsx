import { CacheIdentity } from "@/services/tanstack-query/cache-identity"

export default function HomeLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	// The full-bleed wrapper is this app's own: the landing page lays itself out
	// and must not sit inside a centered container.
	return (
		<div className="flex min-h-screen w-full flex-col">
			{/* Scope the persisted cache to this user before anything reads it.
			    Both routes under this layout already resolve a session of their own,
			    so this adds no request and costs no static route. */}
			<CacheIdentity />
			{children}
		</div>
	)
}
