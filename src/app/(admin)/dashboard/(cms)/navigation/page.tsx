"use client";

import { useEffect } from 'react';
import { useDashboardContext } from '../_components/DashboardContext';
import { NavigationPanel } from '../_components/DashboardComponents';

export default function NavigationRoute() {
  const { 
    setActiveWorkspace,
    enabledNavIds,
    toggleNavigationItem
  } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('navigation');
  }, [setActiveWorkspace]);

  return (
    <NavigationPanel
      enabledNavIds={enabledNavIds}
      onToggleNavigationItem={toggleNavigationItem}
    />
  );
}
