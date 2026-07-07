import {
  categoryCards,
  productCategories,
  products,
  type Product,
  type ProductCategory,
} from '@/lib/products';

export type CmsPageKey = 'home' | 'products' | 'productDetail' | 'header' | 'footer';

export type CmsSectionStatus = 'Live' | 'Draft' | 'Review';

export type CmsSection = {
  id: string;
  pageKey: CmsPageKey;
  label: string;
  route: string;
  status: CmsSectionStatus;
  paused: boolean;
  summary: string;
  lastEdited: string;
};

export type CmsNavigationGroup = 'Main Header' | 'Mobile Menu' | 'Footer About' | 'Footer Categories' | 'Social Links';

export type CmsNavigationItem = {
  id: string;
  label: string;
  href: string;
  group: CmsNavigationGroup;
  enabled: boolean;
  order: number;
};

export type CmsMediaItem = {
  id: string;
  type: 'image' | 'video';
  src: string;
  title: string;
  usage: string;
};

export type CmsDashboardMetric = {
  label: string;
  value: string;
  helper: string;
  tone: 'dark' | 'red' | 'neutral';
};

export type CmsReviewTask = {
  id: string;
  title: string;
  owner: string;
  page: string;
  priority: 'High' | 'Medium' | 'Low';
};

export type CmsCategoryDraft = {
  name: ProductCategory;
  description: string;
  image: string;
  productCount: number;
  visible: boolean;
};

export type CmsPageRecord = {
  key: CmsPageKey;
  label: string;
  route: string;
  description: string;
};

export type CmsLoginDevice = {
  id: string;
  name: string;
  browser: string;
  location: string;
  lastActive: string;
  trusted: boolean;
  current: boolean;
};

export type CmsLoginSession = {
  id: string;
  device: string;
  ipAddress: string;
  startedAt: string;
  expiresAt: string;
  status: 'Active' | 'Idle' | 'Review';
};

export type CmsSecurityRecommendation = {
  id: string;
  title: string;
  summary: string;
  priority: 'High' | 'Medium' | 'Low';
};

export type CmsDesignToken = {
  id: string;
  group: 'Color' | 'Typography' | 'Spacing' | 'Radius' | 'Shadow';
  name: string;
  value: string;
  usage: string;
  locked: boolean;
};

export type CmsDesignComponent = {
  id: string;
  name: string;
  area: 'Public Site' | 'Dashboard' | 'Global';
  status: 'Approved' | 'Review' | 'Draft';
  usage: string;
  rules: string[];
};

export type CmsDesignSurface = {
  id: string;
  name: string;
  pageArea: string;
  background: string;
  text: string;
  accent: string;
  enabled: boolean;
};

export type CmsDesignRecommendation = {
  id: string;
  title: string;
  summary: string;
  priority: 'High' | 'Medium' | 'Low';
};

const enabledHeaderItems = [
  { label: 'About Us', href: '/#about' },
  { label: 'What We Do', href: '/#what-we-do' },
  { label: 'Company Strategy', href: '/#strategy' },
  { label: 'Products', href: '/#products' },
  { label: 'Corporate Responsibility', href: '/#responsibility' },
];

export const cmsPageRecords: CmsPageRecord[] = [
  {
    key: 'home',
    label: 'Home Page',
    route: '/',
    description: 'Primary CWS landing page with hero, company content, services, products and contact sections.',
  },
  {
    key: 'products',
    label: 'Products Listing',
    route: '/products',
    description: 'Manufacturing portfolio landing page with search, category filters and product cards.',
  },
  {
    key: 'productDetail',
    label: 'Product Detail Template',
    route: '/products/[slug]',
    description: 'Reusable product detail template for gallery, overview, specifications, features and related products.',
  },
  {
    key: 'header',
    label: 'Header Navigation',
    route: 'Global',
    description: 'Site-wide navigation shown on public pages.',
  },
  {
    key: 'footer',
    label: 'Footer Content',
    route: 'Global',
    description: 'Global footer with offices, site links, category links and social channels.',
  },
];

