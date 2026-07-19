"use client";

import { useEffect } from 'react';
import { useDashboardContext } from './_components/DashboardContext';
import { OverviewPanel } from './_components/DashboardComponents';

export default function OverviewPage() {
  const { setActiveWorkspace, visibleSections, pausedSections, enabledNavIds } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('overview');
  }, [setActiveWorkspace]);

  return (
    <OverviewPanel
      visibleSections={visibleSections.length}
      pausedSections={pausedSections.length}
      enabledNavItems={enabledNavIds.size}
    />
  );
}
