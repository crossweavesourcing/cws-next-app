import { ObjectId } from 'mongodb';
import { getSectionsCollection } from '@/database/collections';
import type { SectionDocument } from '@/types/section';
import { SECTION_DEFINITIONS } from '@/lib/section-definitions';

export class SectionRepository {
  async findAll(): Promise<SectionDocument[]> {
    const sections = await getSectionsCollection();
    const records = await sections.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
    const unique = new Map<string, SectionDocument>();
    for (const record of records) {
      if (!unique.has(record.sectionId)) unique.set(record.sectionId, record);
    }
    return [...unique.values()].sort((left, right) => {
      const leftIndex = SECTION_DEFINITIONS.findIndex((item) => item.id === left.sectionId);
      const rightIndex = SECTION_DEFINITIONS.findIndex((item) => item.id === right.sectionId);
      return leftIndex - rightIndex;
    });
  }

  async ensureDefaults(): Promise<void> {
    const sections = await getSectionsCollection();
    const now = new Date();
    await sections.bulkWrite(SECTION_DEFINITIONS.map((definition) => ({
      updateOne: {
        filter: { sectionId: definition.id },
        update: {
          $setOnInsert: {
            sectionId: definition.id,
            pageKey: definition.pageKey,
            label: definition.label,
            route: definition.route,
            status: definition.status,
            paused: definition.paused,
            summary: definition.summary,
            content: definition.defaultContent,
            media: {},
            lastEdited: definition.lastEdited,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })), { ordered: false });
  }

  async findBySectionId(sectionId: string): Promise<SectionDocument | null> {
    const sections = await getSectionsCollection();
    return sections.findOne({ sectionId });
  }

  async findById(id: string | ObjectId): Promise<SectionDocument | null> {
    const sections = await getSectionsCollection();
    return sections.findOne({ _id: new ObjectId(id) });
  }

  async create(data: Omit<SectionDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<SectionDocument> {
    const sections = await getSectionsCollection();
    const now = new Date();
    const doc: SectionDocument = {
      ...data,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    await sections.insertOne(doc);
    return doc;
  }

  async updateBySectionId(sectionId: string, data: Partial<Omit<SectionDocument, '_id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const sections = await getSectionsCollection();
    const result = await sections.updateOne(
      { sectionId },
      { $set: { ...data, updatedAt: new Date(), lastEdited: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) } }
    );
    return result.matchedCount > 0;
  }
}
