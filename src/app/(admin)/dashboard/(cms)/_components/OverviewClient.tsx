"use client";

import { useEffect } from 'react';
import { useDashboardContext } from './DashboardContext';
import { OverviewPanel, type LiveDashboardOverviewMetrics } from './DashboardComponents';

export function OverviewClient({ metrics }: { metrics: LiveDashboardOverviewMetrics }) {
  const { setActiveWorkspace, visibleSections, pausedSections, enabledNavIds } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('overview');
  }, [setActiveWorkspace]);

  return (
    <OverviewPanel
      visibleSections={visibleSections.length}
      pausedSections={pausedSections.length}
      enabledNavItems={enabledNavIds.size}
      metrics={metrics}
    />
  );
}
