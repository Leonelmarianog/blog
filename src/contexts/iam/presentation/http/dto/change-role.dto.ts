import { IsIn } from 'class-validator';
import { ROLES } from '@contexts/iam/application/authorization';

export class ChangeRoleDto {
  @IsIn(ROLES)
  role!: 'ADMIN' | 'AUTHOR' | 'READER';
}
