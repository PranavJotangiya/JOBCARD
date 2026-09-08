import {
  DISPATCH_TRANSITIONS,
  DispatchStatus,
  WORK_TRANSITIONS,
  WorkStatus,
} from '../../src/modules/jobcards/jobcard.constants';

/**
 * The status machines are the backend's authority (requirement 14). These tests
 * pin the allowed / disallowed moves.
 */
describe('work status transitions', () => {
  it('DRAFT can go READY, IN_PROGRESS (start) or CANCELLED — not COMPLETED', () => {
    expect(WORK_TRANSITIONS.ready.from).toContain(WorkStatus.DRAFT);
    expect(WORK_TRANSITIONS.start.from).toContain(WorkStatus.DRAFT);
    expect(WORK_TRANSITIONS.cancel.from).toContain(WorkStatus.DRAFT);
    expect(WORK_TRANSITIONS.complete.from).not.toContain(WorkStatus.DRAFT);
  });

  it('only IN_PROGRESS can be completed', () => {
    expect(WORK_TRANSITIONS.complete.from).toEqual([WorkStatus.IN_PROGRESS]);
    expect(WORK_TRANSITIONS.complete.to).toBe(WorkStatus.COMPLETED);
  });

  it('COMPLETED and CANCELLED are terminal for work actions', () => {
    for (const action of Object.values(WORK_TRANSITIONS)) {
      expect(action.from).not.toContain(WorkStatus.COMPLETED);
      expect(action.from).not.toContain(WorkStatus.CANCELLED);
    }
  });
});

describe('dispatch status transitions', () => {
  it('dispatch requires work COMPLETED and IN_FACTORY', () => {
    expect(DISPATCH_TRANSITIONS.dispatch.from).toEqual([DispatchStatus.IN_FACTORY]);
    expect(DISPATCH_TRANSITIONS.dispatch.requiresWorkStatus).toEqual([WorkStatus.COMPLETED]);
    expect(DISPATCH_TRANSITIONS.dispatch.to).toBe(DispatchStatus.DISPATCHED);
  });

  it('bring-back only from DISPATCHED', () => {
    expect(DISPATCH_TRANSITIONS['bring-back'].from).toEqual([DispatchStatus.DISPATCHED]);
    expect(DISPATCH_TRANSITIONS['bring-back'].to).toBe(DispatchStatus.IN_FACTORY);
  });
});
