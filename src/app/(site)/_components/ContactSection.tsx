import { Mail, MapPin, Phone } from 'lucide-react';
import ContactInformationForm from '@/components/ContactInformationForm';
import { SectionItem, contentValue } from './SectionHelpers';

export default function ContactSection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  const primaryEmail = contentValue(section, 'primaryEmail', contentValue(section, 'email', 'ashrahaman@crossweavesourcing.com'));
  const secondaryEmail = contentValue(section, 'secondaryEmail', 'sharif@crossweavesourcing.com');
  const usaPhone = contentValue(section, 'usaPhone', '+1 (347) 659-2484, +1 (609) 453-5301');
  const bdPhone = contentValue(section, 'bdPhone', '+880 1811-182609');
  const usaAddress = contentValue(section, 'usaAddress', 'PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA');
  const bdAddress = contentValue(section, 'bangladeshAddress', 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh');

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
          <div className="lg:col-span-5 bg-[#101010] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between gap-10 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#E02424]" />
            
            <div className="space-y-4">
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
              {/* Emails */}
              <div className="border-t border-white/10 pt-6 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="space-y-2 min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
                    Email Us
                  </span>
                  <div className="space-y-1 text-sm sm:text-base">
                    {primaryEmail && (
                      <a
                        href={`mailto:${primaryEmail}`}
                        className="block font-medium text-white hover:text-[#EF4444] transition-colors truncate"
                      >
                        {primaryEmail}
                      </a>
                    )}
                    {secondaryEmail && (
                      <a
                        href={`mailto:${secondaryEmail}`}
                        className="block font-medium text-neutral-300 hover:text-[#EF4444] transition-colors truncate"
                      >
                        {secondaryEmail}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Phones */}
              <div className="border-t border-white/10 pt-6 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
                  <Phone className="h-5 w-5" />
                </span>
                <div className="space-y-2 min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
                    Call Us
                  </span>
                  <div className="space-y-1.5 text-sm sm:text-base text-neutral-200">
                    {usaPhone && (
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">USA:</span>
                        <span className="font-medium text-white">{usaPhone}</span>
                      </div>
                    )}
                    {bdPhone && (
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">BD:</span>
                        <span className="font-medium text-white">{bdPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Office Addresses */}
              <div className="border-t border-white/10 pt-6 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[#E02424]">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.24em] text-neutral-400">
                    Visit Us
                  </span>
                  {usaAddress && (
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">USA Office</span>
                      <p className="text-sm leading-relaxed text-neutral-400 font-light">
                        {usaAddress}
                      </p>
                    </div>
                  )}
                  {bdAddress && (
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">Bangladesh Office</span>
                      <p className="text-sm leading-relaxed text-neutral-400 font-light">
                        {bdAddress}
                      </p>
                    </div>
                  )}
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
