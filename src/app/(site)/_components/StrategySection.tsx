import Image from 'next/image';
import { SectionItem, contentValue, contentList, mediaKind, mediaValue } from './SectionHelpers';

export default function StrategySection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  return (
    <section id="strategy" className="py-16 md:py-24 bg-[#EAEAEA]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
        <div className="relative order-2 lg:order-1 w-full h-[450px] lg:h-full min-h-[380px]">
          {mediaKind(section, 'visual') === 'video' ? (
            <video src={mediaValue(section, 'visual', '/assets/images/tko_collaboration_1780828202517.png')} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          ) : (
            <Image
              src={mediaValue(section, 'visual', '/assets/images/tko_collaboration_1780828202517.png')}
              alt="Company Strategy Sourcing Team"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="space-y-12 flex flex-col justify-center order-1 lg:order-2">
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">{contentValue(section, 'heading', 'Company Strategy')}</h2>
            <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
              {contentList(section, 'paragraphs', []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
