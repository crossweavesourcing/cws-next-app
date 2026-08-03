'use client';

import { useEffect, useRef } from 'react';
import { trackEvent, EventName, EventParams } from '@/lib/analytics';

type ViewTrackerProps<T extends EventName> = {
  eventName: T;
  params: EventParams<T>;
};

export function ViewTracker<T extends EventName>({ eventName, params }: ViewTrackerProps<T>) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      trackEvent(eventName, params);
      tracked.current = true;
    }
  }, [eventName, params]);

  return null;
}
