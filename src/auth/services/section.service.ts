import type { ObjectId } from 'mongodb';
import { SectionRepository } from '@/auth/repositories/section.repository';
import { requireCmsPermission } from '@/auth/dal';
import { AuditLogRepository } from '@/auth/repositories/audit-log.repository';
import { uploadToCloudinary } from '@/lib/cloudinary';
import {
  SECTION_DEFINITION_MAP,
  SECTION_DEFINITIONS,
  defaultMediaFor,
  mergeSectionValues,
  type SectionContent,
  type SectionMedia,
  type SectionMediaKind,
} from '@/lib/section-definitions';

const IMAGE_LIMIT = 10 * 1024 * 1024;
const VIDEO_LIMIT = 50 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export type SectionAdminActor = {
  userId: ObjectId;
  sessionId: ObjectId | null;
  source: 'web' | 'mobile';
};

export type SectionUpdateInput = {
  paused?: boolean;
  content?: SectionContent;
  resetMediaSlots?: string[];
};

export class SectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SectionValidationError';
  }
}

function validateContent(sectionId: string, content: SectionContent | undefined): SectionContent | undefined {
  if (content === undefined) return undefined;
  const definition = SECTION_DEFINITION_MAP.get(sectionId);
  if (!definition) throw new SectionValidationError('Unknown section.');
  const fields = new Map(definition.fields.map((field) => [field.key, field]));
  const output: SectionContent = {};
  for (const [key, value] of Object.entries(content)) {
    const field = fields.get(key);
    if (!field) throw new SectionValidationError(`Unknown content field: ${key}`);
    if (field.control === 'list') {
      if (!Array.isArray(value)) throw new SectionValidationError(`${field.label} must be a list.`);
      const items = value.map((item) => item.trim()).filter(Boolean);
      if (items.some((item) => item.length > field.maxLength)) throw new SectionValidationError(`${field.label} contains an item that is too long.`);
      output[key] = items;
    } else {
      if (typeof value !== 'string') throw new SectionValidationError(`${field.label} must be text.`);
      const normalized = value.trim();
      if (normalized.length > field.maxLength) throw new SectionValidationError(`${field.label} is too long.`);
      output[key] = normalized;
    }
  }
  return output;
}

function validateMediaFile(sectionId: string, slotKey: string, file: File): SectionMediaKind {
  const definition = SECTION_DEFINITION_MAP.get(sectionId);
  const slot = definition?.mediaSlots.find((item) => item.key === slotKey);
  if (!slot) throw new SectionValidationError('Unknown media slot.');
  const kind: SectionMediaKind | null = IMAGE_TYPES.has(file.type) ? 'image' : VIDEO_TYPES.has(file.type) ? 'video' : null;
  if (!kind || !slot.accepts.includes(kind)) throw new SectionValidationError(`${slot.label} does not accept this file type.`);
  if (file.size <= 0 || file.size > (kind === 'image' ? IMAGE_LIMIT : VIDEO_LIMIT)) {
    throw new SectionValidationError(`${slot.label} exceeds the ${kind === 'image' ? '10 MB' : '50 MB'} limit.`);
  }
  return kind;
}

export class SectionService {
  private sectionRepo = new SectionRepository();
  private auditRepo = new AuditLogRepository();

  async getPublicSections() {
    const sections = await this.sectionRepo.findAll();
    const byId = new Map(sections.map((section) => [section.sectionId, section]));
    return SECTION_DEFINITIONS.map((definition) => mergeSectionValues(byId.get(definition.id) ?? {
      sectionId: definition.id,
      pageKey: definition.pageKey,
      label: definition.label,
      route: definition.route,
      status: definition.status,
      paused: definition.paused,
      summary: definition.summary,
      lastEdited: definition.lastEdited,
      content: definition.defaultContent,
      media: defaultMediaFor(definition),
    }));
  }

  async getAdminSections(actor?: SectionAdminActor) {
    if (!actor) await requireCmsPermission('page_content');
    const sections = await this.getPublicSections();
    return sections.map((section) => ({
      ...section,
      definition: SECTION_DEFINITION_MAP.get(section.sectionId),
    }));
  }

