/* eslint-disable */
import { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';
import { PoliciesGuard } from '@kernel/application/authorization/policies.guard';

export class C {
  constructor(u: UploadAssetUseCase, g: PoliciesGuard) {}
}