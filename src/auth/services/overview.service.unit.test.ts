import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverviewService } from './overview.service';
import { ObjectId } from 'mongodb';

vi.mock('server-only', () => ({}));

vi.mock('@/database', () => {
  const mockCollection = {
    countDocuments: vi.fn().mockResolvedValue(10),
  };
  return {
    getDb: vi.fn().mockResolvedValue({
      collection: () => mockCollection,
    }),
    getCatalogDocumentsCollection: vi.fn().mockResolvedValue(mockCollection),
    getUsersCollection: vi.fn().mockResolvedValue(mockCollection),
  };
});

vi.mock('../repositories/audit-log.repository', () => ({
  AuditLogRepository: class {
    async getRecentLogs() {
      return [
        {
          _id: new ObjectId(),
          action: 'SEO_CONFIG_UPDATE',
          actor: 'Test Admin',
          createdAt: new Date('2026-08-05T12:00:00Z'),
        },
      ];
    }
  },
}));

vi.mock('./section.service', () => ({
  SectionService: class {
    async getPublicSections() {
      return [
        { sectionId: 's1', paused: false },
        { sectionId: 's2', paused: true },
      ];
    }
  },
}));

vi.mock('./seo.service', () => ({
  SeoService: class {
    async getGlobalSettings() {
      return { defaultTitle: 'Default Title', defaultDescription: 'Default Description' };
    }
    async getPageSeoByPath() {
      return { title: 'Home Title', description: 'Home Description', canonicalUrl: 'https://example.com' };
    }
  },
}));

describe('OverviewService', () => {
  let service: OverviewService;

  beforeEach(() => {
    service = new OverviewService();
  });

  it('aggregates live metrics and calculates SEO health score', async () => {
    const metrics = await service.getDashboardOverviewMetrics();

    expect(metrics.productsCount).toBe(10);
    expect(metrics.categoriesCount).toBe(10);
    expect(metrics.catalogsCount).toBe(10);
    expect(metrics.activeUsersCount).toBe(10);
    expect(metrics.visibleSectionsCount).toBe(1);
    expect(metrics.pausedSectionsCount).toBe(1);
    expect(metrics.seoHealthScore).toBeGreaterThan(0);
    expect(metrics.recentAuditLogs).toHaveLength(1);
    expect(metrics.recentAuditLogs[0].action).toBe('SEO_CONFIG_UPDATE');
  });
});
