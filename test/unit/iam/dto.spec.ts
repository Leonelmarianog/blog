import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangeRoleDto } from '@contexts/iam/presentation/http/dto/change-role.dto';
import { UpdateProfileDto } from '@contexts/iam/presentation/http/dto/update-profile.dto';

async function errorsOf<T extends object>(dto: T): Promise<string[]> {
  const errs = await validate(dto);
  return errs.flatMap((e) => Object.keys(e.constraints ?? {}));
}

describe('ChangeRoleDto', () => {
  it('accepts a valid role', async () => {
    const dto = plainToInstance(ChangeRoleDto, { role: 'ADMIN' });
    expect(await errorsOf(dto)).toHaveLength(0);
  });
  it('rejects an unknown role', async () => {
    const dto = plainToInstance(ChangeRoleDto, { role: 'SUPERUSER' });
    expect(await errorsOf(dto)).toContain('isIn');
  });
});

describe('UpdateProfileDto', () => {
  it('accepts displayName without newPassword', async () => {
    const dto = plainToInstance(UpdateProfileDto, { displayName: 'Ada' });
    expect(await errorsOf(dto)).toHaveLength(0);
  });
  it('rejects empty displayName', async () => {
    const dto = plainToInstance(UpdateProfileDto, { displayName: '' });
    expect(await errorsOf(dto)).toContain('minLength');
  });
  it('rejects newPassword shorter than 8', async () => {
    const dto = plainToInstance(UpdateProfileDto, { displayName: 'Ada', newPassword: 'short' });
    expect(await errorsOf(dto)).toContain('minLength');
  });
});
