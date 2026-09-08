import { ownershipFilter } from '../../src/modules/jobcards/jobcard.service';
import { Role } from '../../src/constants/roles';
import type { AuthenticatedUser } from '../../src/types/common.types';

const user = (over: Partial<AuthenticatedUser>): AuthenticatedUser => ({
  id: '000000000000000000000001',
  name: 'T',
  username: 't',
  role: Role.JOBBER,
  manufacturerId: null,
  jobberId: null,
  ...over,
});

/**
 * `ownershipFilter` is the primitive behind data isolation — every Job Card query
 * is scoped by it. A Jobber's queries can only ever match their own `jobberId`.
 */
describe('ownershipFilter (data isolation primitive)', () => {
  it('scopes a JOBBER to their jobberId', () => {
    expect(ownershipFilter(user({ role: Role.JOBBER, jobberId: 'J1' }))).toEqual({ jobberId: 'J1' });
  });

  it('scopes a MANUFACTURER to their manufacturerId', () => {
    expect(ownershipFilter(user({ role: Role.MANUFACTURER, manufacturerId: 'M1' }))).toEqual({
      manufacturerId: 'M1',
    });
  });

  it('does not scope ADMIN', () => {
    expect(ownershipFilter(user({ role: Role.ADMIN }))).toEqual({});
  });

  it('a JOBBER filter never leaks another jobber id', () => {
    const f = ownershipFilter(user({ role: Role.JOBBER, jobberId: 'J1', manufacturerId: 'M-attack' }));
    expect(f).not.toHaveProperty('manufacturerId');
  });
});
