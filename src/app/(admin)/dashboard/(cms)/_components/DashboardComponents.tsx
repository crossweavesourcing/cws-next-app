"use client";

import type { ComponentType, ReactNode } from 'react';
import Image from 'next/image';
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Component,
  FileText,
  Film,
  Image as ImageIcon,
  Laptop,
  Layers,
  LogOut,
  Navigation,
  Package,
  Paintbrush,
  Palette,
  Pause,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Type,
} from 'lucide-react';
import {
  cmsCategoryDrafts,
  cmsDashboardMetrics,
  cmsDesignComponents,
  cmsDesignRecommendations,
  cmsDesignSurfaces,
  cmsDesignTokens,
  cmsLoginDevices,
  cmsLoginSessions,
  cmsMediaItems,
  cmsNavigationItems,
  cmsPageRecords,
  cmsReviewTasks,
  cmsSecurityRecommendations,
  cmsSections,
  dashboardProductSeed,
  type CmsNavigationGroup,
} from '@/lib/cms-dashboard';
import { productCategories, type ProductCategory } from '@/lib/products';

type WorkspaceKey = 'overview' | 'pages' | 'categories' | 'products' | 'navigation' | 'visibility' | 'media' | 'security' | 'design';

const navigationGroups: CmsNavigationGroup[] = [
  'Main Header',
  'Mobile Menu',
  'Footer About',
  'Footer Categories',
  'Social Links',
];



