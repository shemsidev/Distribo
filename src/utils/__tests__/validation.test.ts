import { checkPassword, isValidEmail, normalizePhone } from '../validation';

describe('normalizePhone', () => {
  it.each([
    ['069 123 4567', '+355691234567'],
    ['0691234567', '+355691234567'],
    ['+355 69 123 4567', '+355691234567'],
    ['355691234567', '+355691234567'],
    ['00355691234567', '+355691234567'],
    ['+355 069 123 4567', '+355691234567'],
    ['691234567', '+355691234567'],
    ['04 222 3333', '+35542223333'],
    ['+39 333 1234567', '+393331234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '123', '06912', 'abc'])('refuzon "%s"', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('isValidEmail', () => {
  it('pranon email-e të vlefshme', () => {
    expect(isValidEmail('emri@biznesi.al')).toBe(true);
    expect(isValidEmail('  A.B+c@x.co ')).toBe(true);
  });

  it('refuzon email-e të pavlefshme', () => {
    expect(isValidEmail('emri@')).toBe(false);
    expect(isValidEmail('emri biznesi@x.al')).toBe(false);
    expect(isValidEmail('emri@x.a')).toBe(false);
  });
});

describe('checkPassword', () => {
  it('kërkon gjatësi dhe shkronja + shifra', () => {
    expect(checkPassword('abc12')).toBe('short');
    expect(checkPassword('abcdefgh')).toBe('weak');
    expect(checkPassword('12345678')).toBe('weak');
    expect(checkPassword('Fjalëkalim1')).toBeNull();
  });
});
