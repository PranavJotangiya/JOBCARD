import {
  createJobCardSchema,
  listJobCardsQuerySchema,
  updateJobCardSchema,
} from '../../src/modules/jobcards/jobcard.validation';

const OID = '507f1f77bcf86cd799439011';

describe('job card validation (backend is the final authority)', () => {
  it('requires a manufacturerId to create', () => {
    expect(createJobCardSchema.safeParse({}).success).toBe(false);
    expect(createJobCardSchema.safeParse({ manufacturerId: 'not-an-id' }).success).toBe(false);
    expect(createJobCardSchema.safeParse({ manufacturerId: OID }).success).toBe(true);
  });

  it('rejects unknown fields (strict) and negative quantities', () => {
    expect(
      createJobCardSchema.safeParse({ manufacturerId: OID, hacker: 1 }).success,
    ).toBe(false);
    expect(
      createJobCardSchema.safeParse({
        manufacturerId: OID,
        sizes: [{ size: 'M', quantity: -5 }],
      }).success,
    ).toBe(false);
  });

  it('does not accept manufacturerId on update (immutable)', () => {
    const res = updateJobCardSchema.safeParse({ manufacturerId: OID, notes: 'x' });
    expect(res.success).toBe(false);
  });

  it('update requires at least one field', () => {
    expect(updateJobCardSchema.safeParse({}).success).toBe(false);
    expect(updateJobCardSchema.safeParse({ notes: 'hello' }).success).toBe(true);
  });

  it('list query applies safe pagination defaults and clamps limit', () => {
    const parsed = listJobCardsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(listJobCardsQuerySchema.safeParse({ limit: '100000' }).success).toBe(false);
  });

  it('list query accepts filter chips + status filters', () => {
    expect(listJobCardsQuerySchema.safeParse({ bucket: 'in_progress' }).success).toBe(true);
    expect(listJobCardsQuerySchema.safeParse({ workStatus: 'COMPLETED' }).success).toBe(true);
    expect(listJobCardsQuerySchema.safeParse({ workStatus: 'NONSENSE' }).success).toBe(false);
  });
});