  async updateSection(sectionId: string, input: SectionUpdateInput, files: Map<string, File>, actor?: SectionAdminActor) {
    const resolvedActor = actor ?? await this.requireWebActor();
    const definition = SECTION_DEFINITION_MAP.get(sectionId);
    if (!definition) throw new SectionValidationError('Unknown section.');
    if (input.paused !== undefined && !definition.visibilityEditable) throw new SectionValidationError('Visibility cannot be changed for this section.');

    await this.sectionRepo.ensureDefaults();
    const existing = await this.sectionRepo.findBySectionId(sectionId);
    if (!existing) throw new SectionValidationError('Section not found.');
    const content = validateContent(sectionId, input.content);
    const currentMedia: SectionMedia = { ...defaultMediaFor(definition), ...(existing.media ?? {}) };
    const changedMediaSlots: string[] = [];

    for (const slotKey of input.resetMediaSlots ?? []) {
      const slot = definition.mediaSlots.find((item) => item.key === slotKey);
      if (!slot) throw new SectionValidationError('Unknown media slot.');
      currentMedia[slotKey] = { url: slot.defaultUrl, kind: 'image', isDefault: true };
      changedMediaSlots.push(slotKey);
    }

    for (const [slotKey, file] of files) {
      const kind = validateMediaFile(sectionId, slotKey, file);
      const url = await uploadToCloudinary(Buffer.from(await file.arrayBuffer()), `cws_sections/${sectionId}`);
      currentMedia[slotKey] = { url, kind, isDefault: false };
      changedMediaSlots.push(slotKey);
    }

    const changedFields = Object.keys(content ?? {});
    const updated = await this.sectionRepo.updateBySectionId(sectionId, {
      ...(input.paused === undefined ? {} : { paused: input.paused }),
      ...(content === undefined ? {} : { content: { ...definition.defaultContent, ...(existing.content ?? {}), ...content } }),
      ...(changedMediaSlots.length === 0 ? {} : { media: currentMedia }),
    });
    if (!updated) throw new SectionValidationError('Section not found.');

    await this.auditRepo.log({
      userId: resolvedActor.userId,
      sessionId: resolvedActor.sessionId,
      action: 'cms.section.updated',
      status: 'SUCCESS',
      errorCode: null,
      actor: { type: 'admin', id: resolvedActor.userId },
      source: { platform: resolvedActor.source, appVersion: null },
      correlationId: null,
      requestId: null,
      resource: { type: 'section', id: sectionId },
      metadata: { changedFields, changedMediaSlots, visibilityChanged: input.paused !== undefined },
      ipAddress: null,
      userAgent: null,
    });
    return true;
  }

  async toggleSectionStatus(sectionId: string, paused: boolean) {
    return this.updateSection(sectionId, { paused }, new Map());
  }

  async updateSectionMedia(sectionId: string, mediaFile: File | null, slotKey?: string) {
    if (!mediaFile) throw new SectionValidationError('Media file is required.');
    const definition = SECTION_DEFINITION_MAP.get(sectionId);
    const resolvedSlot = slotKey || definition?.mediaSlots[0]?.key;
    if (!resolvedSlot) throw new SectionValidationError('This section has no media slot.');
    await this.updateSection(sectionId, {}, new Map([[resolvedSlot, mediaFile]]));
    const updated = await this.sectionRepo.findBySectionId(sectionId);
    return mergeSectionValues(updated!).media?.[resolvedSlot]?.url;
  }

  async updateSectionContent(sectionId: string, data: { label?: string; summary?: string; status?: 'Live' | 'Review' | 'Draft' }) {
    // Legacy mobile clients used these inventory fields. They are intentionally no longer editable.
    if (data.label || data.summary || data.status) throw new SectionValidationError('Use the section content object for editable copy.');
    return true;
  }

  private async requireWebActor(): Promise<SectionAdminActor> {
    const session = await requireCmsPermission('page_content');
    return { userId: session.userId, sessionId: session._id, source: 'web' };
  }
}

export const sectionDefinitionCount = SECTION_DEFINITIONS.length;
