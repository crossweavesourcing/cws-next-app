import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const state = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  simulateInsertRace: false,
}));

vi.mock('@/database', () => ({
  getDevicesCollection: async () => ({
    async findOne(filter: Record<string, unknown>) {
      for (const document of state.documents.values()) {
        const id = document._id as ObjectId;
        const userId = document.userId as ObjectId;
        if (filter._id instanceof ObjectId && !id.equals(filter._id)) continue;
        if (filter.userId instanceof ObjectId && !userId.equals(filter.userId)) continue;
        if (typeof filter.deviceId === 'string' && document.deviceId !== filter.deviceId) continue;
        return document;
      }
      return null;
    },
    async updateOne(
      filter: { _id: ObjectId },
      update: { $set: Record<string, unknown> }
    ) {
      const document = state.documents.get(filter._id.toString());
      if (document) Object.assign(document, update.$set);
      return { matchedCount: document ? 1 : 0, modifiedCount: document ? 1 : 0 };
    },
    async insertOne(document: Record<string, unknown>) {
      const id = document._id as ObjectId;

      if (state.simulateInsertRace) {
        state.simulateInsertRace = false;
        state.documents.set(id.toString(), { ...document });
        throw { code: 11000 };
      }

      const duplicate = [...state.documents.values()].some((existing) => {
        const existingId = existing._id as ObjectId;
        return existingId.equals(id) || existing.deviceId === document.deviceId;
      });
      if (duplicate) throw { code: 11000 };

      state.documents.set(id.toString(), { ...document });
      return { insertedId: id };
    },
  }),
}));

import { DeviceRepository } from './device.repository';

const clientDeviceId = 'c0ffee00-0000-4000-8000-000000000001';

function seedDevice(params: {
  _id: ObjectId;
  userId: ObjectId;
  deviceId?: string;
  blocked?: boolean;
}) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  state.documents.set(params._id.toString(), {
    _id: params._id,
    userId: params.userId,
    deviceId: params.deviceId ?? clientDeviceId,
    name: null,
    type: 'desktop',
    platform: 'web',
    browser: 'Old Browser',
    operatingSystem: 'Old OS',
    userAgent: 'old-agent',
    fingerprint: null,
    trusted: false,
    trustedAt: null,
    trustedUntil: null,
    trustGrantedBy: null,
    blocked: params.blocked ?? false,
    blockedAt: null,
    blockedBy: null,
    blockedReason: null,
    loginCount: 0,
    lastSeenAt: now,
    lastSeenIp: null,
    lastSeenLocation: null,
    firstSeenAt: now,
    firstSeenIp: null,
    createdAt: now,
    updatedAt: now,
  });
}

function registrationParams(userId: ObjectId, serverDeviceId: ObjectId) {
  return {
    userId,
    serverDeviceId,
    clientDeviceId,
    type: 'desktop' as const,
    platform: 'web' as const,
    browser: 'Chrome',
    operatingSystem: 'Linux',
    userAgent: 'test-agent',
    ipAddress: '203.0.113.10',
    location: { country: 'BD', region: 'Dhaka', city: 'Dhaka' },
  };
}

describe('DeviceRepository.upsertOnLogin', () => {
  beforeEach(() => {
    state.documents.clear();
    state.simulateInsertRace = false;
  });

  it('mints a new record when a signed device id belongs to another user', async () => {
    const firstUserId = new ObjectId();
    const secondUserId = new ObjectId();
    const existingRecordId = new ObjectId();
    seedDevice({ _id: existingRecordId, userId: firstUserId });

    const result = await new DeviceRepository().upsertOnLogin(
      registrationParams(secondUserId, existingRecordId)
    );

    expect(result.isNew).toBe(true);
    expect(result.doc?._id.equals(existingRecordId)).toBe(false);
    expect(result.doc?.deviceId).not.toBe(clientDeviceId);
    expect(result.doc?.userId.equals(secondUserId)).toBe(true);
    expect(state.documents.size).toBe(2);
  });

  it('does not reuse a globally indexed legacy correlation id after a token reset', async () => {
    const userId = new ObjectId();
    seedDevice({ _id: new ObjectId(), userId });
    const freshServerDeviceId = new ObjectId();

    const result = await new DeviceRepository().upsertOnLogin(
      registrationParams(userId, freshServerDeviceId)
    );

    expect(result.isNew).toBe(true);
    expect(result.doc?._id.equals(freshServerDeviceId)).toBe(true);
    expect(result.doc?.deviceId).not.toBe(clientDeviceId);
    expect(state.documents.size).toBe(2);
  });

  it('reuses the row when another login request wins the insert race', async () => {
    const userId = new ObjectId();
    const serverDeviceId = new ObjectId();
    state.simulateInsertRace = true;

    const result = await new DeviceRepository().upsertOnLogin(
      registrationParams(userId, serverDeviceId)
    );

    expect(result.isNew).toBe(false);
    expect(result.doc?._id.equals(serverDeviceId)).toBe(true);
    expect(result.doc?.userId.equals(userId)).toBe(true);
    expect(state.documents.size).toBe(1);
  });
});
