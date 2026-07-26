import { describe, expect, it } from 'vitest';
import {
  evaluatePasswordStrength,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_EVALUATOR_VERSION,
} from './password-strength';

describe('password strength evaluation', () => {
  it('maps every estimator result to a stable category and percentage', () => {
    const result = evaluatePasswordStrength('correct horse battery staple uncommon');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(4);
    expect([10, 30, 50, 75, 100]).toContain(result.percent);
    expect(result.evaluatorVersion).toBe(PASSWORD_STRENGTH_EVALUATOR_VERSION);
  });

  it('enforces the hard length boundary without requiring character classes', () => {
    expect(evaluatePasswordStrength('a'.repeat(PASSWORD_MIN_LENGTH - 1)).meetsLengthRequirement).toBe(false);
    expect(evaluatePasswordStrength('four calm words together').meetsLengthRequirement).toBe(true);
    expect(evaluatePasswordStrength('🙂'.repeat(PASSWORD_MAX_LENGTH + 1)).meetsLengthRequirement).toBe(false);
  });

  it('accepts unicode and spaces', () => {
    expect(evaluatePasswordStrength('নদী আকাশ বৃষ্টি পাহাড়').meetsLengthRequirement).toBe(true);
  });

  it('requires explicit confirmation for a weak but long password', () => {
    const result = evaluatePasswordStrength('passwordpassword');
    expect(result.meetsLengthRequirement).toBe(true);
    expect(result.requiresExplicitConfirmation).toBe(true);
  });

  it('warns when contextual personal information is included', () => {
    const result = evaluatePasswordStrength('administrator-river-sky', ['administrator']);
    expect(result.recommendations).toContain('Avoid using your name, email, company name, or domain.');
  });

  it('never returns password content in the result', () => {
    const testPhrase = 'private phrase with spaces';
    expect(JSON.stringify(evaluatePasswordStrength(testPhrase))).not.toContain(testPhrase);
  });
});

