import { Test } from '@nestjs/testing';
import { UNIT_OF_WORK, UnitOfWorkPort } from '@kernel/application';
import { PrismaUnitOfWork } from '@infra/persistence/unit-of-work';
import { AppModule } from '../../../src/app.module';

describe('UNIT_OF_WORK binding', () => {
  it('resolves to the same singleton PrismaUnitOfWork instance', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const uow = moduleRef.get<UnitOfWorkPort<unknown>>(UNIT_OF_WORK);
    expect(uow).toBeInstanceOf(PrismaUnitOfWork);
    expect(uow).toBe(moduleRef.get(PrismaUnitOfWork));
    await moduleRef.close();
  });
});
