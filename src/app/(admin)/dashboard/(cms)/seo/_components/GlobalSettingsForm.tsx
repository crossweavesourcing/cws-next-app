'use client';

import { useState } from 'react';
import { Panel } from '../../_components/DashboardComponents';
import { saveGlobalSettingsAction } from '@/auth/actions/seo.actions';

interface SerializedGlobalSettings {
  _id: string;
  brandName?: string;
  defaultSocialImage?: string;
  organizationName?: string;
  organizationLegalName?: string;
  organizationUrl?: string;
  organizationLogo?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  socialLinks?: string[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export function GlobalSettingsForm({ settings }: { settings: SerializedGlobalSettings }) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [socialLinks, setSocialLinks] = useState<string[]>(settings.socialLinks ?? []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    // Remove any existing socialLinks entries and add the dynamic list
    formData.delete('socialLinks');
    socialLinks.filter((l) => l.trim()).forEach((link) => formData.append('socialLinks', link));

    const res = await saveGlobalSettingsAction(formData);
    setPending(false);

    if (res && 'success' in res && res.success) {
      setFeedback({ type: 'success', message: 'Global settings saved successfully.' });
    } else {
      const errorMsg = res && 'error' in res ? (res as { error?: string }).error : 'An unexpected error occurred.';
      setFeedback({ type: 'error', message: errorMsg ?? 'An unexpected error occurred.' });
    }
  }

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, '']);
  }

  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSocialLink(index: number, value: string) {
    setSocialLinks((prev) => prev.map((link, i) => (i === index ? value : link)));
  }

  const inputClass =
    'h-11 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424]';
  const labelClass = 'mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500';

  return (
    <Panel eyebrow="SEO Settings" title="Global Brand & Organization">
      {feedback && (
        <div
          className={`mb-4 border p-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand & Organization */}
        <section className="border border-neutral-200 bg-[#F9F9F9] p-4 md:p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-neutral-950">
            Brand Identity
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Brand Name</span>
              <input
                type="text"
                name="brandName"
                defaultValue={settings.brandName ?? ''}
                className={inputClass}
                placeholder="Cross Weave Sourcing"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Organization Name</span>
              <input
                type="text"
                name="organizationName"
                defaultValue={settings.organizationName ?? ''}
                className={inputClass}
                placeholder="Cross Weave Sourcing Ltd."
              />
            </label>
            <label className="block">
              <span className={labelClass}>Legal Name</span>
              <input
                type="text"
                name="organizationLegalName"
                defaultValue={settings.organizationLegalName ?? ''}
                className={inputClass}
                placeholder="Cross Weave Sourcing Ltd."
              />
            </label>
            <label className="block">
              <span className={labelClass}>Organization URL</span>
              <input
                type="url"
                name="organizationUrl"
                defaultValue={settings.organizationUrl ?? ''}
                className={inputClass}
                placeholder="https://crossweavesourcing.com"
              />
            </label>
          </div>
        </section>

        {/* Media & Social */}
        <section className="border border-neutral-200 bg-[#F9F9F9] p-4 md:p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-neutral-950">
            Media & Social
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Organization Logo URL</span>
              <input
                type="text"
                name="organizationLogo"
                defaultValue={settings.organizationLogo ?? ''}
                className={inputClass}
                placeholder="https://example.com/logo.png"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Default Social Image URL</span>
              <input
                type="text"
                name="defaultSocialImage"
                defaultValue={settings.defaultSocialImage ?? ''}
                className={inputClass}
                placeholder="https://example.com/og-image.jpg"
              />
            </label>
          </div>

          {/* Social Links - Dynamic List */}
          <div className="mt-5">
            <span className={labelClass}>Social Links</span>
            <div className="space-y-2">
              {socialLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateSocialLink(index, e.target.value)}
                    className={inputClass}
                    placeholder="https://twitter.com/example"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="shrink-0 border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSocialLink}
                className="mt-1 text-xs font-bold uppercase tracking-wider text-[#E02424] transition-colors hover:text-[#c91f1f]"
              >
                + Add Social Link
              </button>
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section className="border border-neutral-200 bg-[#F9F9F9] p-4 md:p-5">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-neutral-950">
            Contact Details
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Contact Email</span>
              <input
                type="email"
                name="contactEmail"
                defaultValue={settings.contactEmail ?? ''}
                className={inputClass}
                placeholder="hello@crossweavesourcing.com"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Contact Phone</span>
              <input
                type="tel"
                name="contactPhone"
                defaultValue={settings.contactPhone ?? ''}
                className={inputClass}
                placeholder="+880 1XXX XXXXXX"
              />
            </label>
            <label className="block md:col-span-2">
              <span className={labelClass}>Contact Address</span>
              <input
                type="text"
                name="contactAddress"
                defaultValue={settings.contactAddress ?? ''}
                className={inputClass}
                placeholder="Dhaka, Bangladesh"
              />
            </label>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-[#E02424] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c91f1f] disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </Panel>
  );
}
