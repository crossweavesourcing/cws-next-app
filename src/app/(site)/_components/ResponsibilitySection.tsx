import { SectionItem, contentValue, contentList } from './SectionHelpers';

export default function ResponsibilitySection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  return (
    <section id="responsibility" className="py-20 bg-[#EAEAEA] text-neutral-900 border-t border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left Column: Corporate Responsibility */}
        <div className="space-y-8">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">{contentValue(section, 'heading', 'Corporate Responsibility')}</h2>

          <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
            {contentValue(section, 'introduction', 'Ethical operations and responsible stewardship are the foundation of Cross Weave Sourcing.')}
          </p>

          <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-wider text-black">{contentValue(section, 'tagline', 'Do The Right Thing.')}</h3>

          <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
            {contentValue(section, 'commitment', 'This commitment guides the standards we maintain across our supply chain:')}
          </p>

          {/* Structured Tabular List in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-gray-300">
            {[0, 1].map((column) => (
              <div key={column}>
                <ul className="space-y-1.5 text-xs sm:text-sm font-sans font-medium text-neutral-850">
                  {contentList(section, 'principles', []).filter((_, index) => index % 2 === column).map((principle) => (
                    <li key={principle}>{principle}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Our Management */}
        <div className="space-y-8 lg:pl-12 lg:border-l lg:border-gray-300">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">{contentValue(section, 'managementHeading', 'Our Management')}</h2>

          <div className="space-y-6 text-[#1E1E1E] text-[15px] leading-relaxed font-sans font-light">
            <p>{contentValue(section, 'managementBody', 'Our leadership team brings decades of collective expertise in the global apparel sector.')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
