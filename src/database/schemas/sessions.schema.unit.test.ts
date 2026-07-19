import { describe, expect, it } from 'vitest';
import { sessionsSchema } from './sessions.schema';

describe('sessions MongoDB schema', () => {
  it('allows the update timestamp written by session maintenance methods', () => {
    expect(sessionsSchema.properties.updatedAt).toEqual({ bsonType: 'date' });
    expect(sessionsSchema.required).not.toContain('updatedAt');
  });
});
