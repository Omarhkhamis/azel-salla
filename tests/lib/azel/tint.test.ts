import { describe, it, expect } from 'vitest';
import { gradeFor, gradesFromSettings, withGrade, zoneKey } from '../../../app/lib/azel/tint';

describe('gradesFromSettings', () => {
  it('falls back to the design’s three grades', () => {
    const grades = gradesFromSettings({});
    expect(grades.map((g) => g.id)).toEqual(['00', '01', '02']);
    expect(grades[1]).toMatchObject({ name: 'متوسط العتمة', alpha: 0.55, heat: 76, uv: 99, privacy: 65 });
  });

  it('reads the merchant’s values and drops a grade with no code', () => {
    const grades = gradesFromSettings({ grade1_code: ' 05 ', grade1_shade: 150, grade3_code: '' });
    expect(grades.map((g) => g.id)).toEqual(['05', '01']);
    expect(grades[0].alpha).toBe(1);
  });
});

describe('gradeFor', () => {
  const grades = gradesFromSettings({});
  it.each([
    ['01', '01'],
    ['درجة 02', '02'],
    ['00 خفيف', '00'],
    ['001', null],
    ['أحمر', null],
  ])('%s → %s', (text, id) => {
    expect(gradeFor(text, grades)?.id ?? null).toBe(id);
  });
});

describe('zoneKey', () => {
  it.each([
    ['الزجاج الأمامي', 0, 'front'],
    ['الجوانب الأمامية', 0, 'fside'],
    ['Rear side', 0, 'rside'],
    ['الزجاج الخلفي', 0, 'rear'],
    ['خيار', 2, 'rside'],
    ['خيار', 7, null],
  ])('%s (#%i) → %s', (name, index, zone) => {
    expect(zoneKey(name, index)).toBe(zone);
  });
});

describe('withGrade', () => {
  it('adds ?grade= to the card’s link and leaves an empty link alone', () => {
    expect(withGrade('/film/p1?x=1', '02', 'https://s.test/')).toBe('https://s.test/film/p1?x=1&grade=02');
    expect(withGrade('#', '02', 'https://s.test/')).toBe('#');
  });
});