export const cmsSections: CmsSection[] = [
  {
    id: 'home-hero',
    pageKey: 'home',
    label: 'Hero Cover',
    route: '/#top',
    status: 'Live',
    paused: false,
    summary: 'End-to-end sourcing hero with animated SOURCE / CRAFT / DELIVER word treatment.',
    lastEdited: 'Jul 02, 2026',
  },
  {
    id: 'home-about',
    pageKey: 'home',
    label: 'About Us',
    route: '/#about',
    status: 'Live',
    paused: false,
    summary: 'Company introduction and why choose CWS content.',
    lastEdited: 'Jul 01, 2026',
  },
  {
    id: 'home-products',
    pageKey: 'home',
    label: 'Products Category Cards',
    route: '/#products',
    status: 'Live',
    paused: false,
    summary: 'Category card grid linked to product filters.',
    lastEdited: 'Jul 03, 2026',
  },
  {
    id: 'home-strategy',
    pageKey: 'home',
    label: 'Company Strategy',
    route: '/#strategy',
    status: 'Review',
    paused: false,
    summary: 'Strategy narrative paired with sourcing team image.',
    lastEdited: 'Jun 29, 2026',
  },
  {
    id: 'home-services',
    pageKey: 'home',
    label: 'Services Showcase',
    route: '/#services-showcase',
    status: 'Live',
    paused: false,
    summary: 'Alternating service panels for development, private label, production, costing, QC and logistics.',
    lastEdited: 'Jul 04, 2026',
  },
  {
    id: 'home-responsibility',
    pageKey: 'home',
    label: 'Corporate Responsibility',
    route: '/#responsibility',
    status: 'Live',
    paused: false,
    summary: 'Ethics, compliance and management overview.',
    lastEdited: 'Jun 27, 2026',
  },
  {
    id: 'home-contact',
    pageKey: 'home',
    label: 'Contact CTA And Form',
    route: '/#contracting',
    status: 'Draft',
    paused: true,
    summary: 'Direct sourcing channels, office contacts and inquiry form.',
    lastEdited: 'Jul 05, 2026',
  },
  {
    id: 'products-hero',
    pageKey: 'products',
    label: 'Products Hero',
    route: '/products',
    status: 'Live',
    paused: false,
    summary: 'Manufacturing capability hero with portfolio positioning.',
    lastEdited: 'Jul 02, 2026',
  },
  {
    id: 'products-portfolio',
    pageKey: 'products',
    label: 'All Products Portfolio',
    route: '/products#products',
    status: 'Live',
    paused: false,
    summary: 'Searchable and filterable product grid.',
    lastEdited: 'Jul 04, 2026',
  },
  {
    id: 'detail-hero',
    pageKey: 'productDetail',
    label: 'Product Gallery Hero',
    route: '/products/[slug]',
    status: 'Live',
    paused: false,
    summary: 'Image gallery and product overview header for every product detail page.',
    lastEdited: 'Jul 03, 2026',
  },
  {
    id: 'detail-overview',
    pageKey: 'productDetail',
    label: 'Product Overview',
    route: '/products/[slug]#overview',
    status: 'Live',
    paused: false,
    summary: 'Buyer program copy and manufacturing bullet cards.',
    lastEdited: 'Jul 03, 2026',
  },
  {
    id: 'detail-specs',
    pageKey: 'productDetail',
    label: 'Specifications And Features',
    route: '/products/[slug]#specifications',
    status: 'Live',
    paused: false,
    summary: 'Material, production focus, finishing, quality and feature list.',
    lastEdited: 'Jul 03, 2026',
  },
  {
    id: 'detail-gallery',
    pageKey: 'productDetail',
    label: 'Product Gallery Strip',
    route: '/products/[slug]#gallery',
    status: 'Review',
    paused: false,
    summary: 'Three-column visual gallery using the product media set.',
    lastEdited: 'Jul 01, 2026',
  },
  {
    id: 'detail-related',
    pageKey: 'productDetail',
    label: 'Related Products',
    route: '/products/[slug]#related-products',
    status: 'Live',
    paused: false,
    summary: 'Related products selected from the same category first.',
    lastEdited: 'Jul 02, 2026',
  },
  {
    id: 'detail-cta',
    pageKey: 'productDetail',
    label: 'Product Contact CTA',
    route: '/products/[slug]#contact',
    status: 'Draft',
    paused: true,
    summary: 'Category-specific contact prompt for buyer programs.',
    lastEdited: 'Jul 05, 2026',
  },
  {
    id: 'global-header',
    pageKey: 'header',
    label: 'Public Header',
    route: 'Global',
    status: 'Live',
    paused: false,
    summary: 'Logo, desktop navigation and mobile menu.',
    lastEdited: 'Jun 30, 2026',
  },
  {
    id: 'global-footer',
    pageKey: 'footer',
    label: 'Public Footer',
    route: 'Global',
    status: 'Live',
    paused: false,
    summary: 'Office addresses, navigation links, category links and social icons.',
    lastEdited: 'Jun 30, 2026',
  },
];

