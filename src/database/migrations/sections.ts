import type { ObjectId } from 'mongodb';
import { getSectionsCollection } from '@/database/collections';
import { sectionsIndexes } from '@/database/indexes/sections.indexes';
import { SECTION_DEFINITIONS } from '@/lib/section-definitions';
import type { SectionDocument } from '@/types/section';

export type SectionsMigrationReport = {
  dryRun: boolean;
  recordsBefore: number;
  duplicateGroups: Array<{ sectionId: string; count: number }>;
  recordsRemoved: number;
  defaultsInserted: number;
  indexesVerified: string[];
};

export async function migrateSections(options: { dryRun: boolean }): Promise<SectionsMigrationReport> {
  const collection = await getSectionsCollection();
  const records = await collection.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  const groups = new Map<string, SectionDocument[]>();
  for (const record of records) groups.set(record.sectionId, [...(groups.get(record.sectionId) ?? []), record]);
  const duplicateGroups = [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([sectionId, items]) => ({ sectionId, count: items.length }));
  const recordsRemoved = duplicateGroups.reduce((total, group) => total + group.count - 1, 0);
  const missingDefinitions = SECTION_DEFINITIONS.filter((definition) => !groups.has(definition.id));

  if (!options.dryRun) {
    for (const [sectionId, items] of groups) {
      if (items.length < 2) continue;
      const canonical = items[0];
      const latestMediaDocument = items.find((item) => item.media && Object.keys(item.media).length > 0);
      const latestLegacyMedia = items.find((item) => item.mediaUrl);
      await collection.updateOne({ _id: canonical._id }, {
        $set: {
          ...(latestMediaDocument?.media ? { media: latestMediaDocument.media } : {}),
          ...(latestLegacyMedia?.mediaUrl ? { mediaUrl: latestLegacyMedia.mediaUrl } : {}),
        },
      });
      const duplicateIds = items.slice(1).map((item) => item._id) as ObjectId[];
      await collection.deleteMany({ sectionId, _id: { $in: duplicateIds } });
    }

    const now = new Date();
    await collection.bulkWrite(SECTION_DEFINITIONS.map((definition) => ({
      updateOne: {
        filter: { sectionId: definition.id },
        update: {
          $setOnInsert: {
            sectionId: definition.id,
            status: definition.status,
            paused: definition.paused,
            lastEdited: definition.lastEdited,
            createdAt: now,
            updatedAt: now,
          },
          $set: {
            pageKey: definition.pageKey,
            label: definition.label,
            route: definition.route,
            summary: definition.summary,
          },
        },
        upsert: true,
      },
    })), { ordered: false });

    for (const definition of SECTION_DEFINITIONS) {
      const document = await collection.findOne({ sectionId: definition.id });
      await collection.updateOne({ sectionId: definition.id }, {
        $set: {
          content: { ...definition.defaultContent, ...(document?.content ?? {}) },
          media: document?.media ?? {},
        },
      });
    }
    await collection.createIndexes(sectionsIndexes);
  }

  const indexes = options.dryRun ? await collection.indexes() : await collection.indexes();
  return {
    dryRun: options.dryRun,
    recordsBefore: records.length,
    duplicateGroups,
    recordsRemoved,
    defaultsInserted: missingDefinitions.length,
    indexesVerified: indexes.map((index) => index.name).filter((name): name is string => Boolean(name)),
  };
}
