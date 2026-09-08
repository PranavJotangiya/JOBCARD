import { HumanizePipe } from './humanize.pipe';

describe('HumanizePipe', () => {
  const pipe = new HumanizePipe();

  it('turns audit action codes into readable text', () => {
    expect(pipe.transform('WORK_STARTED')).toBe('Work Started');
    expect(pipe.transform('JOBCARD_CREATED')).toBe('Jobcard Created');
  });

  it('handles kebab-case and empty input', () => {
    expect(pipe.transform('in-progress')).toBe('In Progress');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
