'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, FileText, LoaderCircle, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import type { SerializedCatalogDocument } from '@/types/catalog';
import type { CatalogActionFailure } from '@/lib/catalog-errors';
import { DEFAULT_CATALOG_PDF_MAX_BYTES, formatFileSize, validateCatalogPdfFile } from '@/lib/catalog-file';
import {
  deleteCatalogAction,
  finalizeCatalogCreateAction,
  getCatalogOptionsAction,
  initializeCatalogUploadAction,
  listCatalogsAction,
  replaceCatalogPdfAction,
  setCatalogPublishedAction,
  updateCatalogAssociationsAction,
  updateCatalogMetadataAction,
} from '@/auth/actions/catalog-document.actions';

type LockedAssociation = { kind: 'category' | 'product'; id: string; name: string };
type Option = { id: string; name: string };
type OperationStage = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
type UploadParameters = { uploadUrl: string; apiKey: string; timestamp: number; signature: string; publicId: string; context: string };

class BrowserUploadError extends Error {
  constructor(message: string) { super(message); this.name = 'BrowserUploadError'; }
}

function uploadPdf(file: File, upload: UploadParameters, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', upload.uploadUrl);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    request.onerror = () => reject(new BrowserUploadError('Upload failed. Check your connection and try again.'));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) return resolve();
      let reason: unknown = null;
      try { reason = JSON.parse(request.responseText) as unknown; } catch { /* Cloudinary may return a non-JSON gateway response. */ }
      const message = typeof reason === 'object' && reason && 'error' in reason
        ? (reason as { error?: { message?: string } }).error?.message?.toLowerCase() ?? ''
        : '';
      if (message.includes('file size') || request.status === 413) return reject(new BrowserUploadError('The PDF exceeds the storage upload limit.'));
      if (request.status === 401 || request.status === 403) return reject(new BrowserUploadError('The upload authorization expired or was rejected. Close the dialog and try again.'));
      if (message.includes('invalid image') || message.includes('format')) return reject(new BrowserUploadError('Cloud storage did not recognize this file as a PDF.'));
      return reject(new BrowserUploadError('Cloud storage could not accept the PDF. Try again.'));
    };
    const body = new FormData();
    body.set('file', file); body.set('api_key', upload.apiKey); body.set('timestamp', String(upload.timestamp));
    body.set('signature', upload.signature); body.set('public_id', upload.publicId); body.set('context', upload.context); body.set('type', 'authenticated');
    request.send(body);
  });
}

function actionError(result: CatalogActionFailure): string {
  return result.referenceId ? `${result.error} Reference: ${result.referenceId}` : result.error;
}

