import { Module } from "@nestjs/common"

import { RbacModule } from "@/common/rbac/rbac.module"

import { DivisionScopeService } from "./division-scope.service"

/**
 * Provides the reusable {@link DivisionScopeService}. Feature modules import
 * this to apply row-level division filtering. Depends on {@link RbacModule}
 * for the Admin-bypass check.
 */
@Module({
	imports: [RbacModule],
	providers: [DivisionScopeService],
	exports: [DivisionScopeService],
})
export class DivisionScopeModule {}
