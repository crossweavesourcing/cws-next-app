import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { SectionItem, contentValue, contentList, mediaKind, mediaValue } from './SectionHelpers';
import Typewriter from './Typewriter';

export default function HomeHeroSection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  const heroWords = contentList(section, 'rotatingWords', ['Source', 'Craft', 'Deliver']).map((word) => word.toUpperCase());

  return (
    <section className="relative h-[480px] sm:h-[600px] lg:h-[660px] bg-[#070707] overflow-hidden flex items-center">
      <div className="absolute inset-0 z-0">
        {mediaKind(section, 'background') === 'video' ? (
          <>
            <video src={mediaValue(section, 'background', '/assets/images/cws_hero_image.png')} autoPlay loop muted playsInline className="motion-reduce:hidden h-full w-full object-cover opacity-50" />
            <Image
              src={mediaValue(section, 'background', '/assets/images/cws_hero_image.png').replace(/\.(mp4|webm|ogg)$/i, '.jpg')}
              alt="TKO Design Workspace Collage"
              fill
              priority
              sizes="100vw"
              className="hidden motion-reduce:block object-cover opacity-50"
            />
          </>
        ) : (
          <Image
            src={mediaValue(section, 'background', '/assets/images/cws_hero_image.png')}
            alt="TKO Design Workspace Collage"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-black/10 z-[1]" />
        <div
          className="absolute inset-0 z-[2] backdrop-blur-[3px]"
          style={{
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 flex justify-end">
        <div className="text-right select-none pr-4 md:pr-12 max-w-3xl">
          <h1 className="leading-none tracking-normal" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)' }}>
            <span className="block text-xs sm:text-sm font-sans font-bold text-white uppercase tracking-[0.4em] mb-4">{contentValue(section, 'eyebrow', 'End-to-End Solution')}</span>
            <span className="block text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-white uppercase tracking-[0.2em]">{contentValue(section, 'prefix', 'We')}</span>
            <span className="block min-h-[60px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[140px] text-6xl sm:text-[100px] md:text-[120px] lg:text-[140px] font-sans font-black text-[#E02424] uppercase tracking-tighter leading-none my-1">
              <Typewriter words={heroWords} />
            </span>
            <span className="block mt-6 sm:mt-8 text-xs sm:text-sm md:text-base font-sans font-medium text-neutral-400 tracking-[0.3em] uppercase max-w-lg ml-auto">
              {contentValue(section, 'supportingLabel', 'Premium Apparel')}
            </span>
            <span className="block text-2xl sm:text-3xl md:text-4xl font-sans font-semibold text-white uppercase tracking-[0.1em] leading-none mt-2 sm:mt-4 mb-8">
              {contentValue(section, 'headline', 'Knit, Woven & Sweater')}
            </span>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-6">
              <Link 
                href="/products" 
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 border border-white/20 bg-transparent px-8 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-white/10"
              >
                View Catalog
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/#contracting" 
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-8 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-[#c81e1e]"
              >
                Request a Quote
                <Mail className="h-4 w-4" />
              </Link>
            </div>
          </h1>
        </div>
      </div>
    </section>
  );
}
