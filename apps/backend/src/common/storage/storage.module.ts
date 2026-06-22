import { Module } from "@nestjs/common"

import { LocalDiskStorageService, StorageService } from "./storage.service"

/**
 * Binds the {@link StorageService} abstraction to the local-disk driver.
 * Feature modules inject `StorageService` and stay driver-agnostic.
 */
@Module({
	providers: [{ provide: StorageService, useClass: LocalDiskStorageService }],
	exports: [StorageService],
})
export class StorageModule {}
