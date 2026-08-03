import { ObjectId } from 'mongodb';
import { GlobalSettingsRepository } from '@/auth/repositories/global-settings.repository';
import { RedirectRepository } from '@/auth/repositories/redirect.repository';
import type { GlobalSettingsDocument, RedirectDocument } from '@/types/seo';

export class SeoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeoValidationError';
  }
}

export class SeoService {
  private globalSettingsRepo = new GlobalSettingsRepository();
  private redirectRepo = new RedirectRepository();

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
      
      currentDestination = nextRedirect.destination;
      depth++;
    }
    
    if (depth >= maxDepth) {
      throw new SeoValidationError('Redirect chain is too long (exceeds 10 redirects).');
    }
  }

  async createRedirect(
    data: { source: string; destination: string; statusCode: 301 | 302 | 307 | 308; active: boolean },
    userId: ObjectId
  ): Promise<RedirectDocument> {
    const existing = await this.redirectRepo.findBySource(data.source);
    if (existing) {
      throw new SeoValidationError(`A redirect for ${data.source} already exists.`);
    }

    if (data.active) {
      await this.checkRedirectLoop(data.source, data.destination);
    }

    return this.redirectRepo.create(data, userId);
  }

  async updateRedirect(
    id: string,
    data: { source?: string; destination?: string; statusCode?: 301 | 302 | 307 | 308; active?: boolean },
    userId: ObjectId
  ): Promise<boolean> {
    const existing = await this.redirectRepo.findById(id);
    if (!existing) {
      throw new SeoValidationError('Redirect not found.');
    }

    const newSource = data.source ?? existing.source;
    const newDestination = data.destination ?? existing.destination;
    const newActive = data.active ?? existing.active;

    if (data.source && data.source !== existing.source) {
      const sourceExists = await this.redirectRepo.findBySource(data.source);
      if (sourceExists) {
        throw new SeoValidationError(`A redirect for ${data.source} already exists.`);
      }
    }

    if (newActive) {
      await this.checkRedirectLoop(newSource, newDestination);
    }

    return this.redirectRepo.update(id, data, userId);
  }

  async deleteRedirect(id: string): Promise<boolean> {
    return this.redirectRepo.delete(id);
  }
}
