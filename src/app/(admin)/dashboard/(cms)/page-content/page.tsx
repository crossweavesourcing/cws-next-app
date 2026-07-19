"use client";

import { useEffect } from 'react';
import { useDashboardContext } from '../_components/DashboardContext';
import { PageContentPanel } from '../_components/DashboardComponents';

export default function PageContentRoute() {
  const { 
    setActiveWorkspace,
    selectedPageKey,
    setSelectedPageKey,
    filteredPageSections,
    pausedSectionIds,
    toggleSection 
  } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('pages');
  }, [setActiveWorkspace]);

  return (
    <PageContentPanel
      selectedPageKey={selectedPageKey}
      onSelectPage={setSelectedPageKey}
      sections={filteredPageSections}
      pausedSectionIds={pausedSectionIds}
      onToggleSection={toggleSection}
    />
  );
}
