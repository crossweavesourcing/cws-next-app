import type { CategoryDocument, ProductDocument } from '@/types/catalog';
import type { GlobalSettingsDocument } from '@/types/seo';

/**
 * Builds the global Organization schema.
 */
export function buildOrganizationSchema(appUrl: string, settings: GlobalSettingsDocument | null) {
  const orgName = settings?.organizationName || settings?.brandName || settings?.siteName || 'Cross Weave Sourcing';
  
  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${appUrl}/#organization`,
    name: orgName,
    url: settings?.organizationUrl || appUrl,
    logo: settings?.organizationLogo || `${appUrl}/icon.png`,
  };

  if (settings?.organizationLegalName) {
    organization.legalName = settings.organizationLegalName;
  }

  if (settings?.contactEmail) {
    organization.email = settings.contactEmail;
  }

  if (settings?.contactPhone) {
    organization.telephone = settings.contactPhone;
  }

  if (settings?.socialLinks && settings.socialLinks.length > 0) {
    organization.sameAs = settings.socialLinks;
  }

  if (settings?.contactAddress) {
    organization.address = {
      '@type': 'PostalAddress',
      streetAddress: settings.contactAddress,
      // For a truly global config we would split this out, but we provide it as a single string
    };
  }

  return organization;
}

/**
 * Builds the global WebSite schema.
 */
export function buildWebSiteSchema(appUrl: string, settings: GlobalSettingsDocument | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${appUrl}/#website`,
    url: appUrl,
    name: settings?.siteName || settings?.brandName || 'Cross Weave Sourcing',
    publisher: {
      '@id': `${appUrl}/#organization`,
    },
    // SearchAction intentionally omitted as there is no public search UI/route.
  };
}

/**
 * Builds a generic WebPage schema.
 */
export function buildWebPageSchema(appUrl: string, urlPath: string, name: string, description: string) {
  const url = `${appUrl}${urlPath}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: {
      '@id': `${appUrl}/#website`,
    },
    about: {
      '@id': `${appUrl}/#organization`,
    },
  };
}

/**
 * Builds the Product schema, mapping exact UI content and omitting missing fields.
 */
export function buildProductSchema(product: ProductDocument, categoryName: string, appUrl: string, settings: GlobalSettingsDocument | null) {
  const productUrl = `${appUrl}/products/${product.slug}`;
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  
  // Filter out any non-absolute URLs (we'll ensure they are absolute just in case, but they usually are from Cloudinary)
  const validImages = images.map((img: string) => img.startsWith('http') ? img : `${appUrl}${img}`);
  const brandName = settings?.brandName || settings?.organizationName || 'Cross Weave Sourcing';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    description: product.shortDescription,
    url: productUrl,
    image: validImages,
    category: categoryName,
    manufacturer: {
      '@id': `${appUrl}/#organization`,
    },
    brand: {
      '@type': 'Brand',
      name: brandName,
    }
  };

  // We add material if it's explicitly available in specifications.
  if (product.specifications?.material) {
    schema.material = product.specifications.material;
  }

  // INTENTIONAL OMISSIONS:
  // - offers: Price and availability are not tracked in `products.schema.ts`. Do not use 0 or fake stock.
  // - aggregateRating/review: Not present in DB. Do not invent.
  // - sku: Not tracked explicitly as a SKU in `products.schema.ts`. (Omit to prevent faking it).
  // - brand: Left out unless we definitively consider the company the brand (we used manufacturer instead).

  return schema;
}

/**
 * Builds the BreadcrumbList schema.
 */
export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@id': item.url,
        name: item.name,
      },
    })),
  };
}

export function buildCategoryCollectionSchema(category: CategoryDocument, products: ProductDocument[], appUrl: string) {
  const categoryUrl = `${appUrl}/categories/${category.slug}`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${categoryUrl}#webpage`,
    url: categoryUrl,
    name: category.seoOverrides?.title || category.name,
    description: category.seoOverrides?.description || category.description,
    isPartOf: {
      '@id': `${appUrl}/#website`,
    },
  };

  if (category.image) {
    schema.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: category.image.startsWith('http') ? category.image : `${appUrl}${category.image}`,
      caption: category.name,
    };
  }

  if (products.length > 0) {
    schema.mainEntity = {
      '@type': 'ItemList',
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${appUrl}/products/${product.slug}`,
        name: product.name,
      })),
    };
  }

  return schema;
}

/**
 * Safely serializes JSON to HTML-safe string for use in <script type="application/ld+json">
 */
export function serializeJsonLd(schema: Record<string, unknown> | Record<string, unknown>[]) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
