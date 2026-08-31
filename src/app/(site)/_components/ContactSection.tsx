import { Mail, MapPin, Phone, User } from 'lucide-react';
import ContactInformationForm from '@/components/ContactInformationForm';
import { SectionItem, contentValue } from './SectionHelpers';

export default function ContactSection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  const person1Name = contentValue(section, 'person1Name', 'ASHRAFUR RAHAMAN');
  const person1Email = contentValue(section, 'person1Email', contentValue(section, 'email', 'ashrahaman@crossweavesourcing.com'));
  const person1Phone = contentValue(section, 'person1Phone', '+1 347 659 2484');
  const person1Usa = contentValue(section, 'person1UsaAddress', 'Serda, A White Horse Pike, Somerdale, NJ 08083, USA');
  const person1Bd = contentValue(section, 'person1BdAddress', contentValue(section, 'bangladeshAddress', 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh'));

  const person2Name = contentValue(section, 'person2Name', 'MD SHARIFUL ISLAM');
  const person2Email = contentValue(section, 'person2Email', 'sharif@crossweavesourcing.com');
  const person2Phone = contentValue(section, 'person2Phone', 'USA: +1 609 453 5301 | BD: +880 1811-182609');
  const person2Usa = contentValue(section, 'person2UsaAddress', contentValue(section, 'usaAddress', 'PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA'));
  const person2Bd = contentValue(section, 'person2BdAddress', 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh');

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

            <div className="space-y-8">
              {/* Person 1 */}
              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center bg-[#E02424]/20 text-[#E02424] border border-[#E02424]/40 text-xs">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-base sm:text-lg font-bold uppercase tracking-wide text-white">
                    {person1Name}
                  </h4>
                </div>

                <div className="grid gap-3 text-xs sm:text-sm pl-1">
                  {person1Email && (
                    <a
                      href={`mailto:${person1Email}`}
                      className="group flex items-center gap-3 text-neutral-300 hover:text-white transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[#E02424] group-hover:scale-110 transition-transform" />
                      <span className="font-medium truncate">{person1Email}</span>
                    </a>
                  )}

                  {person1Phone && (
                    <div className="flex items-center gap-3 text-neutral-300">
                      <Phone className="h-4 w-4 shrink-0 text-[#E02424]" />
                      <span>{person1Phone}</span>
                    </div>
                  )}

                  {(person1Usa || person1Bd) && (
                    <div className="flex items-start gap-3 text-neutral-400 font-light pt-1">
                      <MapPin className="h-4 w-4 shrink-0 text-[#E02424] mt-0.5" />
                      <div className="space-y-1.5 leading-relaxed">
                        {person1Usa && <p><strong className="font-semibold text-neutral-300">USA:</strong> {person1Usa}</p>}
                        {person1Bd && <p><strong className="font-semibold text-neutral-300">BD:</strong> {person1Bd}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Person 2 */}
              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center bg-[#E02424]/20 text-[#E02424] border border-[#E02424]/40 text-xs">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-base sm:text-lg font-bold uppercase tracking-wide text-white">
                    {person2Name}
                  </h4>
                </div>

                <div className="grid gap-3 text-xs sm:text-sm pl-1">
                  {person2Email && (
                    <a
                      href={`mailto:${person2Email}`}
                      className="group flex items-center gap-3 text-neutral-300 hover:text-white transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[#E02424] group-hover:scale-110 transition-transform" />
                      <span className="font-medium truncate">{person2Email}</span>
                    </a>
                  )}

                  {person2Phone && (
                    <div className="flex items-center gap-3 text-neutral-300">
                      <Phone className="h-4 w-4 shrink-0 text-[#E02424]" />
                      <span>{person2Phone}</span>
                    </div>
                  )}

                  {(person2Usa || person2Bd) && (
                    <div className="flex items-start gap-3 text-neutral-400 font-light pt-1">
                      <MapPin className="h-4 w-4 shrink-0 text-[#E02424] mt-0.5" />
                      <div className="space-y-1.5 leading-relaxed">
                        {person2Usa && <p><strong className="font-semibold text-neutral-300">USA:</strong> {person2Usa}</p>}
                        {person2Bd && <p><strong className="font-semibold text-neutral-300">BD:</strong> {person2Bd}</p>}
                      </div>
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
