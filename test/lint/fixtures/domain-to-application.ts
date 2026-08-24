import { UseCase } from '../../../../src/shared-kernel/application/use-case.base';
export class Bad extends UseCase<never, never> { async execute() { return { ok: true, value: undefined as never }; } }
