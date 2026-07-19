"use client";

import { useEffect } from 'react';
import { useDashboardContext } from '../_components/DashboardContext';
import { DesignSystemPanel } from '../_components/DashboardComponents';

export default function DesignRoute() {
  const { 
    setActiveWorkspace,
    enabledDesignSurfaceIds,
    toggleDesignSurface
  } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('design');
  }, [setActiveWorkspace]);

  return (
    <DesignSystemPanel
      enabledSurfaceIds={enabledDesignSurfaceIds}
      onToggleSurface={toggleDesignSurface}
    />
  );
}
