import { Module } from "@nestjs/common"

import { AuditModule } from "@/common/audit/audit.module"
import { DivisionScopeModule } from "@/common/division-scope/division-scope.module"
import { StorageModule } from "@/common/storage/storage.module"

import { FilesController } from "./files.controller"
import { FilesUploadController } from "./files-upload.controller"
import { FilesService } from "./files.service"

@Module({
	imports: [AuditModule, StorageModule, DivisionScopeModule],
	controllers: [FilesController, FilesUploadController],
	providers: [FilesService],
	exports: [FilesService],
})
export class FilesModule {}
