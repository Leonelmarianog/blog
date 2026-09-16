/* eslint-disable */
import { Asset } from '../domain/asset/asset.aggregate';
import { UnitOfWorkPort } from '@kernel/application';

export class U {
  constructor(a: typeof Asset, u: UnitOfWorkPort<unknown>) {}
}