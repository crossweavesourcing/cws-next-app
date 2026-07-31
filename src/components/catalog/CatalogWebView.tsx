'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { CatalogScenePage, SerializedCatalogDocument } from '@/types/catalog';
import { generateCatalogMarkdown, isAllowedCloudinaryUrl, isSafeCatalogLink } from '@/lib/catalog-documents';

type PdfJs = typeof import('pdfjs-dist');

function LegacyCatalogView({ catalog }: { catalog: SerializedCatalogDocument }) {
  const allowed = new Set(catalog.pages.map((page) => page.secureUrl));
  const markdown = generateCatalogMarkdown(catalog.pages) === catalog.markdown ? catalog.markdown : '';
  if (!markdown) return <p className="p-8 text-center text-sm text-neutral-500">This catalog cannot be displayed.</p>;
  return <div className="mx-auto w-full max-w-[1600px] bg-white leading-none">
    <ReactMarkdown allowedElements={['p', 'img']} unwrapDisallowed components={{
      p: ({ children }) => <span className="block leading-none">{children}</span>,
      img: ({ src, alt }) => {
        if (typeof src !== 'string' || !allowed.has(src) || !isAllowedCloudinaryUrl(src)) return null;
        const page = catalog.pages.find((item) => item.secureUrl === src); if (!page) return null;
        return <img src={src} alt={alt ?? `Catalog page ${page.pageNumber}`} width={page.width} height={page.height} loading={page.pageNumber === 1 ? 'eager' : 'lazy'} className="block h-auto w-full" />;
      },
    }}>{markdown}</ReactMarkdown>
  </div>;
}

function SceneOverlay({ scene, viewport, pdfjs }: { scene: CatalogScenePage; viewport: ReturnType<PDFPageProxy['getViewport']>; pdfjs: PdfJs }) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label={`Selectable text for page ${scene.pageNumber}`}>
    {scene.text.map((item, index) => {
      const matrix = pdfjs.Util.transform(viewport.transform, item.transform);
      return <span key={index} className="pointer-events-auto absolute whitespace-pre text-transparent selection:bg-blue-300/60" style={{
        left: 0, top: 0, fontFamily: item.fontFamily, fontWeight: item.fontWeight, fontStyle: item.italic ? 'italic' : 'normal',
        transformOrigin: '0 0', transform: `matrix(${matrix.join(',')})`, fontSize: '1px', lineHeight: 1,
      }}>{item.content}</span>;
    })}
    {scene.links.map((link, index) => {
      if (!isSafeCatalogLink(link.url)) return null;
      const [x1, y1] = viewport.convertToViewportPoint(link.rect[0], link.rect[1]);
      const [x2, y2] = viewport.convertToViewportPoint(link.rect[2], link.rect[3]);
      return <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Open link from catalog page ${scene.pageNumber}`} className="pointer-events-auto absolute outline-offset-2 hover:bg-blue-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600" style={{ left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }} />;
    })}
  </div>;
}

function CanvasPage({ document, scene, pdfjs }: { document: PDFDocumentProxy; scene: CatalogScenePage; pdfjs: PdfJs }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(scene.pageNumber === 1);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = shellRef.current; if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { rootMargin: '1200px 0px' });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = shellRef.current; if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    document.getPage(scene.pageNumber).then((value) => { if (active) setPage(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [document, scene.pageNumber, visible, attempt]);

  const baseViewport = page?.getViewport({ scale: 1 });
  const scale = baseViewport && width ? width / baseViewport.width : 1;
  const viewport = page?.getViewport({ scale });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!page || !canvas || !width) return;
    const renderViewport = page.getViewport({ scale });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(renderViewport.width * outputScale); canvas.height = Math.floor(renderViewport.height * outputScale);
    canvas.style.width = `${renderViewport.width}px`; canvas.style.height = `${renderViewport.height}px`;
    const context = canvas.getContext('2d', { alpha: false }); if (!context) return;
    const task = page.render({ canvas, canvasContext: context, viewport: renderViewport, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0] });
    task.promise.then(() => setFailed(false)).catch(() => setFailed(true));
    return () => { task.cancel(); };
  }, [page, scale, width]);

  const aspectRatio = `${scene.width} / ${scene.height}`;
  return <div ref={shellRef} className="relative w-full bg-white" style={{ aspectRatio }}>
    {visible && <canvas ref={canvasRef} className="block h-full w-full" aria-label={`Catalog page ${scene.pageNumber}`} />}
    {viewport && <SceneOverlay scene={scene} viewport={viewport} pdfjs={pdfjs} />}
    {failed && <div className="absolute inset-0 flex items-center justify-center bg-white"><button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }} className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase text-neutral-800">Retry page</button></div>}
  </div>;
}

function SceneCatalogView({ catalog, sourceUrl }: { catalog: SerializedCatalogDocument; sourceUrl: string }) {
  const [pdfjs, setPdfjs] = useState<PdfJs | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | null = null;
    void import('pdfjs-dist').then(async (library) => {
      library.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      task = library.getDocument({ url: sourceUrl });
      const loaded = await task.promise;
      if (active) { setPdfjs(library); setDocument(loaded); }
      else await task.destroy();
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (task) void task.destroy(); };
  }, [sourceUrl, attempt]);

  if (failed) return <div className="flex min-h-64 items-center justify-center bg-white"><button type="button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }} className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase text-neutral-800">Retry catalog</button></div>;
  if (!document || !pdfjs || !catalog.scene) return <div className="flex min-h-64 items-center justify-center bg-white text-sm text-neutral-500">Loading catalog…</div>;
  return <div className="mx-auto w-full max-w-[1600px] bg-white">{catalog.scene.pages.map((page) => <CanvasPage key={page.pageNumber} document={document} scene={page} pdfjs={pdfjs} />)}</div>;
}

export function CatalogWebView({ catalog, sourceUrl }: { catalog: SerializedCatalogDocument; sourceUrl?: string }) {
  if (catalog.sceneVersion === 1 && catalog.scene && sourceUrl) return <SceneCatalogView catalog={catalog} sourceUrl={sourceUrl} />;
  return <LegacyCatalogView catalog={catalog} />;
}
