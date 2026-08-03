import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import type { SectionContent, SectionMedia } from '@/lib/section-definitions';

type FooterCategory = { _id: { toString(): string } | string; name: string };

export default function SiteFooter({ categories, section }: { categories: FooterCategory[]; section?: { paused: boolean; content?: SectionContent; media?: SectionMedia } }) {
  if (section?.paused) return null;
  const content = section?.content ?? {};
  const value = (key: string, fallback: string) => typeof content[key] === 'string' ? content[key] as string : fallback;
  const logo = section?.media?.logo?.url || '/cws_logo.png';
  const year = String(new Date().getFullYear());
  const copyright = value('copyright', '© {year} Cross Weave Sourcing (CWS). All rights reserved.').replaceAll('{year}', year);
  return (
    <footer className="landing-cws-footer border-t border-neutral-300 bg-[#DDDBCF] pb-12 pt-16 text-neutral-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-12 md:gap-8 md:px-12">
        <div className="col-span-1 space-y-6 md:col-span-5">
          <div className="relative mb-4 h-12 w-40"><Image src={logo} alt="CWS" fill sizes="160px" className="object-contain object-left" /></div>
          <div className="space-y-6 text-neutral-700">
            <div className="text-[11px] uppercase tracking-wider"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black">{value('bangladeshLabel', 'Bangladesh Office')}</span><p className="normal-case leading-relaxed text-neutral-600">{value('bangladeshAddress', 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh')}</p></div>
            <div className="text-[11px] uppercase tracking-wider"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-black">{value('usaLabel', 'USA Office & Mailing Address')}</span><p className="normal-case leading-relaxed text-neutral-600">{value('usaAddress', 'PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA')}</p></div>
          </div>
        </div>
        <div className="col-span-1 space-y-4 md:col-span-2 md:border-l md:border-neutral-300/60 md:pl-8"><h5 className="text-xs font-bold uppercase tracking-[0.15em] text-black">{value('aboutHeading', 'About Us')}</h5><ul className="space-y-2 text-[11px] uppercase tracking-wider text-neutral-700"><li><Link href="/#about">Our Approach</Link></li><li><Link href="/#what-we-do">What We Do</Link></li><li><Link href="/#strategy">Company Strategy</Link></li><li><Link href="/#responsibility">Management</Link></li></ul></div>
        <div className="col-span-1 space-y-4 md:col-span-2 md:border-l md:border-neutral-300/60 md:pl-8"><h5 className="text-xs font-bold uppercase tracking-[0.15em] text-black">{value('categoriesHeading', 'Product Categories')}</h5><ul className="space-y-2 text-[11px] uppercase tracking-wider text-neutral-700">{categories.map((category) => <li key={category._id.toString()}><Link href={`/products?category=${encodeURIComponent(category.name)}`}>{category.name}</Link></li>)}</ul></div>
        <div className="col-span-1 space-y-6 md:col-span-3 md:border-l md:border-neutral-300/60 md:pl-8"><div className="space-y-4"><h5 className="text-xs font-bold uppercase tracking-[0.15em] text-black">{value('responsibilityHeading', 'Corporate Responsibility')}</h5><Link href="/#responsibility" className="text-[11px] uppercase tracking-wider text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#E02424] rounded-sm">Do The Right Thing</Link></div><div className="space-y-4 border-t border-neutral-300/60 pt-5"><h5 className="text-xs font-bold uppercase tracking-[0.15em] text-black">{value('followHeading', 'Follow Us')}</h5><div className="flex gap-4">{[[Linkedin, 'LinkedIn', 'https://linkedin.com'], [Instagram, 'Instagram', 'https://instagram.com'], [Facebook, 'Facebook', 'https://facebook.com']].map(([Icon, label, href]) => <a key={String(label)} href={String(href)} target="_blank" rel="noopener noreferrer" aria-label={String(label)} className="bg-black/5 p-2 text-neutral-700 transition-colors hover:bg-[#E02424] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E02424] rounded-sm"><Icon className="h-4 w-4" /></a>)}</div></div></div>
      </div>
      <div className="mx-auto mt-12 flex flex-col sm:flex-row max-w-7xl justify-between items-center gap-4 border-t border-neutral-300 px-6 pt-8 text-[10px] uppercase tracking-wider text-neutral-600 md:px-12">
        <div className="flex flex-wrap justify-center sm:justify-start gap-4">
          <Link href="/legal/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
          <Link href="/legal/terms" className="hover:text-black transition-colors">Terms of Service</Link>
          <Link href="/legal/cookie-policy" className="hover:text-black transition-colors">Cookie Policy</Link>
          <Link href="/legal/accessibility" className="hover:text-black transition-colors">Accessibility</Link>
        </div>
        <div className="text-center sm:text-right">{copyright}</div>
      </div>
    </footer>
  );
}
