import type { IndexDescription } from 'mongodb';

/** users has no additional indexes at the 10–50 user scale. */
export const usersIndexes: IndexDescription[] = [];