export const cmsCategoryDrafts: CmsCategoryDraft[] = categoryCards.map((category) => ({
  name: category.name,
  description: category.description,
  image: category.image,
  productCount: products.filter((product) => product.category === category.name).length,
  visible: true,
}));

export const cmsNavigationItems: CmsNavigationItem[] = [
  ...enabledHeaderItems.map((item, index) => ({
    id: `header-${index + 1}`,
    label: item.label,
    href: item.href,
    group: 'Main Header' as const,
    enabled: true,
    order: index + 1,
  })),
  ...enabledHeaderItems.map((item, index) => ({
    id: `mobile-${index + 1}`,
    label: item.label,
    href: item.href,
    group: 'Mobile Menu' as const,
    enabled: item.label !== 'Products',
    order: index + 1,
  })),
  { id: 'footer-about-1', label: 'Our Approach', href: '/#about', group: 'Footer About', enabled: true, order: 1 },
  { id: 'footer-about-2', label: 'What We Do', href: '/#what-we-do', group: 'Footer About', enabled: true, order: 2 },
  { id: 'footer-about-3', label: 'Company Strategy', href: '/#strategy', group: 'Footer About', enabled: true, order: 3 },
  { id: 'footer-about-4', label: 'Management', href: '/#responsibility', group: 'Footer About', enabled: true, order: 4 },
  ...productCategories
    .filter((category): category is ProductCategory => category !== 'All')
    .map((category, index) => ({
      id: `footer-category-${category.toLowerCase()}`,
      label: category,
      href: `/products?category=${encodeURIComponent(category)}`,
      group: 'Footer Categories' as const,
      enabled: true,
      order: index + 1,
    })),
  { id: 'social-linkedin', label: 'LinkedIn', href: 'https://linkedin.com', group: 'Social Links', enabled: true, order: 1 },
  { id: 'social-instagram', label: 'Instagram', href: 'https://instagram.com', group: 'Social Links', enabled: true, order: 2 },
  { id: 'social-facebook', label: 'Facebook', href: 'https://facebook.com', group: 'Social Links', enabled: true, order: 3 },
];

export const cmsMediaItems: CmsMediaItem[] = [
  {
    id: 'home-hero-image',
    type: 'image',
    src: '/assets/images/cws_hero_image.png',
    title: 'CWS hero collage',
    usage: 'Home hero',
  },
  {
    id: 'products-hero-image',
    type: 'image',
    src: '/assets/images/service_knit_woven_sweater_production.jpg',
    title: 'Manufacturing portfolio hero',
    usage: 'Products listing hero',
  },
  ...products.flatMap((product) =>
    product.images.map((image, index) => ({
      id: `${product.slug}-${index + 1}`,
      type: 'image' as const,
      src: image,
      title: `${product.name} media ${index + 1}`,
      usage: `${product.name} gallery`,
    })),
  ),
  {
    id: 'brand-overview-video',
    type: 'video',
    src: '/assets/videos/cws-overview-placeholder.mp4',
    title: 'Company overview video placeholder',
    usage: 'Future home page media',
  },
  {
    id: 'factory-process-video',
    type: 'video',
    src: '/assets/videos/factory-process-placeholder.mp4',
    title: 'Factory process video placeholder',
    usage: 'Future product detail media',
  },
];

export const cmsReviewTasks: CmsReviewTask[] = [
  {
    id: 'task-contact',
    title: 'Review contact CTA copy before connecting the form backend.',
    owner: 'Content',
    page: 'Home',
    priority: 'High',
  },
  {
    id: 'task-gallery',
    title: 'Confirm product gallery image order across detail pages.',
    owner: 'Merchandising',
    page: 'Product Detail',
    priority: 'Medium',
  },
  {
    id: 'task-nav',
    title: 'Align mobile menu links with the final public header set.',
    owner: 'Admin',
    page: 'Navigation',
    priority: 'Medium',
  },
  {
    id: 'task-video',
    title: 'Replace video placeholders when upload storage is selected.',
    owner: 'Media',
    page: 'Media Library',
    priority: 'Low',
  },
];

