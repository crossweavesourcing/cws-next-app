"use client";

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  cmsCategoryDrafts,
  cmsNavigationItems,
  cmsPageRecords,
  cmsSections,
  cmsDesignSurfaces,
  dashboardProductSeed,
  type CmsPageKey,
} from '@/lib/cms-dashboard';
import type { ProductCategory } from '@/lib/products';

type WorkspaceKey = 'overview' | 'pages' | 'categories' | 'products' | 'navigation' | 'visibility' | 'media' | 'security' | 'design';

interface DashboardContextType {
  activeWorkspace: WorkspaceKey;
  setActiveWorkspace: (key: WorkspaceKey) => void;
  selectedPageKey: CmsPageKey;
  setSelectedPageKey: (key: CmsPageKey) => void;
  selectedProductSlug: string;
  setSelectedProductSlug: (slug: string) => void;
  selectedCategory: ProductCategory;
  setSelectedCategory: (category: ProductCategory) => void;
  activeProductCategory: ProductCategory | 'All';
  setActiveProductCategory: (category: ProductCategory | 'All') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  pausedSectionIds: Set<string>;
  toggleSection: (id: string) => void;
  visibleCategoryNames: Set<ProductCategory>;
  toggleCategory: (name: ProductCategory) => void;
  enabledNavIds: Set<string>;
  toggleNavigationItem: (id: string) => void;
  revokedDeviceIds: Set<string>;
  toggleDeviceAccess: (id: string) => void;
  endedSessionIds: Set<string>;
  toggleSession: (id: string) => void;
  enabledDesignSurfaceIds: Set<string>;
  toggleDesignSurface: (id: string) => void;

  // Derived state
  selectedProduct: (typeof dashboardProductSeed)[0];
  selectedCategoryDraft: (typeof cmsCategoryDrafts)[0];
  selectedPage: (typeof cmsPageRecords)[0];
  visibleSections: typeof cmsSections;
  pausedSections: typeof cmsSections;
  filteredPageSections: typeof cmsSections;
  filteredProducts: typeof dashboardProductSeed;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>('overview');
  const [selectedPageKey, setSelectedPageKey] = useState<CmsPageKey>('home');
  const [selectedProductSlug, setSelectedProductSlug] = useState(dashboardProductSeed[0]?.slug ?? '');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(cmsCategoryDrafts[0]?.name ?? 'Knit');
  const [activeProductCategory, setActiveProductCategory] = useState<ProductCategory | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pausedSectionIds, setPausedSectionIds] = useState(() =>
    new Set(cmsSections.filter((section) => section.paused).map((section) => section.id)),
  );
  const [visibleCategoryNames, setVisibleCategoryNames] = useState(() =>
    new Set(cmsCategoryDrafts.filter((category) => category.visible).map((category) => category.name)),
  );
  const [enabledNavIds, setEnabledNavIds] = useState(() =>
    new Set(cmsNavigationItems.filter((item) => item.enabled).map((item) => item.id)),
  );
  const [revokedDeviceIds, setRevokedDeviceIds] = useState(() => new Set<string>());
  const [endedSessionIds, setEndedSessionIds] = useState(() => new Set<string>());
  const [enabledDesignSurfaceIds, setEnabledDesignSurfaceIds] = useState(() =>
    new Set(cmsDesignSurfaces.filter((surface) => surface.enabled).map((surface) => surface.id)),
  );

  const selectedProduct = dashboardProductSeed.find((product) => product.slug === selectedProductSlug) ?? dashboardProductSeed[0];
  const selectedCategoryDraft = cmsCategoryDrafts.find((category) => category.name === selectedCategory) ?? cmsCategoryDrafts[0];
  const selectedPage = cmsPageRecords.find((page) => page.key === selectedPageKey) ?? cmsPageRecords[0];

  const visibleSections = cmsSections.filter((section) => !pausedSectionIds.has(section.id));
  const pausedSections = cmsSections.filter((section) => pausedSectionIds.has(section.id));
  const filteredPageSections = cmsSections.filter((section) => section.pageKey === selectedPageKey);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return dashboardProductSeed.filter((product) => {
      const categoryMatches = activeProductCategory === 'All' || product.category === activeProductCategory;
      const searchMatches =
        !normalizedSearch ||
        [product.name, product.slug, product.category, product.shortDescription, product.overview].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        );
      return categoryMatches && searchMatches;
    });
  }, [activeProductCategory, searchTerm]);

  function toggleSection(sectionId: string) {
    setPausedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function toggleCategory(categoryName: ProductCategory) {
    setVisibleCategoryNames((current) => {
      const next = new Set(current);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  }

  function toggleNavigationItem(itemId: string) {
    setEnabledNavIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleDeviceAccess(deviceId: string) {
    setRevokedDeviceIds((current) => {
      const next = new Set(current);
      if (next.has(deviceId)) next.delete(deviceId);
      else next.add(deviceId);
      return next;
    });
  }

  function toggleSession(sessionId: string) {
    setEndedSessionIds((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function toggleDesignSurface(surfaceId: string) {
    setEnabledDesignSurfaceIds((current) => {
      const next = new Set(current);
      if (next.has(surfaceId)) next.delete(surfaceId);
      else next.add(surfaceId);
      return next;
    });
  }

  const value = {
    activeWorkspace, setActiveWorkspace,
    selectedPageKey, setSelectedPageKey,
    selectedProductSlug, setSelectedProductSlug,
    selectedCategory, setSelectedCategory,
    activeProductCategory, setActiveProductCategory,
    searchTerm, setSearchTerm,
    pausedSectionIds, toggleSection,
    visibleCategoryNames, toggleCategory,
    enabledNavIds, toggleNavigationItem,
    revokedDeviceIds, toggleDeviceAccess,
    endedSessionIds, toggleSession,
    enabledDesignSurfaceIds, toggleDesignSurface,
    selectedProduct, selectedCategoryDraft, selectedPage,
    visibleSections, pausedSections, filteredPageSections, filteredProducts
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}
