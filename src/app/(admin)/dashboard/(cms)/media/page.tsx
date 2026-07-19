"use client";

import { useEffect } from 'react';
import { useDashboardContext } from '../_components/DashboardContext';
import { MediaPanel } from '../_components/DashboardComponents';

export default function MediaRoute() {
  const { setActiveWorkspace } = useDashboardContext();

  useEffect(() => {
    setActiveWorkspace('media');
  }, [setActiveWorkspace]);

  return <MediaPanel />;
}
