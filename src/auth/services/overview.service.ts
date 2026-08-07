import 'server-only';

import {
  getDb,
  getCatalogDocumentsCollection,
  getUsersCollection,
} from '@/database';
import { SectionService } from './section.service';
import { SeoService } from './seo.service';
import { buildSeoHealthFindings, seoHealthScore } from '@/lib/seo/health';
import { AuditLogRepository } from '../repositories/audit-log.repository';

import { ObjectId } from 'mongodb';

export interface RecentAuditLogItem {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  riskLevel?: string | null;
}

export interface DashboardOverviewMetrics {
  productsCount: number;
  categoriesCount: number;
  catalogsCount: number;
  activeUsersCount: number;
  visibleSectionsCount: number;
  pausedSectionsCount: number;
  seoHealthScore: number;
  recentAuditLogs: RecentAuditLogItem[];
}

const isHexId = (str: string) => /^[0-9a-fA-F]{24}$/.test(str);

export class OverviewService {
  private auditLogRepo = new AuditLogRepository();
  private sectionService = new SectionService();
  private seoService = new SeoService();

  /**
   * Fetches real, live MongoDB metrics for the Admin Dashboard Overview.
   */
  async getDashboardOverviewMetrics(): Promise<DashboardOverviewMetrics> {
    const db = await getDb();
    const [
      catalogsColl,
      usersColl,
      publicSections,
      globalSeo,
      pageSeo,
      auditLogs,
    ] = await Promise.all([
      getCatalogDocumentsCollection(),
      getUsersCollection(),
      this.sectionService.getPublicSections().catch(() => []),
      this.seoService.getGlobalSettings().catch(() => null),
      this.seoService.getPageSeoByPath('/').catch(() => null),
      this.auditLogRepo.getRecentLogs(5).catch(() => []),
    ]);

    const [productsCount, categoriesCount, catalogsCount, activeUsersCount] = await Promise.all([
      db.collection('products').countDocuments({ deletedAt: null }).catch(() => 0),
      db.collection('categories').countDocuments().catch(() => 0),
      catalogsColl.countDocuments().catch(() => 0),
      usersColl.countDocuments({ deletedAt: null, status: 'active' }).catch(() => 0),
    ]);

    const visibleSectionsCount = publicSections.filter((s) => !s.paused).length;
    const pausedSectionsCount = publicSections.filter((s) => s.paused).length;

    // Calculate SEO health score based on global & homepage settings
    const findings = buildSeoHealthFindings({
      settings: globalSeo,
      pageSeos: pageSeo ? [pageSeo] : [],
      products: [],
      categories: [],
      catalogs: [],
      redirects: [],
    });
    const healthScore = seoHealthScore(findings);

    // Resolve user ObjectIds in audit logs to real names
    const userObjectIds: ObjectId[] = [];
    for (const log of auditLogs) {
      if (log.userId && log.userId instanceof ObjectId) {
        userObjectIds.push(log.userId);
      } else if (typeof log.actor === 'string' && isHexId(log.actor)) {
        try {
          userObjectIds.push(new ObjectId(log.actor));
        } catch {}
      }
    }

    const userMap = new Map<string, string>();
    if (userObjectIds.length > 0) {
      const users = await usersColl.find({ _id: { $in: userObjectIds } }).toArray().catch(() => []);
      for (const u of users) {
        const idHex = u._id.toHexString();
        const uAny = u as { displayName?: string; fullName?: string; firstName?: string; lastName?: string; email?: string };
        const name = uAny.displayName || uAny.fullName || `${uAny.firstName || ''} ${uAny.lastName || ''}`.trim() || uAny.email || 'Admin User';
        userMap.set(idHex, name);
      }
    }

    const recentAuditLogs: RecentAuditLogItem[] = auditLogs.map((log) => {
      let actorName = 'System';

      if (typeof log.actor === 'string' && !isHexId(log.actor) && log.actor.trim().length > 0) {
        actorName = log.actor;
      } else if (log.actor && typeof log.actor === 'object' && (log.actor as { displayName?: string }).displayName) {
        actorName = (log.actor as { displayName?: string }).displayName!;
      } else if (log.userId && userMap.has(log.userId.toHexString())) {
        actorName = userMap.get(log.userId.toHexString())!;
      } else if (typeof log.actor === 'string' && isHexId(log.actor) && userMap.has(log.actor)) {
        actorName = userMap.get(log.actor)!;
      } else {
        actorName = 'Admin User';
      }

      let riskLevel: string | null = null;
      if (log.metadata && typeof log.metadata === 'object') {
        const metaAny = log.metadata as Record<string, unknown>;
        if (typeof metaAny.riskLevel === 'string') riskLevel = metaAny.riskLevel;
        else if (typeof metaAny.level === 'string') riskLevel = metaAny.level;
        else if (typeof metaAny.risk === 'string') riskLevel = metaAny.risk;
      }
      if (!riskLevel && log.action.toLowerCase().includes('risk')) {
        riskLevel = 'low';
      }

      return {
        id: log._id.toHexString(),
        action: log.action,
        actor: actorName,
        timestamp: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
        riskLevel,
      };
    });

    return {
      productsCount,
      categoriesCount,
      catalogsCount,
      activeUsersCount,
      visibleSectionsCount,
      pausedSectionsCount,
      seoHealthScore: healthScore,
      recentAuditLogs,
    };
  }
}