export const cmsLoginDevices: CmsLoginDevice[] = [
  {
    id: 'device-macbook-office',
    name: 'MacBook Pro',
    browser: 'Chrome on macOS',
    location: 'Chittagong, Bangladesh',
    lastActive: 'Active now',
    trusted: true,
    current: true,
  },
  {
    id: 'device-windows-office',
    name: 'Windows Workstation',
    browser: 'Edge on Windows',
    location: 'Dhaka, Bangladesh',
    lastActive: '2 hours ago',
    trusted: true,
    current: false,
  },
  {
    id: 'device-iphone',
    name: 'iPhone',
    browser: 'Safari on iOS',
    location: 'Somerdale, NJ, USA',
    lastActive: 'Yesterday',
    trusted: false,
    current: false,
  },
];

export const cmsLoginSessions: CmsLoginSession[] = [
  {
    id: 'session-current',
    device: 'MacBook Pro / Chrome',
    ipAddress: '103.145.12.84',
    startedAt: 'Jul 06, 2026 22:45',
    expiresAt: 'Jul 07, 2026 06:45',
    status: 'Active',
  },
  {
    id: 'session-merchandising',
    device: 'Windows Workstation / Edge',
    ipAddress: '103.145.12.91',
    startedAt: 'Jul 06, 2026 20:10',
    expiresAt: 'Jul 07, 2026 04:10',
    status: 'Idle',
  },
  {
    id: 'session-review',
    device: 'iPhone / Safari',
    ipAddress: '172.56.48.22',
    startedAt: 'Jul 05, 2026 18:30',
    expiresAt: 'Jul 06, 2026 02:30',
    status: 'Review',
  },
];

export const cmsSecurityRecommendations: CmsSecurityRecommendation[] = [
  {
    id: 'recommend-google',
    title: 'Connect Google Workspace sign-in',
    summary: 'Use company Google accounts as the primary CMS access method when backend authentication is added.',
    priority: 'High',
  },
  {
    id: 'recommend-two-factor',
    title: 'Require two-factor verification',
    summary: 'Add a second verification step for CMS users who can publish or pause public website sections.',
    priority: 'High',
  },
  {
    id: 'recommend-session-timeout',
    title: 'Set session expiry rules',
    summary: 'Auto-expire idle sessions and require re-authentication before high-impact content changes.',
    priority: 'Medium',
  },
  {
    id: 'recommend-audit-log',
    title: 'Add an admin audit log',
    summary: 'Track login attempts, device approvals, section pauses, product edits and navigation changes.',
    priority: 'Medium',
  },
];

export const cmsDesignTokens: CmsDesignToken[] = [
  {
    id: 'color-cws-red',
    group: 'Color',
    name: 'CWS Red',
    value: '#E02424',
    usage: 'Primary accent for CTAs, statuses, section labels and active states.',
    locked: true,
  },
  {
    id: 'color-ink',
    group: 'Color',
    name: 'Ink Black',
    value: '#101010',
    usage: 'Primary dark surface for dashboard panels, public CTAs and high-contrast blocks.',
    locked: true,
  },
  {
    id: 'color-paper',
    group: 'Color',
    name: 'Paper White',
    value: '#FFFFFF',
    usage: 'Main content surface, forms, tables and editable CMS panels.',
    locked: true,
  },
  {
    id: 'color-industrial',
    group: 'Color',
    name: 'Industrial Gray',
    value: '#EAEAEA',
    usage: 'Page bands, dashboard background and secondary public surfaces.',
    locked: false,
  },
  {
    id: 'font-body',
    group: 'Typography',
    name: 'Body Font',
    value: 'Inter',
    usage: 'Application default font for public pages, dashboard controls and forms.',
    locked: true,
  },
  {
    id: 'font-display',
    group: 'Typography',
    name: 'Display Font',
    value: 'Outfit',
    usage: 'Reserved display family for future large headings and campaign surfaces.',
    locked: false,
  },
  {
    id: 'spacing-panel',
    group: 'Spacing',
    name: 'Panel Padding',
    value: '20px / 32px',
    usage: 'Dashboard panel interiors and public content card spacing.',
    locked: false,
  },
  {
    id: 'radius-square',
    group: 'Radius',
    name: 'Square Industrial Corners',
    value: '0px',
    usage: 'Default CMS panels, buttons, cards and form controls.',
    locked: true,
  },
  {
    id: 'shadow-flat',
    group: 'Shadow',
    name: 'Flat Admin Surface',
    value: 'none',
    usage: 'Keep operational CMS UI crisp and border-led instead of soft or floating.',
    locked: true,
  },
];

