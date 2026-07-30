import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary } from '@zxcvbn-ts/language-common';

export const PASSWORD_STRENGTH_EVALUATOR_VERSION = 'zxcvbn-ts-4.1-nist-v1';
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordStrengthCategory =
  | 'very_weak'
  | 'weak'
  | 'fair'
  | 'strong'
  | 'very_strong';

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  category: PasswordStrengthCategory;
  percent: 10 | 30 | 50 | 75 | 100;
  recommendations: string[];
  meetsLengthRequirement: boolean;
  requiresExplicitConfirmation: boolean;
  evaluatorVersion: string;
}

const categories: PasswordStrengthCategory[] = ['very_weak', 'weak', 'fair', 'strong', 'very_strong'];
const percentages = [10, 30, 50, 75, 100] as const;
const estimator = new ZxcvbnFactory({ dictionary, graphs: adjacencyGraphs });

export function evaluatePasswordStrength(
  password: string,
  contextualInputs: string[] = []
): PasswordStrengthResult {
  const inputs = contextualInputs.map((value) => value.trim()).filter((value) => value.length >= 3);
  const result = estimator.check(password, inputs);
  const score = Math.max(0, Math.min(4, result.score)) as 0 | 1 | 2 | 3 | 4;
  const recommendations: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    recommendations.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (score < 2) {
    recommendations.push('Add several unrelated words to make this password harder to guess.');
  } else if (score < 3) {
    recommendations.push('Consider adding another unrelated word for stronger protection.');
  }
  if (inputs.some((input) => input.length > 0 && password.toLocaleLowerCase().includes(input.toLocaleLowerCase()))) {
    recommendations.push('Avoid using your name, email, company name, or domain.');
  }
  if (/(.)\1{2,}/u.test(password) || /(?:1234|abcd|qwerty)/iu.test(password)) {
    recommendations.push('Avoid repeated characters and predictable sequences.');
  }

  return {
    score,
    category: categories[score],
    percent: percentages[score],
    recommendations: [...new Set(recommendations)].slice(0, 3),
    meetsLengthRequirement: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    requiresExplicitConfirmation: score < 2,
    evaluatorVersion: PASSWORD_STRENGTH_EVALUATOR_VERSION,
  };
}

