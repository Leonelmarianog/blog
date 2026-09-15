import { Module } from '@nestjs/common';
import { ASSET_REPOSITORY } from '@contexts/media/application/ports/asset.repository.port';
import { STORAGE, IMAGE_PROCESSOR } from '@contexts/media/application/ports';
import { UNIT_OF_WORK } from '@kernel/application';
import { PrismaAssetRepository } from '@infra/persistence/repositories/asset.repository';
import { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';
import { GetAssetUseCase } from '@contexts/media/application/queries/get-asset.use-case';
import { AssetSubjectResolver } from '@contexts/media/application/authorization/asset-subject-resolver';
import { MediaController } from './controllers/media.controller';

// The ASSET_REPOSITORY binding lives here (not in the global PersistenceModule) to mirror
// the IAM convention: the context module binds its own repository, while the global
// PersistenceModule stays free of @contexts/* imports (it only provides primitives).
// PrismaService is @Global, so PrismaAssetRepository can inject it from here.
@Module({
  controllers: [MediaController],
  providers: [
    AssetSubjectResolver,
    { provide: ASSET_REPOSITORY, useClass: PrismaAssetRepository },
    {
      provide: UploadAssetUseCase,
      useFactory: (...args: ConstructorParameters<typeof UploadAssetUseCase>) => new UploadAssetUseCase(...args),
      inject: [ASSET_REPOSITORY, STORAGE, IMAGE_PROCESSOR, UNIT_OF_WORK],
    },
    {
      provide: GetAssetUseCase,
      useFactory: (...args: ConstructorParameters<typeof GetAssetUseCase>) => new GetAssetUseCase(...args),
      inject: [ASSET_REPOSITORY, STORAGE],
    },
  ],
})
export class MediaModule {}
