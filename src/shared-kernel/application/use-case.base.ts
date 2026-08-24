import { Result, DomainError } from '../domain/result';

export abstract class UseCase<I, O, E = DomainError> {
  abstract execute(input: I): Promise<Result<O, E>>;
}

export { ok, fail, type Result, type DomainError } from '../domain/result';