export function CatalogManager({ locked }: { locked: LockedAssociation }) {
  const [catalogs, setCatalogs] = useState<SerializedCatalogDocument[]>([]);
  const [options, setOptions] = useState<{ categories: Option[]; products: Option[] }>({ categories: [], products: [] });
  const [open, setOpen] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(locked.kind === 'category' ? locked.id : '');
  const [productId, setProductId] = useState(locked.kind === 'product' ? locked.id : '');
  const [stage, setStage] = useState<OperationStage>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pending = stage === 'uploading' || stage === 'processing';
  const fileValidation = validateCatalogPdfFile(selectedFile);
  const formReady = Boolean(replacingId || title.trim().length >= 2) && Boolean(categoryId || productId) && fileValidation.valid && !pending;

  const refresh = useCallback(async () => {
    const result = await listCatalogsAction(locked.kind === 'category' ? { categoryId: locked.id } : { productId: locked.id });
    if (result.success) setCatalogs(result.catalogs);
  }, [locked.id, locked.kind]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      listCatalogsAction(locked.kind === 'category' ? { categoryId: locked.id } : { productId: locked.id }),
      getCatalogOptionsAction(),
    ]).then(([catalogResult, optionsResult]) => {
      if (!active) return;
      if (catalogResult.success) setCatalogs(catalogResult.catalogs);
      if (optionsResult.success) setOptions(optionsResult);
    });
    return () => { active = false; };
  }, [locked.id, locked.kind]);

  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => event.key === 'Escape' && !pending && closeDialog();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });

  function resetDialog() {
    setSelectedFile(null); setTitle(''); setDescription(''); setError(''); setProgress(0); setStage('idle'); setDragActive(false);
    setCategoryId(locked.kind === 'category' ? locked.id : ''); setProductId(locked.kind === 'product' ? locked.id : '');
    if (fileRef.current) fileRef.current.value = '';
  }

  function openDialog(catalogId: string | null = null) { resetDialog(); setReplacingId(catalogId); setOpen(true); }
  function closeDialog() { if (pending) return; setOpen(false); setReplacingId(null); resetDialog(); }

  function chooseFile(file: File | null) {
    const validation = validateCatalogPdfFile(file);
    if (!validation.valid) { setSelectedFile(null); setError(validation.error); setStage('error'); if (fileRef.current) fileRef.current.value = ''; return; }
    setSelectedFile(file); setError(''); setStage('idle');
  }

  function openFilePicker() {
    if (!fileRef.current) return;
    fileRef.current.value = '';
    fileRef.current.click();
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCatalogPdfFile(selectedFile);
    if (!validation.valid) { setError(validation.error); setStage('error'); return; }
    if (!selectedFile) { setError('Choose a PDF file.'); setStage('error'); return; }
    if (!replacingId && title.trim().length < 2) { setError('Enter a catalog title.'); setStage('error'); return; }
    if (!categoryId && !productId) { setError('Choose a category, a product, or both.'); setStage('error'); return; }

    const input = {
      title: replacingId ? 'Catalog replacement' : title.trim(),
      description: replacingId ? '' : description.trim(),
      categoryId: categoryId || null,
      productId: productId || null,
    };
    setError(''); setProgress(0); setStage('processing');
    try {
      const initialized = await initializeCatalogUploadAction(input);
      if (!initialized.success) throw new BrowserUploadError(actionError(initialized));
      if (selectedFile.size > initialized.upload.maxBytes) throw new BrowserUploadError(`The PDF exceeds the ${formatFileSize(initialized.upload.maxBytes)} limit.`);
      setStage('uploading');
      await uploadPdf(selectedFile, initialized.upload, setProgress);
      setProgress(100); setStage('processing');
      const finalized = replacingId
        ? await replaceCatalogPdfAction(replacingId, initialized.upload.publicId)
        : await finalizeCatalogCreateAction(input, initialized.upload.publicId);
      if (!finalized.success) throw new BrowserUploadError(actionError(finalized));
      setStage('success'); await refresh(); setOpen(false); setReplacingId(null); resetDialog();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Catalog upload failed.'); setStage('error');
    }
  }

  async function publish(id: string, value: boolean) { setStage('processing'); const result = await setCatalogPublishedAction(id, value); if (!result.success) setError(actionError(result)); await refresh(); setStage(result.success ? 'idle' : 'error'); }
  async function remove(id: string) { if (!window.confirm('Delete this catalog and its PDF?')) return; setStage('processing'); const result = await deleteCatalogAction(id); if (!result.success) setError(actionError(result)); await refresh(); setStage(result.success ? 'idle' : 'error'); }
  async function edit(catalog: SerializedCatalogDocument) { const nextTitle = window.prompt('Catalog title', catalog.title); if (nextTitle === null) return; const nextDescription = window.prompt('Catalog description', catalog.description); if (nextDescription === null) return; setStage('processing'); const result = await updateCatalogMetadataAction(catalog._id, { title: nextTitle, description: nextDescription }); if (!result.success) setError(actionError(result)); await refresh(); setStage(result.success ? 'idle' : 'error'); }
  async function detach(catalog: SerializedCatalogDocument) { const other = locked.kind === 'category' ? catalog.productId : catalog.categoryId; if (!other || !window.confirm(`Detach this catalog from ${locked.name}?`)) return; setStage('processing'); const result = await updateCatalogAssociationsAction(catalog._id, { categoryId: locked.kind === 'category' ? null : catalog.categoryId, productId: locked.kind === 'product' ? null : catalog.productId }); if (!result.success) setError(actionError(result)); await refresh(); setStage(result.success ? 'idle' : 'error'); }

  return <section className="mt-8 border-t border-white/10 pt-7 text-white">
    <div className="flex items-center justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">PDF Catalogs</span><h3 className="mt-2 text-xl font-black uppercase">Documents</h3></div><button type="button" onClick={() => openDialog()} className="inline-flex h-10 items-center gap-2 bg-[#E02424] px-4 text-xs font-bold uppercase text-white"><Plus className="h-4 w-4" /> Add PDF</button></div>
    {error && !open && <p className="mt-4 border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    <div className="mt-5 space-y-3">{catalogs.length === 0 ? <div className="border border-dashed border-white/20 p-6 text-center text-sm text-neutral-400"><FileText className="mx-auto mb-2 h-6 w-6" />No catalogs attached to {locked.name}.</div> : catalogs.map((catalog) => <article key={catalog._id} className="border border-white/10 bg-white/[0.04] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-white">{catalog.title}</h4><span className={`px-2 py-1 text-[9px] font-bold uppercase ${catalog.status === 'published' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{catalog.status}</span></div><p className="mt-1 text-xs text-neutral-400">{catalog.asset.originalFilename} · {catalog.pages.length} pages</p>{catalog.status === 'draft' && <p className="mt-2 text-xs font-medium text-amber-300">Draft catalogs are visible to administrators only. Publish to show this catalog on the public product page.</p>}{catalog.processingError && <p className="mt-2 text-xs text-red-300">{catalog.processingError}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/catalogs/${catalog._id}/preview`} className="border border-white/20 px-3 py-2 text-[10px] font-bold uppercase">Preview</Link><button disabled={pending} onClick={() => void edit(catalog)} className="border border-white/20 px-3 py-2 text-[10px] font-bold uppercase">Edit</button><button disabled={pending} onClick={() => openDialog(catalog._id)} className="border border-white/20 px-3 py-2 text-[10px] font-bold uppercase">Replace</button><button disabled={pending} onClick={() => void publish(catalog._id, catalog.status !== 'published')} className={`${catalog.status === 'draft' ? 'bg-[#E02424] text-white' : 'border border-white/20'} px-3 py-2 text-[10px] font-bold uppercase`}>{catalog.status === 'published' ? 'Unpublish' : 'Publish'}</button>{(locked.kind === 'category' ? catalog.productId : catalog.categoryId) && <button disabled={pending} onClick={() => void detach(catalog)} className="border border-white/20 px-3 py-2 text-[10px] font-bold uppercase">Detach</button>}<button disabled={pending} onClick={() => void remove(catalog._id)} className="px-3 py-2 text-[10px] font-bold uppercase text-red-300">Delete</button></div></div></article>)}</div>

    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}><div role="dialog" aria-modal="true" aria-labelledby="catalog-dialog-title" className="flex h-[min(92dvh,760px)] w-full max-w-2xl flex-col overflow-hidden border border-neutral-700 bg-[#101010] shadow-2xl"><div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4"><div><span className="text-[10px] font-bold uppercase text-[#E02424]">{replacingId ? 'Replace document' : 'New document'}</span><h3 id="catalog-dialog-title" className="mt-1 text-xl font-black uppercase">PDF Catalog</h3></div><button type="button" aria-label="Close catalog dialog" disabled={pending} onClick={closeDialog} className="p-2 text-neutral-400 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button></div>
      <form onSubmit={create} className="flex h-full min-h-0 flex-col"><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">{!replacingId && <><label className="block text-xs font-bold uppercase text-neutral-400">Title<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-3 text-white" /></label><label className="block text-xs font-bold uppercase text-neutral-400">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} className="mt-2 w-full border border-white/10 bg-white/[0.06] p-3 text-white" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase text-neutral-400">Category<select disabled={locked.kind === 'category'} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 w-full border border-white/10 bg-[#181818] p-3 text-white disabled:opacity-60"><option value="">None</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-bold uppercase text-neutral-400">Product<select disabled={locked.kind === 'product'} value={productId} onChange={(event) => setProductId(event.target.value)} className="mt-2 w-full border border-white/10 bg-[#181818] p-3 text-white disabled:opacity-60"><option value="">None</option>{options.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></>}
        {selectedFile ? <div className="flex items-center gap-4 border border-emerald-500/30 bg-emerald-500/[0.08] p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center bg-emerald-500/15 text-emerald-300"><FileCheck2 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{selectedFile.name}</p><p className="mt-1 text-xs text-emerald-300">{formatFileSize(selectedFile.size)} · Ready to upload</p></div><button type="button" disabled={pending} onClick={openFilePicker} aria-label="Replace selected PDF" title="Replace PDF" className="p-2 text-neutral-300 hover:text-white"><RefreshCw className="h-4 w-4" /></button><button type="button" disabled={pending} onClick={() => chooseFile(null)} aria-label="Remove selected PDF" title="Remove PDF" className="p-2 text-red-300 hover:text-red-200"><Trash2 className="h-4 w-4" /></button></div> : <button type="button" onClick={openFilePicker} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); chooseFile(event.dataTransfer.files[0] ?? null); }} className={`flex w-full flex-col items-center border-2 border-dashed p-8 text-neutral-300 transition-colors ${dragActive ? 'border-[#E02424] bg-[#E02424]/10' : 'border-white/20 hover:border-[#E02424]'}`}><Upload className="mb-3 h-7 w-7" /><span className="text-sm font-bold">Choose PDF</span><span className="mt-1 text-xs text-neutral-500">or drag and drop · up to {formatFileSize(DEFAULT_CATALOG_PDF_MAX_BYTES)}</span></button>}
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} className="sr-only" />
        {pending && <div aria-live="polite"><div className="mb-2 flex justify-between text-xs text-neutral-400"><span>{stage === 'uploading' ? 'Uploading PDF' : 'Validating and rendering pages'}</span><span>{stage === 'uploading' ? `${progress}%` : 'Please wait'}</span></div><div className="h-1 overflow-hidden bg-white/10"><div className={`h-full bg-[#E02424] ${stage === 'processing' ? 'w-1/3 animate-pulse' : ''}`} style={stage === 'uploading' ? { width: `${progress}%` } : undefined} /></div></div>}
        {error && <p role="alert" className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}</div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-white/10 bg-[#101010] p-4"><button type="button" disabled={pending} onClick={closeDialog} className="h-11 border border-white/20 px-5 text-xs font-bold uppercase disabled:opacity-40">Cancel</button><button disabled={!formReady} className="inline-flex h-11 items-center gap-2 bg-[#E02424] px-5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-40">{pending && <LoaderCircle className="h-4 w-4 animate-spin" />}{replacingId ? 'Replace PDF' : 'Create Catalog'}</button></div></form></div></div>}
  </section>;
}
