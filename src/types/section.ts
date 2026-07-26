import type { ObjectId } from 'mongodb';
import type { SectionContent, SectionMedia } from '@/lib/section-definitions';

export interface SectionDocument {
  _id: ObjectId;
  sectionId: string;
  pageKey: string;
  label: string;
  route: string;
  status: 'Live' | 'Review' | 'Draft';
  paused: boolean;
  summary: string;
  mediaUrl?: string;
  content?: SectionContent;
  media?: SectionMedia;
  lastEdited: string;
  createdAt: Date;
  updatedAt: Date;
}
