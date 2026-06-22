import { oc } from "@orpc/contract"
import { z } from "zod"

import {
	CreateDivisionSchema,
	DivisionIdSchema,
	DivisionSchema,
	SetDivisionActiveRequestSchema,
	UpdateDivisionRequestSchema,
} from "./divisions.schema.js"

/**
 * Divisions administration contract.
 *
 * Reads require `divisions:read`, writes require the matching granular
 * `divisions:create` / `divisions:update` permission (or the `divisions:*`
 * wildcard, or the Admin super-role), enforced by the backend RbacGuard.
 */
export const divisionsContract = {
	list: oc
		.route({
			method: "GET",
			path: "/divisions",
			summary: "List divisions",
			description: "List all divisions.",
			tags: ["Divisions"],
		})
		.output(z.array(DivisionSchema)),

	create: oc
		.route({
			method: "POST",
			path: "/divisions",
			summary: "Create division",
			description: "Create a new division.",
			tags: ["Divisions"],
		})
		.input(CreateDivisionSchema)
		.output(DivisionSchema),

	update: oc
		.route({
			method: "PUT",
			path: "/divisions/{id}",
			summary: "Update division",
			description: "Update a division's name, description, or active state.",
			tags: ["Divisions"],
		})
		.input(UpdateDivisionRequestSchema)
		.output(DivisionSchema),

	setActive: oc
		.route({
			method: "PATCH",
			path: "/divisions/{id}/active",
			summary: "Activate or deactivate division",
			description: "Toggle a division's active state.",
			tags: ["Divisions"],
		})
		.input(SetDivisionActiveRequestSchema)
		.output(DivisionSchema),
}

/** Convenience alias mirroring the path parameter schema. */
export { DivisionIdSchema }
