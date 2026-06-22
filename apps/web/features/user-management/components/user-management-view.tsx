"use client"

import { UserMultipleIcon } from "@hugeicons/core-free-icons"

import { PageHeader } from "@/core/components/page-header"
import { UsersPanel } from "@/features/user-management/components/users-panel"

export function UserManagementView() {
	return (
		<section className="flex w-full flex-col gap-6">
			<PageHeader
				icon={UserMultipleIcon}
				title="User Management"
				description="Create users, assign roles and divisions, and control account access."
			/>

			<UsersPanel />
		</section>
	)
}
