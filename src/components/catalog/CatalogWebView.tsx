import type { SerializedCatalogDocument } from '@/types/catalog';
import { isAllowedCloudinaryUrl } from '@/lib/catalog-documents';
import Image from 'next/image';

export function CatalogWebView({ catalog }: { catalog: SerializedCatalogDocument; sourceUrl?: string }) {
  const pages = [...catalog.pages]
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .filter((page, index) => page.pageNumber === index + 1 && page.width > 0 && page.height > 0 && isAllowedCloudinaryUrl(page.secureUrl));

  if (pages.length !== catalog.pages.length || pages.length === 0) {
    return <p className="p-8 text-center text-sm text-neutral-500">This catalog cannot be displayed.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] bg-white leading-none">
      {pages.map((page) => (
        <Image
          key={page.pageNumber}
          src={page.secureUrl}
          alt={`Catalog page ${page.pageNumber}`}
          width={page.width}
          height={page.height}
          priority={page.pageNumber === 1}
          loading={page.pageNumber === 1 ? undefined : 'lazy'}
          className="block h-auto w-full"
          sizes="100vw"
        />
      ))}
    </div>
  );
}
