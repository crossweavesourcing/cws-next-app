import type { CatalogDocument, CategoryDocument, ProductDocument } from '@/types/catalog';
import type { GlobalSettingsDocument, PageSeoDocument, RedirectDocument } from '@/types/seo';

export type SeoHealthSeverity = 'error' | 'warning' | 'recommendation' | 'info';

export type SeoHealthFinding = {
  severity: SeoHealthSeverity;
  module: string;
  target: string;
  message: string;
};

type SeoHealthInput = {
  settings: GlobalSettingsDocument | null;
  pageSeos: PageSeoDocument[];
  products: ProductDocument[];
  categories: CategoryDocument[];
  catalogs: CatalogDocument[];
  redirects: RedirectDocument[];
};

function effectiveTitle(entity: { name?: string; title?: string; seoOverrides?: { title?: string } }) {
  return entity.seoOverrides?.title || entity.title || entity.name || '';
}

function effectiveDescription(entity: { description?: string; shortDescription?: string; seoOverrides?: { description?: string } }) {
  return entity.seoOverrides?.description || entity.description || entity.shortDescription || '';
}

function addDuplicateFindings(findings: SeoHealthFinding[], module: string, values: Array<{ value: string; target: string }>, label: string) {
  const seen = new Map<string, string[]>();
  for (const item of values) {
    const key = item.value.trim().toLowerCase();
    if (!key) continue;
    seen.set(key, [...(seen.get(key) ?? []), item.target]);
  }
  for (const targets of seen.values()) {
    if (targets.length > 1) {
      findings.push({ severity: 'warning', module, target: targets.join(', '), message: `Duplicate ${label}.` });
    }
  }
}

export function buildSeoHealthFindings(input: SeoHealthInput): SeoHealthFinding[] {
  const findings: SeoHealthFinding[] = [];

  if (!input.settings?.defaultSeoTitle) findings.push({ severity: 'warning', module: 'Global SEO', target: 'Global settings', message: 'Default SEO title is missing.' });
  if (!input.settings?.defaultSeoDescription) findings.push({ severity: 'warning', module: 'Global SEO', target: 'Global settings', message: 'Default meta description is missing.' });
  if (!input.settings?.defaultSocialImage) findings.push({ severity: 'recommendation', module: 'Social Sharing', target: 'Global settings', message: 'Default social image is missing.' });
  if (!input.settings?.organizationName && !input.settings?.brandName) findings.push({ severity: 'warning', module: 'Structured Data', target: 'Organization', message: 'Organization name source is missing.' });

  const publishedProducts = input.products.filter((product) => product.visible);
  const visibleCategories = input.categories.filter((category) => category.visible);
  const publishedCatalogs = input.catalogs.filter((catalog) => catalog.status === 'published');

  for (const product of publishedProducts) {
    const title = effectiveTitle(product);
    const description = effectiveDescription(product);
    if (!title) findings.push({ severity: 'error', module: 'Product SEO', target: product.slug, message: 'Published product is missing an SEO title source.' });
    if (!description) findings.push({ severity: 'error', module: 'Product SEO', target: product.slug, message: 'Published product is missing a meta description source.' });
    if (!product.imageAltText && product.imagesAltText?.some((alt) => !alt)) findings.push({ severity: 'warning', module: 'Media SEO', target: product.slug, message: 'Product image alt text needs review.' });
    if (!product.categoryId) findings.push({ severity: 'warning', module: 'Internal Linking', target: product.slug, message: 'Published product has no category.' });
    if (product.seoOverrides?.noindex) findings.push({ severity: 'info', module: 'Indexing', target: product.slug, message: 'Published product is marked noindex.' });
  }

  for (const category of visibleCategories) {
    if (!effectiveDescription(category)) findings.push({ severity: 'warning', module: 'Category SEO', target: category.slug, message: 'Visible category is missing descriptive content.' });
    if (category.seoOverrides?.noindex) findings.push({ severity: 'info', module: 'Indexing', target: category.slug, message: 'Visible category is marked noindex.' });
  }

  for (const catalog of publishedCatalogs) {
    if (!effectiveTitle(catalog)) findings.push({ severity: 'error', module: 'Catalog SEO', target: catalog.slug, message: 'Published catalog is missing an SEO title source.' });
    if (!effectiveDescription(catalog)) findings.push({ severity: 'warning', module: 'Catalog SEO', target: catalog.slug, message: 'Published catalog is missing a meta description source.' });
    if (catalog.seoOverrides?.noindex) findings.push({ severity: 'info', module: 'Indexing', target: catalog.slug, message: 'Published catalog is marked noindex.' });
  }

  addDuplicateFindings(findings, 'Dynamic Metadata', [
    ...publishedProducts.map((item) => ({ value: effectiveTitle(item), target: `/products/${item.slug}` })),
    ...visibleCategories.map((item) => ({ value: effectiveTitle(item), target: `/categories/${item.slug}` })),
    ...publishedCatalogs.map((item) => ({ value: effectiveTitle(item), target: `/catalogs/${item.slug}` })),
    ...input.pageSeos.map((item) => ({ value: item.title ?? '', target: item.path })),
  ], 'title');

  addDuplicateFindings(findings, 'Dynamic Metadata', [
    ...publishedProducts.map((item) => ({ value: effectiveDescription(item), target: `/products/${item.slug}` })),
    ...visibleCategories.map((item) => ({ value: effectiveDescription(item), target: `/categories/${item.slug}` })),
    ...publishedCatalogs.map((item) => ({ value: effectiveDescription(item), target: `/catalogs/${item.slug}` })),
    ...input.pageSeos.map((item) => ({ value: item.description ?? '', target: item.path })),
  ], 'description');

  for (const redirect of input.redirects.filter((item) => item.active)) {
    if (redirect.source === redirect.destination) findings.push({ severity: 'error', module: 'Redirects', target: redirect.source, message: 'Redirect points to itself.' });
    if (input.redirects.some((item) => item.active && item.source === redirect.destination)) findings.push({ severity: 'error', module: 'Redirects', target: redirect.source, message: 'Redirect creates a chain.' });
  }

  return findings;
}

export function seoHealthScore(findings: SeoHealthFinding[]) {
  const penalty = findings.reduce((total, finding) => {
    if (finding.severity === 'error') return total + 12;
    if (finding.severity === 'warning') return total + 5;
    if (finding.severity === 'recommendation') return total + 2;
    return total;
  }, 0);
  return Math.max(0, 100 - penalty);
}
