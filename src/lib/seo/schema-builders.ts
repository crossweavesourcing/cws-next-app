import type { ProductDocument } from '@/types/catalog';
import type { SectionContent } from '@/lib/section-definitions';

/**
 * Builds the global Organization schema.
 */
export function buildOrganizationSchema(appUrl: string, footerContent?: SectionContent) {
  // Try to parse the address. In a real system, you'd use structured fields.
  // We extract them safely based on what we found in `global-footer`.
  const orgName = 'Cross Weave Sourcing';
  
  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${appUrl}/#organization`,
    name: orgName,
    url: appUrl,
    logo: `${appUrl}/icon.png`,
  };

  const addressString = typeof footerContent?.bangladeshAddress === 'string' 
    ? footerContent.bangladeshAddress 
    : undefined;

  if (addressString) {
    organization.address = {
      '@type': 'PostalAddress',
      streetAddress: addressString,
      addressCountry: 'BD',
    };
  }

  // We explicitly omit phone numbers, email, and social profiles because they are not cleanly provided
  // as verified database primitives. We do not invent them.

  return organization;
}

/**
 * Builds the global WebSite schema.
 */
export function buildWebSiteSchema(appUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${appUrl}/#website`,
    url: appUrl,
    name: 'Cross Weave Sourcing',
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
export function buildProductSchema(product: ProductDocument, categoryName: string, appUrl: string) {
  const productUrl = `${appUrl}/products/${product.slug}`;
  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  
  // Filter out any non-absolute URLs (we'll ensure they are absolute just in case, but they usually are from Cloudinary)
  const validImages = images.map((img: string) => img.startsWith('http') ? img : `${appUrl}${img}`);

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

/**
 * Safely serializes JSON to HTML-safe string for use in <script type="application/ld+json">
 */
export function serializeJsonLd(schema: Record<string, unknown> | Record<string, unknown>[]) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
