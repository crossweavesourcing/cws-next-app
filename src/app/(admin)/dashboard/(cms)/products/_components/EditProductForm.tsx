'use client';

import { useState, useEffect } from 'react';
import { updateProduct } from '@/auth/actions/product.actions';
import type { ProductDocument, CategoryDocument } from '@/types/catalog';
import { MediaUploader, type MediaItem } from './MediaUploader';

export function EditProductForm({ product, categories, onSuccess, onCancel }: { product: ProductDocument, categories: CategoryDocument[], onSuccess?: () => void, onCancel?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [faqs, setFaqs] = useState<{question: string, answer: string}[]>(product.faqs || []);

  useEffect(() => {
    const initialItems: MediaItem[] = [];
    if (product.image) {
      initialItems.push({
        id: 'main-' + Math.random().toString(36).substring(7),
        type: 'existing',
        url: product.image,
        isFeatured: true,
        altText: product.imageAltText || '',
      });
    }
    if (product.images && product.images.length > 0) {
      product.images.forEach((imgUrl, index) => {
        initialItems.push({
          id: 'gallery-' + Math.random().toString(36).substring(7),
          type: 'existing',
          url: imgUrl,
          isFeatured: false,
          altText: product.imagesAltText?.[index] || '',
        });
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaItems(initialItems);
  }, [product]);



  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    setError('');
    
    const featured = mediaItems.find(m => m.isFeatured);
    const existingGalleryUrls = mediaItems.filter(m => m.type === 'existing' && !m.isFeatured).map(m => m.url!);
    const newGalleryFiles = mediaItems.filter(m => m.type === 'new' && !m.isFeatured).map(m => m.file!);

    if (featured?.type === 'existing') {
      formData.set('featuredMediaUrl', featured.url!);
      formData.set('imageAltText', featured.altText || '');
    } else if (featured?.type === 'new' && featured.file) {
      formData.set('image', featured.file);
      formData.set('imageAltText', featured.altText || '');
    } else {
      setError('Please select a featured media item (click the star icon)');
      setPending(false);
      return;
    }

    formData.set('existingGalleryUrls', JSON.stringify(existingGalleryUrls));
    
    formData.delete('images');
    newGalleryFiles.forEach(f => formData.append('images', f));
    
    const galleryAlts = mediaItems.filter(m => !m.isFeatured).map(m => m.altText || '');
    formData.set('imagesAltText', JSON.stringify(galleryAlts));
    
    const productId = product._id?.toString();
    if (!productId) {
      setError('Invalid product ID');
      setPending(false);
      return;
    }
    
    const mfg = formData.get('manufacturingStr') as string;
    formData.set('manufacturing', JSON.stringify(mfg ? mfg.split(',').map(s => s.trim()) : []));
    
    const feat = formData.get('featuresStr') as string;
    formData.set('features', JSON.stringify(feat ? feat.split(',').map(s => s.trim()) : []));
    
    const specs = {
      material: formData.get('spec_material') as string,
      productionFocus: formData.get('spec_productionFocus') as string,
      finishing: formData.get('spec_finishing') as string,
      quality: formData.get('spec_quality') as string,
    };
    formData.set('specifications', JSON.stringify(specs));

    formData.set('faqs', JSON.stringify(faqs));

    const res = await updateProduct(productId, formData);
    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || 'An error occurred');
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-white">
      <span className="break-words text-[10px] font-bold uppercase tracking-[0.16em] text-[#E02424]">
        Edit Product
      </span>
      <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Update</h3>
      
      {error && <div className="border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Name</label>
          <input name="name" defaultValue={product.name} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Slug</label>
          <input name="slug" defaultValue={product.slug} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Category (Optional)</label>
        <select name="categoryId" defaultValue={product.categoryId?.toString() || ''} className="w-full border border-white/10 bg-[#181818] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30">
          <option value="">No Category</option>
          {categories.map(c => (
            <option key={c._id.toString()} value={c._id.toString()}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Short Description</label>
        <textarea name="shortDescription" defaultValue={product.shortDescription} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={2} />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Overview</label>
        <textarea name="overview" defaultValue={product.overview} required className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-[#E02424] focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
      </div>

      <MediaUploader mediaItems={mediaItems} setMediaItems={setMediaItems} />

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Manufacturing (comma separated)</label>
          <textarea name="manufacturingStr" defaultValue={product.manufacturing?.join(', ')} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={2} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Features (comma separated)</label>
          <textarea name="featuresStr" defaultValue={product.features?.join(', ')} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={2} />
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
        <h4 className="mb-3 text-sm font-bold uppercase text-white">Specifications</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Material</label>
            <input name="spec_material" defaultValue={product.specifications?.material} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Production Focus</label>
            <input name="spec_productionFocus" defaultValue={product.specifications?.productionFocus} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Finishing</label>
            <input name="spec_finishing" defaultValue={product.specifications?.finishing} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Quality</label>
            <input name="spec_quality" defaultValue={product.specifications?.quality} required className="w-full border border-white/10 bg-black/20 p-2.5 text-sm text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" />
          </div>
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
        <h4 className="mb-3 text-sm font-bold uppercase text-white">Extended Content (Optional Rich Text)</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Long Description (HTML)</label>
            <textarea name="longDescription" defaultValue={product.longDescription} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={4} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Materials (HTML)</label>
            <textarea name="materials" defaultValue={product.materials} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Process (HTML)</label>
            <textarea name="process" defaultValue={product.process} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Quality Control (HTML)</label>
            <textarea name="qualityControl" defaultValue={product.qualityControl} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Customization (HTML)</label>
            <textarea name="customization" defaultValue={product.customization} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Applications (HTML)</label>
            <textarea name="applications" defaultValue={product.applications} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Packaging (HTML)</label>
            <textarea name="packaging" defaultValue={product.packaging} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors focus:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/30" rows={3} />
          </div>
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
        <h4 className="mb-3 text-sm font-bold uppercase text-white">FAQs</h4>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="flex gap-2 items-start border border-white/10 p-2">
              <div className="flex-1 space-y-2">
                <input value={faq.question} onChange={e => { const n = [...faqs]; n[idx].question = e.target.value; setFaqs(n); }} placeholder="Question" className="w-full border border-white/10 bg-white/[0.06] p-2 text-sm text-white outline-none" />
                <textarea value={faq.answer} onChange={e => { const n = [...faqs]; n[idx].answer = e.target.value; setFaqs(n); }} placeholder="Answer (HTML)" className="w-full border border-white/10 bg-white/[0.06] p-2 text-sm text-white outline-none" rows={2} />
              </div>
              <button type="button" onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))} className="bg-red-500/20 text-red-500 p-2 hover:bg-red-500/40">X</button>
            </div>
          ))}
          <button type="button" onClick={() => setFaqs([...faqs, {question: '', answer: ''}])} className="text-sm border border-white/20 px-3 py-1 hover:bg-white/10">+ Add FAQ</button>
        </div>
      </div>

      <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
        <h4 className="mb-3 text-sm font-bold uppercase text-white">SEO Overrides</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Title Override</label>
            <input name="seoOverrides.title" defaultValue={product.seoOverrides?.title} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Canonical URL Override</label>
            <input name="seoOverrides.canonicalUrl" defaultValue={product.seoOverrides?.canonicalUrl} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase text-neutral-400 mb-1">Description Override</label>
          <textarea name="seoOverrides.description" defaultValue={product.seoOverrides?.description} className="w-full border border-white/10 bg-white/[0.06] p-2.5 text-white outline-none transition-colors" rows={2} />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-neutral-300">
        <input type="hidden" name="visible" value="false" />
        <input type="checkbox" name="visible" value="true" defaultChecked={product.visible} className="h-4 w-4 accent-[#E02424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]/50" />
        Visible
      </label>

      <button disabled={pending} className="mt-4 w-full bg-[#E02424] py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c91f1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? 'Saving...' : 'Update Product'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-2 w-full border border-white/20 bg-transparent py-3 font-bold uppercase tracking-wider text-white transition-colors hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E02424]">
          Cancel
        </button>
      )}
    </form>
  );
}
