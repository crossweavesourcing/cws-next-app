import { Mail, MapPin } from 'lucide-react';
import ContactInformationForm from '@/components/ContactInformationForm';
import { SectionItem, contentValue } from './SectionHelpers';

export default function ContactSection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  return (
    <section id="contracting" className="py-24 bg-white text-neutral-900 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center space-y-3 mb-16">
          <span className="block text-xl sm:text-2xl font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">{contentValue(section, 'eyebrow', 'Direct Sourcing Channels')}</span>
          <p className="text-neutral-500 text-base sm:text-lg font-light max-w-2xl mx-auto">
            {contentValue(section, 'introduction', 'Partner directly with our executive leadership to establish reliable production, quality assurance, and seamless apparel supply chains.')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-neutral-200 bg-[#F8F7F3] shadow-[0_24px_80px_rgba(15,15,15,0.08)]">
          <div className="lg:col-span-5 bg-[#101010] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between gap-12 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#E02424]" />
            <div className="space-y-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#EF4444]">
                {contentValue(section, 'panelLabel', 'Contact Information')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-tight">
                {contentValue(section, 'panelHeading', "Let's build your next sourcing plan.")}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-light">
                {contentValue(section, 'panelBody', 'Send production details, sampling needs, or buying requirements. Our team will review the request and connect with you directly.')}
              </p>
            </div>

            <div className="space-y-6">
              <a
                href={`mailto:${contentValue(section, 'email', 'info@crossweavesourcing.com')}`}
                className="group flex items-start gap-4 border-t border-white/10 pt-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[#E02424] transition-colors group-hover:border-[#E02424]/60 group-hover:bg-[#E02424] group-hover:text-white">
                  <Mail className="h-5 w-5" />
                </span>
                <span className="space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
                    Email Us
                  </span>
                  <span className="block text-sm sm:text-base font-medium text-white">
                    {contentValue(section, 'email', 'info@crossweavesourcing.com')}
                  </span>
                </span>
              </a>

              <div className="flex items-start gap-4 border-t border-white/10 pt-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
                    Visit Us
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-200 font-light">
                    {contentValue(section, 'bangladeshAddress', 'Bashundhara R/A, Chittagong, Bangladesh')}
                  </p>
                  <p className="text-sm leading-relaxed text-neutral-400 font-light">
                    {contentValue(section, 'usaAddress', 'Somerdale, NJ 08083, USA')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 bg-white">
            <div className="space-y-2 mb-8">
              <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight">{contentValue(section, 'formHeading', 'Send Us a Message')}</h3>
            </div>
            {/* Contact Information form (Client component, heavy interactivity inside) */}
            <ContactInformationForm submitLabel={contentValue(section, 'submitLabel', 'Send Request')} />
          </div>
        </div>
      </div>
    </section>
  );
}
