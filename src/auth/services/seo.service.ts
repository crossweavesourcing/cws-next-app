import { ObjectId } from 'mongodb';
import { GlobalSettingsRepository } from '@/auth/repositories/global-settings.repository';
import { RedirectRepository } from '@/auth/repositories/redirect.repository';
import { PageSeoRepository } from '@/auth/repositories/page-seo.repository';
import type { GlobalSettingsDocument, RedirectDocument, PageSeoDocument } from '@/types/seo';
import { assertInternalRedirectDestination, assertInternalRedirectSource } from '@/lib/seo/config';

export class SeoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeoValidationError';
  }
}

export class SeoService {
  private globalSettingsRepo = new GlobalSettingsRepository();
  private redirectRepo = new RedirectRepository();
  private pageSeoRepo = new PageSeoRepository();

  async getPageSeoByPath(path: string): Promise<PageSeoDocument | null> {
    return this.pageSeoRepo.findByPath(path);
  }

  async getAllPageSeos(): Promise<PageSeoDocument[]> {
    return this.pageSeoRepo.findAll();
  }

  async savePageSeo(
    data: Omit<PageSeoDocument, '_id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    userId?: ObjectId
  ): Promise<PageSeoDocument> {
    return this.pageSeoRepo.save(data, userId);
  }

  async deletePageSeo(id: string): Promise<void> {
    return this.pageSeoRepo.deleteById(id);
  }

  async getGlobalSettings(): Promise<GlobalSettingsDocument> {
    return this.globalSettingsRepo.getSettings();
  }

  async updateGlobalSettings(
    data: Partial<Omit<GlobalSettingsDocument, '_id' | 'updatedAt' | 'updatedBy'>>,
    userId: ObjectId
  ): Promise<GlobalSettingsDocument> {
    return this.globalSettingsRepo.updateSettings(data, userId);
  }

  async getAllRedirects(): Promise<RedirectDocument[]> {
    return this.redirectRepo.findAll();
  }

  async getActiveRedirectBySource(source: string): Promise<RedirectDocument | null> {
    return this.redirectRepo.findActiveBySource(source);
  }

  private async checkRedirectLoop(source: string, destination: string): Promise<void> {
    if (source === destination) {
      throw new SeoValidationError('Redirect source and destination cannot be identical.');
    }
    
    let currentDestination = destination;
    let depth = 0;
    const maxDepth = 10;
    const visited = new Set<string>();
    visited.add(source);

    while (depth < maxDepth) {
      if (visited.has(currentDestination)) {
        throw new SeoValidationError(`This redirect creates a circular loop at: ${currentDestination}`);
      }
      visited.add(currentDestination);
      
      const nextRedirect = await this.redirectRepo.findActiveBySource(currentDestination);
      if (!nextRedirect) {
        break; // Chain ends safely
      }
      if (currentDestination === destination) {
        throw new SeoValidationError('Redirect destination already has a redirect. Chains are not allowed.');
      }
      
      currentDestination = nextRedirect.destination;
      depth++;
    }
    
    if (depth >= maxDepth) {
      throw new SeoValidationError('Redirect chain is too long (exceeds 10 redirects).');
    }
  }

  async createRedirect(
    data: { source: string; destination: string; statusCode: 301 | 302; active: boolean; reason?: string; notes?: string; startsAt?: Date; endsAt?: Date },
    userId: ObjectId
  ): Promise<RedirectDocument> {
    const normalized = {
      ...data,
      source: assertInternalRedirectSource(data.source),
      destination: assertInternalRedirectDestination(data.destination),
    };

    if (normalized.endsAt && normalized.startsAt && normalized.endsAt <= normalized.startsAt) {
      throw new SeoValidationError('Redirect end date must be after the start date.');
    }

    const existing = await this.redirectRepo.findBySource(normalized.source);
    if (existing) {
      throw new SeoValidationError(`A redirect for ${normalized.source} already exists.`);
    }

    if (normalized.active) {
      await this.checkRedirectLoop(normalized.source, normalized.destination);
    }

    return this.redirectRepo.create(normalized, userId);
  }

  async updateRedirect(
    id: string,
    data: { source?: string; destination?: string; statusCode?: 301 | 302; active?: boolean; reason?: string; notes?: string; startsAt?: Date; endsAt?: Date },
    userId: ObjectId
  ): Promise<boolean> {
    const existing = await this.redirectRepo.findById(id);
    if (!existing) {
      throw new SeoValidationError('Redirect not found.');
    }

    const normalized = {
      ...data,
      source: data.source ? assertInternalRedirectSource(data.source) : undefined,
      destination: data.destination ? assertInternalRedirectDestination(data.destination) : undefined,
    };
    const newSource = normalized.source ?? existing.source;
    const newDestination = normalized.destination ?? existing.destination;
    const newActive = data.active ?? existing.active;

    if (normalized.endsAt && normalized.startsAt && normalized.endsAt <= normalized.startsAt) {
      throw new SeoValidationError('Redirect end date must be after the start date.');
    }

    if (normalized.source && normalized.source !== existing.source) {
      const sourceExists = await this.redirectRepo.findBySource(normalized.source);
      if (sourceExists) {
        throw new SeoValidationError(`A redirect for ${normalized.source} already exists.`);
      }
    }

    if (newActive) {
      await this.checkRedirectLoop(newSource, newDestination);
    }

    return this.redirectRepo.update(id, normalized, userId);
  }

  async deleteRedirect(id: string): Promise<boolean> {
    return this.redirectRepo.delete(id);
  }
}
