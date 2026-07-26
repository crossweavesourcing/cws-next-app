import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { SectionDocument } from '@/types/section';

const state = vi.hoisted(() => ({
  update: vi.fn(),
  audit: vi.fn(),
  upload: vi.fn(),
  ensure: vi.fn(),
  find: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth/dal', () => ({ requireRole: vi.fn() }));
vi.mock('@/auth/repositories/section.repository', () => ({
  SectionRepository: class {
    ensureDefaults = state.ensure;
    findBySectionId = state.find;
    updateBySectionId = state.update;
    findAll = vi.fn().mockResolvedValue([]);
  },
}));
vi.mock('@/auth/repositories/audit-log.repository', () => ({ AuditLogRepository: class { log = state.audit; } }));
vi.mock('@/lib/cloudinary', () => ({ uploadToCloudinary: state.upload }));

const { SectionService, SectionValidationError } = await import('@/auth/services/section.service');

const actor = { userId: new ObjectId(), sessionId: new ObjectId(), source: 'web' as const };
const existing: SectionDocument = {
  _id: new ObjectId(), sectionId: 'home-hero', pageKey: 'home', label: 'Hero Cover', route: '/#top',
  status: 'Live', paused: false, summary: 'Hero', lastEdited: 'Jul 02, 2026',
  content: { eyebrow: 'Old eyebrow' }, media: {}, createdAt: new Date(), updatedAt: new Date(),
};

describe('SectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ensure.mockResolvedValue(undefined);
    state.find.mockResolvedValue(existing);
    state.update.mockResolvedValue(true);
    state.audit.mockResolvedValue(undefined);
    state.upload.mockResolvedValue('https://res.cloudinary.com/example/image.jpg');
  });

  it('rejects content keys that are not declared by the section definition', async () => {
    await expect(new SectionService().updateSection('home-hero', { content: { unknown: 'value' } }, new Map(), actor)).rejects.toBeInstanceOf(SectionValidationError);
    expect(state.update).not.toHaveBeenCalled();
  });

  it('merges valid content and audits field names without content values', async () => {
    await new SectionService().updateSection('home-hero', { content: { eyebrow: 'New eyebrow' }, paused: true }, new Map(), actor);
    expect(state.update).toHaveBeenCalledWith('home-hero', expect.objectContaining({ paused: true, content: expect.objectContaining({ eyebrow: 'New eyebrow', headline: 'Knit, Woven & Sweater' }) }));
    expect(state.audit).toHaveBeenCalledWith(expect.objectContaining({ metadata: { changedFields: ['eyebrow'], changedMediaSlots: [], visibilityChanged: true } }));
    expect(JSON.stringify(state.audit.mock.calls)).not.toContain('New eyebrow');
  });

  it('rejects unsupported media before uploading it', async () => {
    const file = new File(['unsafe'], 'asset.svg', { type: 'image/svg+xml' });
    await expect(new SectionService().updateSection('home-hero', {}, new Map([['background', file]]), actor)).rejects.toBeInstanceOf(SectionValidationError);
    expect(state.upload).not.toHaveBeenCalled();
  });
});
