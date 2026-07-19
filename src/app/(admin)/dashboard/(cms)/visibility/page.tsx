"use client";

import { useEffect } from 'react';
import { useDashboardContext } from '../_components/DashboardContext';
import { VisibilityPanel } from '../_components/DashboardComponents';

export default function VisibilityRoute() {
  const { 
    setActiveWorkspace,
    pausedSectionIds,
    toggleSection
  } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('visibility');
  }, [setActiveWorkspace]);

  return (
    <VisibilityPanel
      pausedSectionIds={pausedSectionIds}
      onToggleSection={toggleSection}
    />
  );
}
