import type { SectionContent, SectionMedia } from '@/lib/section-definitions';

export interface SectionItem {
  sectionId: string;
  pageKey: string;
  paused: boolean;
  mediaUrl?: string;
  content?: SectionContent;
  media?: SectionMedia;
}

export const contentValue = (section: SectionItem | undefined, key: string, fallback: string) =>
  typeof section?.content?.[key] === 'string' ? (section.content[key] as string) : fallback;

export const contentList = (section: SectionItem | undefined, key: string, fallback: string[]) =>
  Array.isArray(section?.content?.[key]) ? (section.content[key] as string[]) : fallback;

export const mediaValue = (section: SectionItem | undefined, key: string, fallback: string) =>
  section?.media?.[key]?.url || section?.mediaUrl || fallback;

export const mediaKind = (section: SectionItem | undefined, key: string) =>
  section?.media?.[key]?.kind || (section?.mediaUrl?.match(/\.(mp4|webm|mov)(?:\?|$)/i) ? 'video' : 'image');
