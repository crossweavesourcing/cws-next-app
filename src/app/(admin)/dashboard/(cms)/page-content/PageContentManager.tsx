'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Eye, FileText, Film, Image as ImageIcon, RefreshCcw, Save, UploadCloud } from 'lucide-react';
import { getSectionsAction, saveSectionAction } from '@/auth/actions/section.actions';
import { SECTION_DEFINITIONS, type SectionContent, type SectionDefinition, type SectionMedia } from '@/lib/section-definitions';
import { useDashboardContext } from '../_components/DashboardContext';

type AdminSection = {
  sectionId: string;
  pageKey: string;
  label: string;
  route: string;
  summary: string;
  paused: boolean;
  lastEdited: string;
  content: SectionContent;
  media: SectionMedia;
  definition?: SectionDefinition;
};

const pageOptions = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'products', label: 'Products', href: '/products' },
  { key: 'productDetail', label: 'Detail Template', href: '/products' },
  { key: 'header', label: 'Header', href: '/' },
  { key: 'footer', label: 'Footer', href: '/' },
] as const;

function getDefinition(section: AdminSection): SectionDefinition {
  return section.definition ?? SECTION_DEFINITIONS.find((item) => item.id === section.sectionId)!;
}

export default function PageContentManager() {
  const { setActiveWorkspace } = useDashboardContext();
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [pageKey, setPageKey] = useState<(typeof pageOptions)[number]['key']>('home');
  const [selectedId, setSelectedId] = useState('home-hero');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = async (preferredId?: string) => {
    setLoading(true);
    const result = await getSectionsAction();
    if (result.success) {
      const next = result.sections as AdminSection[];
      setSections(next);
      if (preferredId && next.some((section) => section.sectionId === preferredId)) setSelectedId(preferredId);
    } else {
      setFeedback({ tone: 'error', message: result.error });
    }
    setLoading(false);
  };

  useEffect(() => {
    setActiveWorkspace('pages');
    let active = true;
    getSectionsAction().then((result) => {
      if (!active) return;
      if (result.success) setSections(result.sections as AdminSection[]);
      else setFeedback({ tone: 'error', message: result.error });
      setLoading(false);
    });
    return () => { active = false; };
  }, [setActiveWorkspace]);

  const pageSections = sections.filter((section) => section.pageKey === pageKey);
  const selected = pageSections.find((section) => section.sectionId === selectedId) ?? pageSections[0];
  const activePage = pageOptions.find((page) => page.key === pageKey)!;

  const selectPage = (key: (typeof pageOptions)[number]['key']) => {
    setPageKey(key);
    const first = sections.find((section) => section.pageKey === key);
    if (first) setSelectedId(first.sectionId);
    setFeedback(null);
  };

  return (
    <section className="min-w-0 overflow-hidden border border-neutral-200 bg-white">
      <header className="border-b border-neutral-200 bg-white p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E02424]">Section-aware editor</span>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-neutral-950 md:text-3xl">Page Content</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">Edit the content, media, and visibility controls that belong to each public section.</p>
          </div>
          <Link href={activePage.href} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-900 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-950 transition-colors hover:bg-neutral-950 hover:text-white">
            View public page <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Public pages">
          {pageOptions.map((page) => {
            const count = sections.filter((section) => section.pageKey === page.key).length;
            return (
              <button key={page.key} type="button" onClick={() => selectPage(page.key)} className={`min-h-11 shrink-0 border px-4 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${pageKey === page.key ? 'border-[#E02424] bg-[#E02424] text-white' : 'border-neutral-200 bg-[#F9F9F9] text-neutral-600 hover:border-neutral-400'}`}>
                {page.label} <span className="ml-2 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      {feedback && <div role="status" className={`mx-5 mt-5 border px-4 py-3 text-sm font-semibold md:mx-7 ${feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{feedback.message}</div>}

      {loading ? (
        <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-neutral-500"><RefreshCcw className="h-4 w-4 animate-spin" /> Loading sections</div>
      ) : (
        <div className="grid min-h-[680px] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-neutral-200 bg-[#F5F5F3] p-4 xl:border-b-0 xl:border-r">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Sections</span>
              <span className="text-[10px] font-bold text-neutral-400">{pageSections.length}</span>
            </div>
            <div data-testid="section-navigator" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {pageSections.map((section, index) => {
                const definition = getDefinition(section);
                const preview = Object.values(section.media ?? {})[0];
                const active = selected?.sectionId === section.sectionId;
                return (
                  <button key={section.sectionId} data-section-id={section.sectionId} type="button" onClick={() => { setSelectedId(section.sectionId); setFeedback(null); }} className={`grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 border p-3 text-left transition-colors ${active ? 'border-[#E02424] bg-white shadow-sm' : 'border-neutral-200 bg-white/60 hover:border-neutral-400 hover:bg-white'}`}>
                    <span className="relative flex h-16 items-center justify-center overflow-hidden bg-neutral-900 text-neutral-500">
                      {preview?.url ? preview.kind === 'video' ? <Film className="h-5 w-5 text-white" /> : <img src={preview.url} alt="" className="h-full w-full object-cover" /> : <FileText className="h-5 w-5" />}
                      <span className="absolute left-1 top-1 bg-black/75 px-1.5 py-0.5 text-[8px] font-bold text-white">{String(index + 1).padStart(2, '0')}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black uppercase tracking-[0.08em] text-neutral-950">{section.label}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-neutral-500">{definition.fields.length} fields · {definition.mediaSlots.length} media</span>
                      <span className={`mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] ${section.paused ? 'text-[#E02424]' : 'text-emerald-700'}`}><span className={`h-1.5 w-1.5 ${section.paused ? 'bg-[#E02424]' : 'bg-emerald-500'}`} />{section.paused ? 'Paused' : 'Live'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 bg-white">{selected ? <SectionEditor key={`${selected.sectionId}-${selected.lastEdited}`} section={selected} onSaved={async () => { await load(selected.sectionId); setFeedback({ tone: 'success', message: `${selected.label} is now live with the latest saved changes.` }); }} onError={(message) => setFeedback({ tone: 'error', message })} /> : <div className="p-8 text-sm text-neutral-500">No sections are configured for this page.</div>}</main>
        </div>
      )}
    </section>
  );
}

function SectionEditor({ section, onSaved, onError }: { section: AdminSection; onSaved: () => Promise<void>; onError: (message: string) => void }) {
  const definition = getDefinition(section);
  const [content, setContent] = useState<SectionContent>(section.content);
  const [paused, setPaused] = useState(section.paused);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [resets, setResets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(section.content) || paused !== section.paused || Object.keys(files).length > 0 || resets.length > 0, [content, files, paused, resets, section]);

  const resetForm = () => { setContent(section.content); setPaused(section.paused); setFiles({}); setResets([]); };
  const save = async () => {
    setSaving(true);
    const formData = new FormData();
    formData.set('payload', JSON.stringify({ content, paused, resetMediaSlots: resets }));
    for (const [slot, file] of Object.entries(files)) formData.set(`media:${slot}`, file);
    const result = await saveSectionAction(section.sectionId, formData);
    setSaving(false);
    if (result?.success) { setFiles({}); setResets([]); await onSaved(); }
    else onError(result?.error || 'Unable to save this section.');
  };

  return (
    <div data-testid="section-editor" className="min-w-0">
      <div className="border-b border-neutral-200 bg-neutral-950 px-5 py-6 text-white md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E02424]">{definition.route}</span><h2 className="mt-2 text-2xl font-black uppercase tracking-tight">{definition.label}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">{definition.summary}</p></div>
          <span className={`inline-flex min-h-9 items-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.14em] ${paused ? 'border-[#E02424]/50 bg-[#E02424]/10 text-[#ff7777]' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}><Eye className="h-3.5 w-3.5" />{paused ? 'Paused' : 'Visible'}</span>
        </div>
      </div>

      <div className="space-y-8 p-5 md:p-7">
        {definition.ownershipNote && <div className="border-l-4 border-[#E02424] bg-[#F5F5F3] px-4 py-3 text-sm leading-relaxed text-neutral-700">{definition.ownershipNote}</div>}

        {definition.mediaSlots.length > 0 && <fieldset><legend className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-950"><ImageIcon className="h-4 w-4 text-[#E02424]" />Media</legend><div className="grid gap-4 lg:grid-cols-2">{definition.mediaSlots.map((slot) => {
          const stored = section.media?.[slot.key]; const file = files[slot.key]; const reset = resets.includes(slot.key); const previewUrl = file ? URL.createObjectURL(file) : reset ? slot.defaultUrl : stored?.url || slot.defaultUrl; const video = file ? file.type.startsWith('video/') : !reset && stored?.kind === 'video';
          return <article key={slot.key} className="overflow-hidden border border-neutral-200 bg-[#F9F9F9]"><div className="relative aspect-[16/9] bg-neutral-900">{video ? <video src={previewUrl} muted controls className="h-full w-full object-cover" /> : <img src={previewUrl} alt={`${slot.label} preview`} className="h-full w-full object-cover" />}<span className="absolute left-3 top-3 bg-black/75 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white">{file ? 'New upload' : reset || stored?.isDefault ? 'Default' : 'Custom'}</span></div><div className="p-4"><h3 className="text-xs font-black uppercase tracking-[0.1em] text-neutral-950">{slot.label}</h3>{slot.helper && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{slot.helper}</p>}<div className="mt-4 flex flex-wrap gap-2"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 bg-neutral-950 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#E02424]"><UploadCloud className="h-4 w-4" />Replace<input type="file" className="sr-only" accept={slot.accepts.map((kind) => `${kind}/*`).join(',')} onChange={(event) => { const next = event.target.files?.[0]; if (next) { setFiles((current) => ({ ...current, [slot.key]: next })); setResets((current) => current.filter((key) => key !== slot.key)); } }} /></label><button type="button" onClick={() => { setFiles((current) => { const next = { ...current }; delete next[slot.key]; return next; }); setResets((current) => [...new Set([...current, slot.key])]); }} className="min-h-10 border border-neutral-300 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-700 hover:border-[#E02424] hover:text-[#E02424]">Use default</button></div></div></article>;
        })}</div></fieldset>}

        {definition.fields.length > 0 && <fieldset><legend className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-950"><FileText className="h-4 w-4 text-[#E02424]" />Content</legend><div className="grid gap-5 lg:grid-cols-2">{definition.fields.map((field) => {
          const value = content[field.key] ?? (field.control === 'list' ? [] : '');
          return <label key={field.key} className={field.control === 'textarea' || field.control === 'list' ? 'lg:col-span-2' : ''}><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-600">{field.label}</span>{field.control === 'textarea' ? <textarea rows={4} value={String(value)} maxLength={field.maxLength} onChange={(event) => setContent((current) => ({ ...current, [field.key]: event.target.value }))} className="w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-[#E02424]" /> : field.control === 'list' ? <textarea rows={Math.min(8, Math.max(3, (value as string[]).length))} value={(value as string[]).join('\n')} onChange={(event) => setContent((current) => ({ ...current, [field.key]: event.target.value.split('\n') }))} className="w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-[#E02424]" /> : <input value={String(value)} maxLength={field.maxLength} onChange={(event) => setContent((current) => ({ ...current, [field.key]: event.target.value }))} className="h-11 w-full border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-[#E02424]" />}{field.helper && <span className="mt-1 block text-xs text-neutral-500">{field.helper}</span>}{field.control === 'list' && <span className="mt-1 block text-xs text-neutral-500">One item per line.</span>}</label>;
        })}</div></fieldset>}

        <fieldset className="border border-neutral-200 bg-[#F9F9F9] p-4"><legend className="px-2 text-xs font-black uppercase tracking-[0.14em] text-neutral-950">Visibility</legend><label className={`flex items-center justify-between gap-4 ${!definition.visibilityEditable ? 'opacity-50' : ''}`}><span><span className="block text-sm font-bold text-neutral-950">Show this section publicly</span><span className="mt-1 block text-xs text-neutral-500">Saved changes are immediately live.</span></span><input type="checkbox" checked={!paused} disabled={!definition.visibilityEditable} onChange={(event) => setPaused(!event.target.checked)} className="h-5 w-5 accent-[#E02424]" /></label></fieldset>
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-neutral-200 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:px-7"><span className="text-xs text-neutral-500">{dirty ? 'Unsaved changes' : <span className="inline-flex items-center gap-1.5 text-emerald-700"><Check className="h-3.5 w-3.5" />All changes saved</span>}</span><div className="flex gap-2"><button type="button" disabled={!dirty || saving} onClick={resetForm} className="min-h-11 border border-neutral-300 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-700 disabled:opacity-40">Discard</button><button type="button" disabled={!dirty || saving} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 bg-[#E02424] px-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-neutral-950 disabled:opacity-40"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save live'}</button></div></footer>
    </div>
  );
}
