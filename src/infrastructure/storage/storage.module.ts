import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { STORAGE, IMAGE_PROCESSOR } from '@contexts/media/application/ports';
import { StoragePort } from '@contexts/media/application/ports/storage.port';
import { S3StorageAdapter } from './s3.storage-adapter';
import { LocalDiskStorageAdapter } from './local-disk.storage-adapter';
import { SharpImageProcessor } from './sharp.image-processor';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StoragePort => {
        if (config.get('STORAGE_DRIVER') === 's3') {
          return new S3StorageAdapter({
            endpoint: config.get('S3_ENDPOINT'),
            region: config.get('S3_REGION'),
            bucket: config.get('S3_BUCKET'),
            accessKeyId: config.get('S3_ACCESS_KEY_ID'),
            secretAccessKey: config.get('S3_SECRET_ACCESS_KEY'),
            publicBase: config.get('S3_PUBLIC_BASE'),
            forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
          });
        }
        return new LocalDiskStorageAdapter({
          root: config.get('STORAGE_LOCAL_DIR'),
          publicBase: '/storage',
        });
      },
    },
    { provide: IMAGE_PROCESSOR, useClass: SharpImageProcessor },
  ],
  exports: [STORAGE, IMAGE_PROCESSOR],
})
export class StorageModule {}
