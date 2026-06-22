import { Controller } from "@nestjs/common"
import { Implement } from "@orpc/nest"
import { implement } from "@orpc/server"
import { Session, type UserSession } from "@thallesp/nestjs-better-auth"

import { v1 } from "@/config/api-versions.config"
import { RequirePermissions } from "@/shared/decorators/require-permissions.decorator"

import { NotificationsService } from "./notifications.service"

/**
 * Notifications controller (oRPC). Every endpoint is scoped to the
 * authenticated user; the session id is the only source of the target user.
 */
@Controller()
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@RequirePermissions("notifications:read")
	@Implement(v1.notification.list)
	async list(@Session() session: UserSession) {
		return implement(v1.notification.list).handler(async ({ input }) => {
			return this.notificationsService.list(session.user.id, input)
		})
	}

	@RequirePermissions("notifications:read")
	@Implement(v1.notification.unreadCount)
	async unreadCount(@Session() session: UserSession) {
		return implement(v1.notification.unreadCount).handler(async () => {
			return this.notificationsService.unreadCount(session.user.id)
		})
	}

	@RequirePermissions("notifications:manage")
	@Implement(v1.notification.markRead)
	async markRead(@Session() session: UserSession) {
		return implement(v1.notification.markRead).handler(async ({ input }) => {
			return this.notificationsService.markRead(session.user.id, input.id)
		})
	}

	@RequirePermissions("notifications:manage")
	@Implement(v1.notification.markAllRead)
	async markAllRead(@Session() session: UserSession) {
		return implement(v1.notification.markAllRead).handler(async () => {
			return this.notificationsService.markAllRead(session.user.id)
		})
	}
}
