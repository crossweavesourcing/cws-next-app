export type EventName = 
  | 'generate_lead'
  | 'view_item'
  | 'select_item'
  | 'view_catalog'
  | 'interaction_gallery';

export interface BaseEventParams {
  event_id?: string; // For deduplication
  [key: string]: unknown;
}

export interface GenerateLeadParams extends BaseEventParams {
  form_id: string;
  subject_category: string;
}

export interface ViewItemParams extends BaseEventParams {
  item_name: string;
  item_category: string;
}

export interface SelectItemParams extends BaseEventParams {
  item_name: string;
  item_category: string;
}

export interface ViewCatalogParams extends BaseEventParams {
  catalog_title: string;
  page_count: number;
}

export interface InteractionGalleryParams extends BaseEventParams {
  item_name: string;
}

export type EventParams<T extends EventName> = 
  T extends 'generate_lead' ? GenerateLeadParams :
  T extends 'view_item' ? ViewItemParams :
  T extends 'select_item' ? SelectItemParams :
  T extends 'view_catalog' ? ViewCatalogParams :
  T extends 'interaction_gallery' ? InteractionGalleryParams :
  BaseEventParams;

// In-memory cache for event deduplication (helps with React Strict Mode)
const processedEventIds = new Set<string>();

/**
 * Strips known PII keys from any payload before sending to analytics
 */
function stripPII(params: Record<string, unknown>): Record<string, unknown> {
  const safeParams = { ...params };
  const blockedKeys = ['email', 'name', 'phone', 'message', 'firstName', 'lastName'];
  
  for (const key of Object.keys(safeParams)) {
    if (blockedKeys.some(blocked => key.toLowerCase().includes(blocked.toLowerCase()))) {
      delete safeParams[key];
    }
  }
  return safeParams;
}

/**
 * Safely tracks an event to Google Tag Manager / GA4
 */
export function trackEvent<T extends EventName>(eventName: T, params: EventParams<T>) {
  if (typeof window === 'undefined') return;
  
  // Deduplication check
  if (params.event_id) {
    if (processedEventIds.has(params.event_id)) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(`[Analytics] Deduplicated event: ${eventName} (${params.event_id})`);
      }
      return;
    }
    processedEventIds.add(params.event_id);
    
    // Prevent memory leaks for long-lived sessions
    if (processedEventIds.size > 500) {
      const iterator = processedEventIds.values();
      const oldest = iterator.next().value;
      if (oldest) processedEventIds.delete(oldest); // Remove oldest
    }
  }

  const safeParams = stripPII(params);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    event: eventName,
    ...safeParams
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[Analytics] Tracked: ${eventName}`, safeParams);
  }
}