export const cmsDesignComponents: CmsDesignComponent[] = [
  {
    id: 'component-header',
    name: 'Public Header',
    area: 'Global',
    status: 'Approved',
    usage: 'Sticky public navigation with black surface, logo and uppercase links.',
    rules: ['Use black background', 'Keep desktop nav uppercase', 'Do not show inside dashboard routes'],
  },
  {
    id: 'component-panel',
    name: 'CMS Panel',
    area: 'Dashboard',
    status: 'Approved',
    usage: 'Primary admin content container with section eyebrow, title and optional action.',
    rules: ['Use 1px neutral border', 'Use white surface', 'Stack actions on small screens'],
  },
  {
    id: 'component-toggle',
    name: 'CMS Toggle Button',
    area: 'Dashboard',
    status: 'Approved',
    usage: 'Mock state controls for visibility, devices, sessions and category status.',
    rules: ['Use black for enabled', 'Use red-tinted surface for paused or review', 'Keep label short'],
  },
  {
    id: 'component-product-card',
    name: 'Product Card',
    area: 'Public Site',
    status: 'Review',
    usage: 'Product/category preview cards using imagery, red labels and neutral content blocks.',
    rules: ['Keep image first', 'Use object-cover media', 'Wrap text on mobile'],
  },
  {
    id: 'component-form-field',
    name: 'Form Field',
    area: 'Global',
    status: 'Approved',
    usage: 'Inputs and display fields for login, contact and dashboard editing surfaces.',
    rules: ['Use 48px minimum control height', 'Use clear focus border', 'Wrap long readonly values'],
  },
];

export const cmsDesignSurfaces: CmsDesignSurface[] = [
  {
    id: 'surface-public-hero',
    name: 'Public Hero',
    pageArea: 'Home and Products',
    background: '#070707 with image overlay',
    text: '#FFFFFF',
    accent: '#E02424',
    enabled: true,
  },
  {
    id: 'surface-content-band',
    name: 'Content Band',
    pageArea: 'Public Sections',
    background: '#FFFFFF / #EAEAEA',
    text: '#1E1E1E',
    accent: '#E02424',
    enabled: true,
  },
  {
    id: 'surface-dashboard-shell',
    name: 'Dashboard Shell',
    pageArea: 'CMS Admin',
    background: '#EAEAEA',
    text: '#1E1E1E',
    accent: '#E02424',
    enabled: true,
  },
  {
    id: 'surface-dashboard-sidebar',
    name: 'Dashboard Sidebar',
    pageArea: 'CMS Admin',
    background: '#101010',
    text: '#FFFFFF',
    accent: '#E02424',
    enabled: true,
  },
  {
    id: 'surface-login',
    name: 'Login Access',
    pageArea: 'CMS Login',
    background: '#101010 with manufacturing image',
    text: '#FFFFFF / #1E1E1E',
    accent: '#E02424',
    enabled: true,
  },
];

export const cmsDesignRecommendations: CmsDesignRecommendation[] = [
  {
    id: 'design-token-source',
    title: 'Centralize design tokens',
    summary: 'Move repeated color, spacing and typography values into a shared token layer before backend CMS editing begins.',
    priority: 'High',
  },
  {
    id: 'design-component-library',
    title: 'Extract reusable admin components',
    summary: 'Promote Panel, PanelLite, ToggleButton, StatusPill and readonly fields into reusable dashboard UI components.',
    priority: 'High',
  },
  {
    id: 'design-contrast-audit',
    title: 'Run contrast checks',
    summary: 'Validate red-on-dark, gray-on-white and muted helper text against WCAG contrast expectations.',
    priority: 'Medium',
  },
  {
    id: 'design-responsive-rules',
    title: 'Document responsive rules',
    summary: 'Keep preview columns, tables, and dense editor panels stacked until enough width is available.',
    priority: 'Medium',
  },
];

export const cmsDashboardMetrics: CmsDashboardMetric[] = [
  {
    label: 'Managed Pages',
    value: String(cmsPageRecords.length),
    helper: 'Home, products, detail template and global layout content',
    tone: 'dark',
  },
  {
    label: 'Products',
    value: String(products.length),
    helper: 'Portfolio records from the current product library',
    tone: 'red',
  },
  {
    label: 'Categories',
    value: String(cmsCategoryDrafts.length),
    helper: 'Visible category cards on the public product surfaces',
    tone: 'neutral',
  },
  {
    label: 'Paused Sections',
    value: String(cmsSections.filter((section) => section.paused).length),
    helper: 'Mock pause controls staged for future publishing rules',
    tone: 'red',
  },
  {
    label: 'Media Items',
    value: String(cmsMediaItems.length),
    helper: 'Images and future video slots represented in the dashboard',
    tone: 'dark',
  },
];

export const dashboardProductSeed: Product[] = products;
