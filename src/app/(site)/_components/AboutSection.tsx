import { SectionItem, contentValue, contentList } from './SectionHelpers';

export default function AboutSection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  return (
    <section id="about" className="py-20 md:py-28 bg-transparent">
      <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-[#E02424] tracking-tight uppercase leading-snug">
            {contentValue(section, 'heading', 'About Us')}
          </h2>
          <p className="text-neutral-900 text-lg sm:text-xl font-light max-w-4xl mx-auto leading-relaxed pt-2">
            {contentValue(section, 'introduction', 'Cross Weave Sourcing (CWS) is an export-oriented garment manufacturer and global sourcing partner committed to delivering high-quality apparel solutions for international brands, retailers, and importers.')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div className="space-y-6 text-neutral-600 leading-relaxed text-sm sm:text-base font-sans font-light">
            {contentList(section, 'paragraphs', []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          <div className="bg-[#F9F9F9] border border-neutral-100 p-8 sm:p-10 space-y-6">
            <h3 className="text-lg font-sans font-bold uppercase tracking-[0.2em] text-neutral-900 border-b border-neutral-200 pb-3">
              WHY CHOOSE CWS
            </h3>
            <ul className="space-y-4">
              {contentList(section, 'reasons', []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-[#E02424] font-bold text-sm mt-0.5">•</span>
                  <span className="text-neutral-800 text-sm sm:text-base font-sans font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
