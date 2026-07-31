import ReactMarkdown from 'react-markdown';
import type { SerializedCatalogDocument } from '@/types/catalog';
import { generateCatalogMarkdown, isAllowedCloudinaryUrl } from '@/lib/catalog-documents';

export function CatalogWebView({ catalog }: { catalog: SerializedCatalogDocument }) {
  const allowed = new Set(catalog.pages.map((page) => page.secureUrl));
  const markdown = generateCatalogMarkdown(catalog.pages) === catalog.markdown ? catalog.markdown : '';
  if (!markdown) return <p className="p-8 text-center text-sm text-neutral-500">This catalog cannot be displayed.</p>;
  return <div className="mx-auto w-full max-w-[1600px] bg-white leading-none">
    <ReactMarkdown
      allowedElements={['p', 'img']}
      unwrapDisallowed
      components={{
        p: ({ children }) => <span className="block leading-none">{children}</span>,
        img: ({ src, alt }) => {
          if (typeof src !== 'string' || !allowed.has(src) || !isAllowedCloudinaryUrl(src)) return null;
          const page = catalog.pages.find((item) => item.secureUrl === src);
          if (!page) return null;
          return <img src={src} alt={alt ?? `Catalog page ${page.pageNumber}`} width={page.width} height={page.height} loading={page.pageNumber === 1 ? 'eager' : 'lazy'} className="block h-auto w-full" />;
        },
      }}
    >{markdown}</ReactMarkdown>
  </div>;
}
