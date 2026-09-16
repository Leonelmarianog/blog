import { AbilityService } from '@kernel/application/authorization/ability.service';

describe('AbilityService', () => {
  it('builds an ability that mirrors createAbilityFor', () => {
    const service = new AbilityService();
    const ability = service.build('ADMIN', 'u1');
    expect(ability.can('manage', 'User')).toBe(true);
  });
});