export function OverviewPanel({
  visibleSections,
  pausedSections,
  enabledNavItems,
}: {
  visibleSections: number;
  pausedSections: number;
  enabledNavItems: number;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cmsDashboardMetrics.map((metric) => {
          const value =
            metric.label === 'Paused Sections'
              ? String(pausedSections)
              : metric.label === 'Managed Pages'
                ? String(cmsPageRecords.length)
                : metric.value;

          return <MetricCard key={metric.label} metric={{ ...metric, value }} />;
        })}
      </div>

      <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          eyebrow="CMS Inventory"
          title="Website Management Surface"
          action={
            <span className="inline-flex min-h-9 items-center border border-neutral-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              {visibleSections} visible sections
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InventoryTile icon={FileText} label="Public Pages" value={String(cmsPageRecords.length)} helper="Root, products, detail template and global layout records" />
            <InventoryTile icon={Package} label="Product Records" value={String(dashboardProductSeed.length)} helper="Compatible with the current product library type" />
            <InventoryTile icon={Navigation} label="Navigation Items" value={String(enabledNavItems)} helper="Enabled mock links across header, footer and social groups" />
          </div>
          <div className="mt-5 border border-neutral-200 bg-[#F9F9F9] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-[#E02424]">
                  Publishing Status
                </span>
                <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-neutral-950">
                  UI controls are staged for future content persistence
                </h3>
              </div>
              <span className="inline-flex min-h-10 shrink-0 items-center justify-center border border-[#E02424] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
                {pausedSections} paused
              </span>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Review Queue" title="Needs Review">
          <div className="space-y-3">
            {cmsReviewTasks.map((task) => (
              <article key={task.id} className="border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="break-words text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
                    {task.priority}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    {task.page}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-800">{task.title}</p>
                <span className="mt-3 inline-flex border-t border-neutral-200 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                  Owner: {task.owner}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}

export function CategoryPanel({
  selectedCategory,
  onSelectCategory,
  visibleCategoryNames,
  onToggleCategory,
}: {
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  visibleCategoryNames: Set<ProductCategory>;
  onToggleCategory: (category: ProductCategory) => void;
}) {
  const selected = cmsCategoryDrafts.find((category) => category.name === selectedCategory) ?? cmsCategoryDrafts[0];

  return (
    <Panel eyebrow="Category Manager" title="Product Category Cards">
      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cmsCategoryDrafts.map((category) => {
            const isSelected = selectedCategory === category.name;
            const isVisible = visibleCategoryNames.has(category.name);

            return (
              <article
                key={category.name}
                className={`border bg-white transition-colors ${isSelected ? 'border-[#E02424]' : 'border-neutral-200 hover:border-[#E02424]/40'}`}
              >
                <button type="button" onClick={() => onSelectCategory(category.name)} className="block w-full text-left">
                  <div className="relative h-48 overflow-hidden bg-neutral-200">
                    <Image
                      src={category.image}
                      alt={`${category.name} category`}
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10" />
                    <span className="absolute left-4 top-4 max-w-[calc(100%-2rem)] break-words bg-[#E02424] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      {category.productCount} Products
                    </span>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex flex-col gap-2 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="break-words text-base font-black uppercase tracking-[0.1em] text-neutral-950">
                        {category.name}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isVisible ? 'text-[#E02424]' : 'text-neutral-400'}`}>
                        {isVisible ? 'Visible' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-600">{category.description}</p>
                  </div>
                </button>
              </article>
            );
          })}
        </div>

        <div className="border border-neutral-200 bg-[#101010] p-5 text-white">
          <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
            Selected Category
          </span>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-tight">{selected.name}</h3>
          <div className="mt-5 space-y-4">
            <ReadOnlyField label="Category Name" value={selected.name} dark />
            <ReadOnlyField label="Image Path" value={selected.image} dark breakMode="all" />
            <ReadOnlyTextarea label="Description" value={selected.description} dark />
            <div className="flex flex-col gap-4 border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <span className="block break-words text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Visibility
                </span>
                <span className="mt-1 block text-sm text-white">
                  {visibleCategoryNames.has(selected.name) ? 'Visible on public category cards' : 'Paused in CMS draft'}
                </span>
              </span>
              <ToggleButton
                active={visibleCategoryNames.has(selected.name)}
                onClick={() => onToggleCategory(selected.name)}
                activeLabel="Visible"
                inactiveLabel="Paused"
              />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function ProductPanel({
  selectedProductSlug,
  onSelectProduct,
  activeProductCategory,
  onSelectCategory,
  searchTerm,
  onSearchChange,
  filteredProducts,
}: {
  selectedProductSlug: string;
  onSelectProduct: (slug: string) => void;
  activeProductCategory: ProductCategory | 'All';
  onSelectCategory: (category: ProductCategory | 'All') => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredProducts: typeof dashboardProductSeed;
}) {
  const selectedProduct = dashboardProductSeed.find((product) => product.slug === selectedProductSlug) ?? dashboardProductSeed[0];

  return (
    <Panel eyebrow="Product Manager" title="Products, Descriptions And Media">
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <label className="relative block">
            <span className="sr-only">Search product records</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search products"
              className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] pl-11 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {productCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className={`min-h-9 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  activeProductCategory === category
                    ? 'border-[#E02424] bg-[#E02424] text-white'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#E02424]/50 hover:text-[#E02424]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="max-h-[680px] overflow-y-auto border border-neutral-200 bg-white">
            {filteredProducts.map((product) => (
              <button
                key={product.slug}
                type="button"
                onClick={() => onSelectProduct(product.slug)}
                className={`grid w-full grid-cols-[64px_1fr] gap-4 border-b border-neutral-200 p-3 text-left transition-colors last:border-b-0 ${
                  selectedProduct.slug === product.slug ? 'bg-[#E02424]/5' : 'hover:bg-[#F9F9F9]'
                }`}
              >
                <span className="relative h-16 overflow-hidden bg-neutral-200">
                  <Image
                    src={product.images[0] ?? product.image}
                    alt={product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-sm font-bold uppercase tracking-[0.08em] text-neutral-950">
                    {product.name}
                  </span>
                  <span className="mt-1 block break-words text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
                    {product.category}
                  </span>
                  <span className="mt-2 block break-words text-xs leading-relaxed text-neutral-500">
                    {product.shortDescription}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4 border border-neutral-200 bg-[#F9F9F9] p-5">
              <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
                Product Editor
              </span>
              <h3 className="break-words text-2xl font-black uppercase tracking-tight text-neutral-950">
                {selectedProduct.name}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ReadOnlyField label="Slug" value={selectedProduct.slug} />
                <ReadOnlyField label="Category" value={selectedProduct.category} />
              </div>
              <ReadOnlyTextarea label="Short Description" value={selectedProduct.shortDescription} />
              <ReadOnlyTextarea label="Overview" value={selectedProduct.overview} />
            </div>

            <div className="border border-neutral-200 bg-white p-5">
              <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
                Primary Media
              </span>
              <div className="relative mt-4 h-60 overflow-hidden bg-neutral-200">
                <Image
                  src={selectedProduct.images[0] ?? selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  sizes="260px"
                  className="object-cover"
                />
              </div>
              <ReadOnlyField label="Image Path" value={selectedProduct.images[0] ?? selectedProduct.image} compact breakMode="all" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ListEditor title="Manufacturing" items={selectedProduct.manufacturing} />
            <ListEditor title="Features" items={selectedProduct.features} />
          </div>

          <PanelLite title="Specifications">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(selectedProduct.specifications).map(([label, value]) => (
                <ReadOnlyField key={label} label={label.replace(/([A-Z])/g, ' $1')} value={value} />
              ))}
            </div>
          </PanelLite>

          <PanelLite title="Gallery And Video Slots">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {selectedProduct.images.map((image, index) => (
                <MediaThumb key={`${image}-${index}`} src={image} title={`Gallery ${index + 1}`} usage={selectedProduct.name} />
              ))}
              <VideoSlot title="Product process video" />
            </div>
          </PanelLite>
        </div>
      </div>
    </Panel>
  );
}

export function NavigationPanel({
  enabledNavIds,
  onToggleNavigationItem,
}: {
  enabledNavIds: Set<string>;
  onToggleNavigationItem: (itemId: string) => void;
}) {
  return (
    <Panel eyebrow="Navigation Manager" title="Navigation Labels And Links">
      <div className="space-y-5">
        {navigationGroups.map((group) => {
          const items = cmsNavigationItems.filter((item) => item.group === group);

          return (
            <div key={group} className="border border-neutral-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-neutral-200 bg-neutral-950 px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
                <h3 className="break-words text-sm font-black uppercase tracking-[0.14em]">{group}</h3>
                <span className="break-words text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  {items.filter((item) => enabledNavIds.has(item.id)).length} Enabled
                </span>
              </div>
              <div className="divide-y divide-neutral-200">
                {items.map((item) => (
                  <div key={item.id} className="grid min-w-0 grid-cols-1 gap-4 p-5 2xl:grid-cols-[70px_minmax(0,1fr)_minmax(0,1.2fr)_120px] 2xl:items-center">
                    <ReadOnlyField label="Order" value={String(item.order).padStart(2, '0')} compact />
                    <ReadOnlyField label="Label" value={item.label} compact />
                    <ReadOnlyField label="Link" value={item.href} compact breakMode="all" />
                    <div className="2xl:justify-self-end">
                      <ToggleButton
                        active={enabledNavIds.has(item.id)}
                        onClick={() => onToggleNavigationItem(item.id)}
                        activeLabel="Enabled"
                        inactiveLabel="Paused"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function VisibilityPanel({
  pausedSectionIds,
  onToggleSection,
}: {
  pausedSectionIds: Set<string>;
  onToggleSection: (sectionId: string) => void;
}) {
  return (
    <Panel
      eyebrow="Visibility Control"
      title="Pause Any Public Section"
      action={
        <span className="inline-flex min-h-9 items-center border border-[#E02424] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
          UI only
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        {cmsPageRecords.map((page) => {
          const pageSections = cmsSections.filter((section) => section.pageKey === page.key);

          return (
            <section key={page.key} className="border border-neutral-200 bg-white">
              <div className="flex flex-col gap-2 border-b border-neutral-200 bg-[#F9F9F9] px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="block break-all text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
                    {page.route}
                  </span>
                  <h3 className="mt-1 break-words text-base font-black uppercase tracking-[0.1em] text-neutral-950">
                    {page.label}
                  </h3>
                </div>
                <span className="break-words text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  {pageSections.length} Sections
                </span>
              </div>
              <div className="divide-y divide-neutral-200">
                {pageSections.map((section) => (
                  <div key={section.id} className="grid min-w-0 grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_140px_120px] xl:items-center">
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-bold uppercase tracking-[0.1em] text-neutral-950">
                        {section.label}
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{section.summary}</p>
                    </div>
                    <span className={`inline-flex min-h-9 items-center justify-center border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      pausedSectionIds.has(section.id)
                        ? 'border-[#E02424]/40 bg-[#E02424]/10 text-[#E02424]'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}>
                      {pausedSectionIds.has(section.id) ? 'Paused' : 'Visible'}
                    </span>
                    <div className="xl:justify-self-end">
                      <ToggleButton
                        active={!pausedSectionIds.has(section.id)}
                        onClick={() => onToggleSection(section.id)}
                        activeLabel="Live"
                        inactiveLabel="Paused"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

export function MediaPanel() {
  const imageItems = cmsMediaItems.filter((item) => item.type === 'image');
  const videoItems = cmsMediaItems.filter((item) => item.type === 'video');

  return (
    <Panel eyebrow="Media Library" title="Photos, Gallery Assets And Videos">
      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {imageItems.slice(0, 15).map((item) => (
              <MediaThumb key={item.id} src={item.src} title={item.title} usage={item.usage} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <PanelLite title="Video Placeholders" dark>
            <div className="space-y-3">
              {videoItems.map((item) => (
                <div key={item.id} className="border border-white/10 bg-white/[0.04] p-4 text-white">
                  <div className="flex h-28 items-center justify-center border border-dashed border-white/20 bg-black/20">
                    <Film className="h-8 w-8 text-[#E02424]" />
                  </div>
                  <h4 className="mt-4 text-sm font-bold uppercase tracking-[0.12em]">{item.title}</h4>
                  <p className="mt-2 break-all text-xs leading-relaxed text-neutral-400">{item.src}</p>
                </div>
              ))}
            </div>
          </PanelLite>
        </div>
      </div>
    </Panel>
  );
}

export function SecurityPanel({
  revokedDeviceIds,
  endedSessionIds,
  onToggleDeviceAccess,
  onToggleSession,
}: {
  revokedDeviceIds: Set<string>;
  endedSessionIds: Set<string>;
  onToggleDeviceAccess: (deviceId: string) => void;
  onToggleSession: (sessionId: string) => void;
}) {
  const activeDeviceCount = cmsLoginDevices.filter((device) => !revokedDeviceIds.has(device.id)).length;
  const activeSessionCount = cmsLoginSessions.filter((session) => !endedSessionIds.has(session.id)).length;

  return (
    <Panel
      eyebrow="Account Security"
      title="Login Devices And Sessions"
      action={
        <span className="inline-flex min-h-9 items-center gap-2 border border-[#E02424] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
          <ShieldCheck className="h-4 w-4" />
          UI only
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SecurityMetricCard label="Trusted Devices" value={String(activeDeviceCount)} helper="Mock device access inventory" />
        <SecurityMetricCard label="Active Sessions" value={String(activeSessionCount)} helper="Browser sessions represented for future auth" tone="red" />
        <SecurityMetricCard label="Recommendations" value={String(cmsSecurityRecommendations.length)} helper="Suggested security sections for CMS admins" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <PanelLite title="Login Devices">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {cmsLoginDevices.map((device) => {
                const isRevoked = revokedDeviceIds.has(device.id);

                return (
                  <article key={device.id} className={`min-w-0 border p-5 ${isRevoked ? 'border-[#E02424]/30 bg-[#E02424]/5' : 'border-neutral-200 bg-white'}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span className="inline-flex h-11 w-11 items-center justify-center border border-neutral-200 bg-[#F9F9F9] text-[#E02424]">
                          {device.name.toLowerCase().includes('iphone') ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                        </span>
                        <h3 className="mt-4 break-words text-base font-black uppercase tracking-[0.1em] text-neutral-950">
                          {device.name}
                        </h3>
                        <p className="mt-2 break-words text-sm leading-relaxed text-neutral-600">{device.browser}</p>
                      </div>
                      <StatusPill label={device.current ? 'Current' : isRevoked ? 'Revoked' : device.trusted ? 'Trusted' : 'Review'} active={!isRevoked} />
                    </div>

                    <div className="mt-5 space-y-3 border-t border-neutral-200 pt-4">
                      <SecurityDetail icon={Navigation} label="Location" value={device.location} />
                      <SecurityDetail icon={Clock3} label="Last Active" value={device.lastActive} />
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleDeviceAccess(device.id)}
                      className={`mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                        isRevoked
                          ? 'border-neutral-950 bg-neutral-950 text-white hover:bg-[#E02424] hover:border-[#E02424]'
                          : 'border-[#E02424]/40 bg-[#E02424]/10 text-[#E02424] hover:border-[#E02424]'
                      }`}
                    >
                      {isRevoked ? <RefreshCcw className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      {isRevoked ? 'Restore Device' : 'Remove Device'}
                    </button>
                  </article>
                );
              })}
            </div>
          </PanelLite>

          <PanelLite title="Login Sessions">
            <div className="space-y-3">
              {cmsLoginSessions.map((session) => {
                const isEnded = endedSessionIds.has(session.id);

                return (
                  <article key={session.id} className="grid min-w-0 grid-cols-1 gap-4 border border-neutral-200 bg-white p-5 xl:grid-cols-[minmax(0,1fr)_128px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-950">
                          {session.device}
                        </h3>
                        <StatusPill label={isEnded ? 'Ended' : session.status} active={!isEnded && session.status !== 'Review'} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <SecurityDetail icon={Navigation} label="IP Address" value={session.ipAddress} />
                        <SecurityDetail icon={Clock3} label="Started" value={session.startedAt} />
                        <SecurityDetail icon={BellRing} label="Expires" value={session.expiresAt} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleSession(session.id)}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                        isEnded
                          ? 'border-neutral-950 bg-neutral-950 text-white hover:bg-[#E02424] hover:border-[#E02424]'
                          : 'border-[#E02424]/40 bg-[#E02424]/10 text-[#E02424] hover:border-[#E02424]'
                      }`}
                    >
                      {isEnded ? <RefreshCcw className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      {isEnded ? 'Restore' : 'End'}
                    </button>
                  </article>
                );
              })}
            </div>
          </PanelLite>
        </section>

        <aside className="space-y-5">
          <PanelLite title="Access Methods" dark>
            <div className="space-y-3">
              <AccessMethodRow label="Email And Password" status="Enabled" />
              <AccessMethodRow label="Google Sign-In" status="Prepared" />
              <AccessMethodRow label="Two-Factor Login" status="Recommended" />
              <AccessMethodRow label="Admin Approval" status="Recommended" />
            </div>
          </PanelLite>

          <PanelLite title="Recommended Sections">
            <div className="space-y-3">
              {cmsSecurityRecommendations.map((item) => (
                <article key={item.id} className="border border-neutral-200 bg-[#F9F9F9] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-950">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm leading-relaxed text-neutral-600">{item.summary}</p>
                </article>
              ))}
            </div>
          </PanelLite>

          <PanelLite title="Audit Preview">
            <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
              <p className="break-words">Future backend should record login attempts, device approvals, ended sessions and Google account changes.</p>
              <p className="break-words">High-impact CMS actions should require a fresh session before publishing or pausing sections.</p>
            </div>
          </PanelLite>
        </aside>
      </div>
    </Panel>
  );
}

export function DesignSystemPanel({
  enabledSurfaceIds,
  onToggleSurface,
}: {
  enabledSurfaceIds: Set<string>;
  onToggleSurface: (surfaceId: string) => void;
}) {
  const colorTokens = cmsDesignTokens.filter((token) => token.group === 'Color');
  const systemTokens = cmsDesignTokens.filter((token) => token.group !== 'Color');

  return (
    <Panel
      eyebrow="Design System"
      title="Full Application Visual Controls"
      action={
        <span className="inline-flex min-h-9 items-center gap-2 border border-[#E02424] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
          <Paintbrush className="h-4 w-4" />
          UI only
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <DesignMetricCard icon={Palette} label="Design Tokens" value={String(cmsDesignTokens.length)} helper="Colors, fonts, spacing, radius and shadows" />
        <DesignMetricCard icon={Component} label="Components" value={String(cmsDesignComponents.length)} helper="Public, dashboard and global UI patterns" tone="red" />
        <DesignMetricCard icon={ImageIcon} label="Section Themes" value={String(cmsDesignSurfaces.length)} helper="Public pages, dashboard and login surfaces" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <PanelLite title="Brand Color Tokens">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {colorTokens.map((token) => (
                <article key={token.id} className="min-w-0 border border-neutral-200 bg-white p-4">
                  <div
                    className="h-20 border border-neutral-200"
                    style={{ backgroundColor: token.value.startsWith('#') ? token.value : '#F9F9F9' }}
                  />
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-950">{token.name}</h3>
                      <span className="break-all text-[10px] font-bold uppercase tracking-[0.12em] text-[#E02424]">{token.value}</span>
                    </div>
                    <p className="break-words text-xs leading-relaxed text-neutral-600">{token.usage}</p>
                  </div>
                </article>
              ))}
            </div>
          </PanelLite>

          <PanelLite title="Typography, Spacing And Shape Tokens">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {systemTokens.map((token) => (
                <DesignTokenRow key={token.id} token={token} />
              ))}
            </div>
          </PanelLite>

          <PanelLite title="Application Component Library">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {cmsDesignComponents.map((component) => (
                <article key={component.id} className="min-w-0 border border-neutral-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">{component.area}</span>
                      <h3 className="mt-2 break-words text-base font-black uppercase tracking-[0.1em] text-neutral-950">{component.name}</h3>
                      <p className="mt-2 break-words text-sm leading-relaxed text-neutral-600">{component.usage}</p>
                    </div>
                    <StatusPill label={component.status} active={component.status === 'Approved'} />
                  </div>
                  <ul className="mt-5 space-y-2 border-t border-neutral-200 pt-4">
                    {component.rules.map((rule) => (
                      <li key={rule} className="flex gap-3 text-sm leading-relaxed text-neutral-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E02424]" />
                        <span className="break-words">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </PanelLite>

          <PanelLite title="Section Theme Controls">
            <div className="space-y-3">
              {cmsDesignSurfaces.map((surface) => {
                const enabled = enabledSurfaceIds.has(surface.id);

                return (
                  <article key={surface.id} className="grid min-w-0 grid-cols-1 gap-4 border border-neutral-200 bg-white p-5 xl:grid-cols-[minmax(0,1fr)_128px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <span className="block break-words text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">{surface.pageArea}</span>
                          <h3 className="mt-2 break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-950">{surface.name}</h3>
                        </div>
                        <StatusPill label={enabled ? 'Enabled' : 'Paused'} active={enabled} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <DesignValue label="Background" value={surface.background} />
                        <DesignValue label="Text" value={surface.text} />
                        <DesignValue label="Accent" value={surface.accent} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleSurface(surface.id)}
                      className={`inline-flex min-h-10 items-center justify-center gap-2 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                        enabled
                          ? 'border-neutral-950 bg-neutral-950 text-white hover:bg-[#E02424] hover:border-[#E02424]'
                          : 'border-[#E02424]/40 bg-[#E02424]/10 text-[#E02424] hover:border-[#E02424]'
                      }`}
                    >
                      {enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {enabled ? 'Pause' : 'Enable'}
                    </button>
                  </article>
                );
              })}
            </div>
          </PanelLite>
        </section>

        <aside className="space-y-5">
          <PanelLite title="Design Governance" dark>
            <div className="space-y-3">
              <AccessMethodRow label="Brand Red" status="Locked" />
              <AccessMethodRow label="Square Corners" status="Locked" />
              <AccessMethodRow label="Responsive Stacking" status="Required" />
              <AccessMethodRow label="Image First Cards" status="Public Site" />
            </div>
          </PanelLite>

          <PanelLite title="Recommended Design Sections">
            <div className="space-y-3">
              {cmsDesignRecommendations.map((item) => (
                <article key={item.id} className="border border-neutral-200 bg-[#F9F9F9] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-950">{item.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">{item.priority}</span>
                  </div>
                  <p className="mt-3 break-words text-sm leading-relaxed text-neutral-600">{item.summary}</p>
                </article>
              ))}
            </div>
          </PanelLite>

          <PanelLite title="Preview Rules">
            <div className="space-y-3 text-sm leading-relaxed text-neutral-600">
              <p className="break-words">Future implementation should preview token changes against home, product listing, product detail, login and dashboard surfaces.</p>
              <p className="break-words">Any CMS-driven design change should preserve text contrast, responsive wrapping and existing brand red usage.</p>
            </div>
          </PanelLite>
        </aside>
      </div>
    </Panel>
  );
}

export function PreviewPanel({
  activeWorkspace,
  selectedPage,
  selectedProduct,
  selectedCategory,
  pausedSections,
  visibleSections,
  enabledNavItems,
}: {
  activeWorkspace: WorkspaceKey;
  selectedPage: (typeof cmsPageRecords)[number];
  selectedProduct: (typeof dashboardProductSeed)[number];
  selectedCategory: (typeof cmsCategoryDrafts)[number];
  pausedSections: number;
  visibleSections: number;
  enabledNavItems: number;
}) {
  return (
    <aside className="min-w-0 space-y-5 2xl:sticky 2xl:top-28 2xl:self-start">
      <div className="border border-neutral-200 bg-[#101010] text-white">
        <div className="border-b border-white/10 p-5">
          <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
            Live Preview Reference
          </span>
          <h3 className="mt-2 text-xl font-black uppercase tracking-tight">Selected CMS Context</h3>
        </div>

        <div className="space-y-5 p-5">
          {activeWorkspace === 'products' ? (
            <>
              <div className="relative h-72 overflow-hidden bg-neutral-800">
                <Image
                  src={selectedProduct.images[0] ?? selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  sizes="360px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/15" />
              </div>
              <PreviewMeta eyebrow={selectedProduct.category} title={selectedProduct.name} body={selectedProduct.shortDescription} />
            </>
          ) : activeWorkspace === 'categories' ? (
            <>
              <div className="relative h-72 overflow-hidden bg-neutral-800">
                <Image
                  src={selectedCategory.image}
                  alt={selectedCategory.name}
                  fill
                  sizes="360px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/15" />
              </div>
              <PreviewMeta eyebrow="Category" title={selectedCategory.name} body={selectedCategory.description} />
            </>
          ) : (
            <PreviewMeta eyebrow={selectedPage.route} title={selectedPage.label} body={selectedPage.description} />
          )}

          <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-5 sm:grid-cols-3 2xl:grid-cols-1">
            <StatusMiniCard label="Visible" value={String(visibleSections)} />
            <StatusMiniCard label="Paused" value={String(pausedSections)} tone="red" />
            <StatusMiniCard label="Links" value={String(enabledNavItems)} />
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-5">
        <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
          Admin Notes
        </span>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          This dashboard is a static CMS interface draft. Tabs, toggles, filters and selected records update locally for layout review only.
        </p>
      </div>
    </aside>
  );
}

export function Panel({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border border-neutral-200 bg-white">
      <div className="flex min-w-0 flex-col gap-4 border-b border-neutral-200 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">{eyebrow}</span>
          <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-tight text-neutral-950">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PanelLite({
  title,
  children,
  dark = false,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={`min-w-0 border p-5 ${dark ? 'border-white/10 bg-[#101010] text-white' : 'border-neutral-200 bg-white'}`}>
      <h3 className={`mb-4 break-words text-sm font-black uppercase tracking-[0.14em] ${dark ? 'text-white' : 'text-neutral-950'}`}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function MetricCard({ metric }: { metric: (typeof cmsDashboardMetrics)[number] }) {
  const toneClass =
    metric.tone === 'red'
      ? 'bg-[#E02424] text-white border-[#E02424]'
      : metric.tone === 'dark'
        ? 'bg-[#101010] text-white border-[#101010]'
        : 'bg-white text-neutral-950 border-neutral-200';

  return (
    <article className={`min-h-40 min-w-0 border p-5 ${toneClass}`}>
      <span className={`break-words text-[10px] font-bold uppercase tracking-[0.16em] ${metric.tone === 'neutral' ? 'text-[#E02424]' : 'text-white/70'}`}>
        {metric.label}
      </span>
      <strong className="mt-4 block text-4xl font-black uppercase tracking-tight">{metric.value}</strong>
      <p className={`mt-4 break-words text-xs leading-relaxed ${metric.tone === 'neutral' ? 'text-neutral-500' : 'text-white/75'}`}>
        {metric.helper}
      </p>
    </article>
  );
}

export function InventoryTile({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="min-w-0 border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <Icon className="h-5 w-5 text-[#E02424]" />
        <span className="text-3xl font-black tracking-tight text-neutral-950">{value}</span>
      </div>
      <h3 className="mt-4 break-words text-sm font-black uppercase tracking-[0.12em] text-neutral-950">{label}</h3>
      <p className="mt-2 break-words text-sm leading-relaxed text-neutral-600">{helper}</p>
    </article>
  );
}

export function SecurityMetricCard({
  label,
  value,
  helper,
  tone = 'dark',
}: {
  label: string;
  value: string;
  helper: string;
  tone?: 'dark' | 'red';
}) {
  return (
    <article className={`min-w-0 border p-5 ${tone === 'red' ? 'border-[#E02424] bg-[#E02424] text-white' : 'border-[#101010] bg-[#101010] text-white'}`}>
      <span className="block break-words text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</span>
      <strong className="mt-4 block text-3xl font-black tracking-tight">{value}</strong>
      <p className="mt-3 break-words text-xs leading-relaxed text-white/75">{helper}</p>
    </article>
  );
}

export function DesignMetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = 'dark',
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  tone?: 'dark' | 'red';
}) {
  return (
    <article className={`min-w-0 border p-5 ${tone === 'red' ? 'border-[#E02424] bg-[#E02424] text-white' : 'border-[#101010] bg-[#101010] text-white'}`}>
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Icon className="h-5 w-5 shrink-0 text-white/75" />
        <strong className="text-3xl font-black tracking-tight">{value}</strong>
      </div>
      <span className="mt-4 block break-words text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</span>
      <p className="mt-3 break-words text-xs leading-relaxed text-white/75">{helper}</p>
    </article>
  );
}

export function DesignTokenRow({ token }: { token: (typeof cmsDesignTokens)[number] }) {
  const Icon = token.group === 'Typography' ? Type : token.group === 'Spacing' ? Layers : token.group === 'Radius' ? Component : Paintbrush;

  return (
    <article className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)] gap-4 border border-neutral-200 bg-white p-4">
      <span className="flex h-11 w-11 items-center justify-center border border-neutral-200 bg-[#F9F9F9] text-[#E02424]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="break-words text-sm font-black uppercase tracking-[0.1em] text-neutral-950">{token.name}</h3>
          <span className="break-all text-[10px] font-bold uppercase tracking-[0.12em] text-[#E02424]">{token.value}</span>
        </div>
        <p className="mt-2 break-words text-xs leading-relaxed text-neutral-600">{token.usage}</p>
        <span className="mt-3 inline-flex min-h-7 items-center border border-neutral-200 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500">
          {token.locked ? 'Locked Token' : 'Editable Later'}
        </span>
      </div>
    </article>
  );
}

export function DesignValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-neutral-200 bg-[#F9F9F9] p-3">
      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <span className="mt-1 block break-words text-xs leading-relaxed text-neutral-900">{value}</span>
    </div>
  );
}

export function SecurityDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#E02424]" />
        {label}
      </span>
      <span className="mt-1 block break-words text-xs leading-relaxed text-neutral-800">{value}</span>
    </div>
  );
}

export function AccessMethodRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="break-words text-xs font-bold uppercase tracking-[0.12em] text-white">{label}</span>
      <span className="break-words text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">{status}</span>
    </div>
  );
}

export function ToggleButton({
  active,
  onClick,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  onClick: () => void;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-2 border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] transition-colors sm:min-w-28 ${
        active
          ? 'border-neutral-950 bg-neutral-950 text-white hover:bg-[#E02424] hover:border-[#E02424]'
          : 'border-[#E02424]/40 bg-[#E02424]/10 text-[#E02424] hover:border-[#E02424]'
      }`}
    >
      {active ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

export function StatusPill({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <span className={`inline-flex min-h-9 items-center justify-center border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] ${
      active ? 'border-neutral-200 bg-[#F9F9F9] text-neutral-700' : 'border-[#E02424]/40 bg-[#E02424]/10 text-[#E02424]'
    }`}>
      {label}
    </span>
  );
}

export function StatusMiniCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'red' }) {
  return (
    <div className={`min-w-0 border p-3 ${tone === 'red' ? 'border-[#E02424]/35 bg-[#E02424]/10 text-[#E02424]' : 'border-white/10 bg-white/[0.04] text-white'}`}>
      <span className="block break-words text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">{label}</span>
      <strong className="mt-1 block text-xl font-black">{value}</strong>
    </div>
  );
}

export function ReadOnlyField({
  label,
  value,
  dark = false,
  compact = false,
  breakMode = 'words',
}: {
  label: string;
  value: string;
  dark?: boolean;
  compact?: boolean;
  breakMode?: 'words' | 'all';
}) {
  return (
    <div className="block min-w-0">
      <span className={`block break-words text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        {label}
      </span>
      <span
        className={`mt-2 flex min-h-11 w-full items-center border px-3 py-2 leading-relaxed outline-none ${compact ? 'text-xs' : 'text-sm'} ${breakMode === 'all' ? 'break-all' : 'break-words'} ${
          dark
            ? 'border-white/10 bg-white/[0.04] text-white'
            : 'border-neutral-200 bg-white text-neutral-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function ReadOnlyTextarea({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className={`block break-words text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
        {label}
      </span>
      <textarea
        readOnly
        value={value}
        rows={4}
        className={`mt-2 w-full resize-none border px-3 py-3 text-sm leading-relaxed outline-none ${
          dark
            ? 'border-white/10 bg-white/[0.04] text-white'
            : 'border-neutral-200 bg-white text-neutral-900'
        }`}
      />
    </label>
  );
}

export function ListEditor({ title, items }: { title: string; items: string[] }) {
  return (
    <PanelLite title={title}>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item} className="grid min-w-0 grid-cols-[34px_minmax(0,1fr)] gap-3">
            <span className="flex h-9 items-center justify-center bg-[#E02424] text-[10px] font-black text-white">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-h-9 w-full break-words border border-neutral-200 bg-[#F9F9F9] px-3 py-2 text-sm leading-relaxed text-neutral-900">
              {item}
            </div>
          </div>
        ))}
      </div>
    </PanelLite>
  );
}

export function MediaThumb({ src, title, usage }: { src: string; title: string; usage: string }) {
  return (
    <article className="min-w-0 border border-neutral-200 bg-white">
      <div className="relative h-44 overflow-hidden bg-neutral-200">
        <Image src={src} alt={title} fill sizes="(max-width: 768px) 100vw, 260px" className="object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">
          <ImageIcon className="h-3.5 w-3.5" />
          Image
        </span>
        <h4 className="break-words text-sm font-bold uppercase tracking-[0.08em] text-neutral-950">{title}</h4>
        <p className="break-words text-xs leading-relaxed text-neutral-500">{usage}</p>
      </div>
    </article>
  );
}

export function VideoSlot({ title }: { title: string }) {
  return (
    <article className="min-w-0 border border-dashed border-neutral-300 bg-[#F9F9F9]">
      <div className="flex h-44 items-center justify-center bg-neutral-100">
        <Film className="h-9 w-9 text-[#E02424]" />
      </div>
      <div className="p-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E02424]">Video</span>
        <h4 className="mt-2 break-words text-sm font-bold uppercase tracking-[0.08em] text-neutral-950">{title}</h4>
      </div>
    </article>
  );
}

export function PreviewMeta({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div>
      <span className="block break-all text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">{eyebrow}</span>
      <h3 className="mt-2 break-words text-2xl font-black uppercase tracking-tight leading-none sm:text-3xl">{title}</h3>
      <p className="mt-4 break-words text-sm leading-relaxed text-neutral-300">{body}</p>
    </div>
  );
}
