"use client";
import { Fragment, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin } from 'lucide-react';
import ContactInformationForm from '@/components/ContactInformationForm';
import type { CategoryDocument } from '@/types/catalog';
import type { SectionContent, SectionMedia } from '@/lib/section-definitions';
import SiteFooter from '@/components/SiteFooter';

type ThemeMode = 'light' | 'dark';

interface SectionItem {
  sectionId: string;
  pageKey: string;
  paused: boolean;
  mediaUrl?: string;
  content?: SectionContent;
  media?: SectionMedia;
}

interface PageProps {
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  categories: CategoryDocument[];
  sections?: SectionItem[];
}

const defaultServices = [
  {
    title: 'Product Development & Sampling',
    description: 'Support from concept review and material selection through fit samples, proto samples and pre-production approvals.',
    image: '/assets/images/service_product_development_sampling.jpg',
  },
  {
    title: 'Private Label Manufacturing',
    description: 'End-to-end production for buyer-owned labels with brand-specific trims, packaging and quality requirements.',
    image: '/assets/images/service_private_label_manufacturing.jpg',
  },
  {
    title: 'Knit, Woven & Sweater Production',
    description: 'Reliable manufacturing coordination across core apparel categories through a trusted production network.',
    image: '/assets/images/service_knit_woven_sweater_production.jpg',
  },
  {
    title: 'Costing & Commercial Support',
    description: 'Transparent costing, supplier negotiation and commercial guidance to help brands meet target margins.',
    image: '/assets/images/service_costing_commercial_support.jpg',
  },
  {
    title: 'Quality Control & Inspection',
    description: 'Inline, midline and final inspection support to maintain product quality, compliance and shipment readiness.',
    image: '/assets/images/service_quality_control_inspection.jpg',
  },
  {
    title: 'Export Documentation & Logistics Coordination',
    description: 'Shipment follow-up, export document coordination and logistics support from production handover to delivery.',
    image: '/assets/images/service_export_documentation_logistics.jpg',
  },
];

export default function HomePageClient({ categories, sections = [] }: PageProps) {
  const sectionMap = new Map(sections.map(s => [s.sectionId, s]));

  const heroSection = sectionMap.get('home-hero');
  const aboutSection = sectionMap.get('home-about');
  const productsSection = sectionMap.get('home-[#products]') || sectionMap.get('home-products');
  const strategySection = sectionMap.get('home-strategy');
  const servicesSection = sectionMap.get('home-services');
  const responsibilitySection = sectionMap.get('home-responsibility');
  const contactSection = sectionMap.get('home-contact');
  const footerSection = sectionMap.get('global-footer');
  const contentValue = (section: SectionItem | undefined, key: string, fallback: string) => typeof section?.content?.[key] === 'string' ? section.content[key] as string : fallback;
  const contentList = (section: SectionItem | undefined, key: string, fallback: string[]) => Array.isArray(section?.content?.[key]) ? section.content[key] as string[] : fallback;
  const mediaValue = (section: SectionItem | undefined, key: string, fallback: string) => section?.media?.[key]?.url || section?.mediaUrl || fallback;
  const mediaKind = (section: SectionItem | undefined, key: string) => section?.media?.[key]?.kind || (section?.mediaUrl?.match(/\.(mp4|webm|mov)(?:\?|$)/i) ? 'video' : 'image');
  const heroWords = useMemo(() => contentList(heroSection, 'rotatingWords', ['Source', 'Craft', 'Deliver']).map((word) => word.toUpperCase()), [heroSection]);
  const services = defaultServices.map((service, index) => ({
    title: contentValue(servicesSection, `service${index + 1}Title`, service.title),
    description: contentValue(servicesSection, `service${index + 1}Description`, service.description),
    image: mediaValue(servicesSection, `service${index + 1}`, service.image),
  }));

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentWord = heroWords[currentWordIndex] ?? heroWords[0] ?? '';

    if (isDeleting) {
      if (currentText === "") {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % Math.max(heroWords.length, 1));
        }, 40);
      } else {
        timer = setTimeout(() => {
          setCurrentText((prev) => prev.slice(0, -1));
        }, 40);
      }
    } else {
      if (currentText === currentWord) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 3000);
      } else {
        timer = setTimeout(() => {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        }, 120);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, heroWords]);

  return (
    <div className={` text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]`}>
      {/* 1. BRAND NAVIGATION HEADER */}

      {/* <header className=" sticky top-0 z-50 bg-[#000000]/95 backdrop-blur-md border-b border-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          <Link href="/"
            className="flex h-12 items-center select-none focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Return to portal"
          >
            <Image
              src="/cws_logo.png"
              alt="CWS"
              width={630}
              height={394}
              loading="eager"
              className="h-full w-auto object-contain"
            />
          </Link>

          Nav links
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-gray-300">
            <Link href="#about" className="hover:text-white transition-colors">About Us</Link>
            <Link href="#what-we-do" className="hover:text-white transition-colors">What We Do</Link>
            <Link href="#strategy" className="hover:text-white transition-colors">Company Strategy</Link>
            <Link href="#brands" className="hover:text-white transition-colors">Our Brands</Link>
            <Link href="#responsibility" className="hover:text-white transition-colors">Corporate Responsibility</Link>
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="marker-class theme-toggle-btn h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white hover:border-[#E02424]/60 hover:text-[#E02424] transition-all focus:outline-none focus:ring-2 focus:ring-[#E02424]/30 flex items-center justify-center"
                aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDarkTheme}
                title={isDarkTheme ? 'Light mode' : 'Dark mode'}
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </nav>

          Hamburger Mobile Toggle
          <div className="md:hidden flex items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="theme-toggle-btn h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white hover:text-[#E02424] transition-all focus:outline-none focus:ring-2 focus:ring-[#E02424]/30 flex items-center justify-center"
                aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDarkTheme}
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-450 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        Mobile Navigation Dropdown
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-[#111] border-b border-neutral-900 px-4 py-6 space-y-4 text-xs uppercase tracking-wider text-gray-300"
          >
            <Link href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">About Us</Link>
            <Link href="#what-we-do" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">What We Do</Link>
            <Link href="#strategy" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Company Strategy</Link>
            <Link href="#brands" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Our Brands</Link>
            <Link href="#responsibility" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Corporate Responsibility</Link>

          </motion.div>
        )}
      </header> */}

      {/* 2. HERO COVER SECTION */}
      {!heroSection?.paused && (
        <section className="relative h-[480px] sm:h-[600px] lg:h-[660px] bg-[#070707] overflow-hidden flex items-center">
          <div className="absolute inset-0 z-0">
            {mediaKind(heroSection, 'background') === 'video' ? (
              <video src={mediaValue(heroSection, 'background', '/assets/images/cws_hero_image.png')} autoPlay loop muted playsInline className="h-full w-full object-cover opacity-50" />
            ) : (
              <Image
                src={mediaValue(heroSection, 'background', '/assets/images/cws_hero_image.png')}
                alt="TKO Design Workspace Collage"
                fill
                loading="eager"
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
                <span className="block text-xs sm:text-sm font-sans font-bold text-white uppercase tracking-[0.4em] mb-4">{contentValue(heroSection, 'eyebrow', 'End-to-End Solution')}</span>
                <span className="block text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-white uppercase tracking-[0.2em]">{contentValue(heroSection, 'prefix', 'We')}</span>
                <span className="block min-h-[60px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[140px] text-6xl sm:text-[100px] md:text-[120px] lg:text-[140px] font-sans font-black text-[#E02424] uppercase tracking-tighter leading-none my-1">
                  {currentText}
                  <span className="animate-pulse ml-1 text-white font-light opacity-70">|</span>
                </span>
                <span className="block mt-6 sm:mt-8 text-xs sm:text-sm md:text-base font-sans font-medium text-neutral-400 tracking-[0.3em] uppercase max-w-lg ml-auto">
                  {contentValue(heroSection, 'supportingLabel', 'Premium Apparel')}
                </span>
                <span className="block text-2xl sm:text-3xl md:text-4xl font-sans font-semibold text-white uppercase tracking-[0.1em] leading-none mt-2 sm:mt-4">{contentValue(heroSection, 'headline', 'Knit, Woven & Sweater')}</span>
              </h1>
            </div>
          </div>
        </section>
      )}

      {/* 3. ABOUT US BLOCK */}
      {!aboutSection?.paused && (
        <section id="about" className="py-20 md:py-28 bg-transparent">
          <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-16">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-[#E02424] tracking-tight uppercase leading-snug">
                {contentValue(aboutSection, 'heading', 'About Us')}
              </h2>
              <p className="text-neutral-900 text-lg sm:text-xl font-light max-w-4xl mx-auto leading-relaxed pt-2">
                {contentValue(aboutSection, 'introduction', 'Cross Weave Sourcing (CWS) is an export-oriented garment manufacturer and global sourcing partner committed to delivering high-quality apparel solutions for international brands, retailers, and importers.')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
              <div className="space-y-6 text-neutral-600 leading-relaxed text-sm sm:text-base font-sans font-light">{contentList(aboutSection, 'paragraphs', []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>

              <div className="bg-[#F9F9F9] border border-neutral-100 p-8 sm:p-10 space-y-6">
                <h3 className="text-lg font-sans font-bold uppercase tracking-[0.2em] text-neutral-900 border-b border-neutral-200 pb-3">
                  WHY CHOOSE CWS
                </h3>
                <ul className="space-y-4">
                  {contentList(aboutSection, 'reasons', []).map((item, idx) => (
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
      )}

      {/* PRODUCTS */}
      {!productsSection?.paused && (
        <section id="products" className="py-16 md:py-24 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
              <div className="lg:col-span-5 space-y-3">
                <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
                  {contentValue(productsSection, 'eyebrow', 'Product Portfolio')}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
                  {contentValue(productsSection, 'heading', 'Products')}
                </h2>
              </div>
              <p className="lg:col-span-7 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light max-w-3xl lg:ml-auto">
                {contentValue(productsSection, 'body', 'Explore representative manufacturing categories supported by product development, private-label production, quality control and export coordination for global apparel programs.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
              {categories.map((category) => (
                <Link
                  key={category._id?.toString()}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className="group bg-[#F9F9F9] border border-neutral-100 transition-colors hover:border-[#E02424]/30 hover:bg-white"
                >
                  <div className="relative h-72 overflow-hidden bg-neutral-200">
                    <Image
                      src={category.image}
                      alt={`${category.name} product category`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
                  </div>
                  <article className="p-6 sm:p-8 space-y-5">
                    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#E02424]">
                        Category
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-[#E02424]" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-base sm:text-lg font-sans font-bold uppercase tracking-[0.12em] text-neutral-950 leading-snug">
                        {category.name}
                      </h3>
                      <p className="text-sm sm:text-base leading-relaxed text-neutral-600 font-sans font-light">
                        {category.description}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link
                href="/products"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black"
              >
                {contentValue(productsSection, 'ctaLabel', 'View All Products')}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 5. COMPANY STRATEGY */}
      {!strategySection?.paused && (
        <section id="strategy" className="py-16 md:py-24 bg-[#EAEAEA]">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
            <div className="relative order-2 lg:order-1 w-full h-[450px] lg:h-full min-h-[380px]">
              {mediaKind(strategySection, 'visual') === 'video' ? (
                <video src={mediaValue(strategySection, 'visual', '/assets/images/tko_collaboration_1780828202517.png')} autoPlay loop muted playsInline className="h-full w-full object-cover" />
              ) : (
                <Image
                  src={mediaValue(strategySection, 'visual', '/assets/images/tko_collaboration_1780828202517.png')}
                  alt="Company Strategy Sourcing Team"
                  fill
                  className="object-cover"
                />
              )}
            </div>

            <div className="space-y-12 flex flex-col justify-center order-1 lg:order-2">
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">{contentValue(strategySection, 'heading', 'Company Strategy')}</h2>
                <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
                  {contentList(strategySection, 'paragraphs', []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SERVICES SHOWCASE */}
      {!servicesSection?.paused && (
        <section id="services-showcase" className="w-full bg-white select-none border-t border-gray-100">
          <h2 className="sr-only">{contentValue(servicesSection, 'heading', 'Services Showcase')}</h2>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">
            {services.map((service, index) => {
              const imagePanel = (
                <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              );

              const textPanel = (
                <article className={`w-full h-[380px] sm:h-[480px] lg:h-[540px] p-8 sm:p-10 flex flex-col justify-center items-center relative text-center overflow-hidden ${index % 3 === 0 ? 'bg-[#1E1C1A] text-white' : index % 3 === 1 ? 'bg-white text-neutral-950 border-b border-gray-100' : 'bg-[#EAEAEA] text-neutral-950 border-b border-gray-200'}`}>
                  <div className="max-w-md space-y-6">
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase tracking-[0.4em] text-[#E02424] font-sans font-bold">
                        Service {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`block h-[1px] w-16 mx-auto ${index % 3 === 0 ? 'bg-white/20' : 'bg-neutral-300'}`} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans font-black uppercase tracking-[0.12em] leading-tight">
                      {service.title}
                    </h2>
                    <p className={`text-sm sm:text-base leading-relaxed font-sans font-light ${index % 3 === 0 ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      {service.description}
                    </p>
                  </div>
                </article>
              );

              return (
                <Fragment key={service.title}>
                  {index % 2 === 0 ? textPanel : imagePanel}
                  {index % 2 === 0 ? imagePanel : textPanel}
                </Fragment>
              );
            })}
          </div>
        </section>
      )}


      {/* SERVICES Section sample 1 */}
      {/* <section id="services" className="py-16 md:py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
            <div className="lg:col-span-5 space-y-3">
              <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">
                Our Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
                Services
              </h2>
            </div>
            <p className="lg:col-span-7 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light max-w-3xl lg:ml-auto">
              CWS provides complete apparel manufacturing and sourcing support for international brands, retailers and importers, managing each stage with transparent communication, reliable execution and shipment-focused coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
            {services.map((service, index) => (
              <article
                key={service.title}
                className="group bg-[#F9F9F9] border border-neutral-100 p-6 sm:p-8 min-h-56 flex flex-col justify-between transition-colors hover:border-[#E02424]/30 hover:bg-white"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-[#E02424]">
                      Service
                    </span>
                    <span className="text-xs font-sans font-bold text-neutral-400 tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-sans font-bold uppercase tracking-[0.12em] text-neutral-950 leading-snug">
                    {service.title}
                  </h3>
                </div>
                <p className="pt-6 text-sm sm:text-base leading-relaxed text-neutral-600 font-sans font-light">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section> */}

      {/* 5.5. Service Section sample 2 */}
      {/* <section id="services" className="py-20 md:py-28 bg-white border-b border-gray-150">
        <div className="max-w-7xl mx-auto px-6 md:px-12">

          <div className="text-center space-y-4 mb-16">
            <span className="block text-xs sm:text-sm font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">OUR CAPABILITIES</span>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold text-neutral-955 tracking-tight uppercase">
              SERVICES
            </h2>
            <div className="h-0.5 w-16 bg-[#E02424] mx-auto mt-4" />
            <p className="text-neutral-500 text-sm sm:text-base font-light max-w-2xl mx-auto mt-4">
              Providing end-to-end global apparel sourcing and manufacturing solutions with a strict focus on quality, speed, and reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            <div className="bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 hover:border-[#E02424] hover:shadow-lg hover:shadow-neutral-955/[0.02] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[#E02424] tracking-widest block">01 / CONCEPT</span>
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight group-hover:text-[#E02424] transition-colors">
                  Product Development & Sampling
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-light font-sans">
                  Technical design translation, pattern creation, and raw material sourcing. We deliver rapid prototype sampling to finalize fit and construction before bulk production.
                </p>
              </div>
            </div>

            <div className="bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 hover:border-[#E02424] hover:shadow-lg hover:shadow-neutral-955/[0.02] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[#E02424] tracking-widest block">02 / BRANDING</span>
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight group-hover:text-[#E02424] transition-colors">
                  Private Label Manufacturing
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-light font-sans">
                  Comprehensive OEM/ODM services built around your brand identity. We handle custom labeling, tags, custom hardware, and personalized packaging specifications.
                </p>
              </div>
            </div>

            <div className="bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 hover:border-[#E02424] hover:shadow-lg hover:shadow-neutral-955/[0.02] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[#E02424] tracking-widest block">03 / PRODUCTION</span>
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight group-hover:text-[#E02424] transition-colors">
                  Knit, Woven & Sweater Production
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-light font-sans">
                  Multi-product manufacturing capabilities. Our partner facilities produce high-quality garments from lightweight circular knits to heavy-gauge sweaters.
                </p>
              </div>
            </div>

            <div className="bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 hover:border-[#E02424] hover:shadow-lg hover:shadow-neutral-955/[0.02] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[#E02424] tracking-widest block">04 / FINANCE</span>
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight group-hover:text-[#E02424] transition-colors">
                  Costing & Commercial Support
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-light font-sans">
                  Transparent cost structures and financial planning. We optimize fabric consumption and production efficiency to offer competitive pricing options.
                </p>
              </div>
            </div>

            <div className="bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 hover:border-[#E02424] hover:shadow-lg hover:shadow-neutral-955/[0.02] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[#E02424] tracking-widest block">05 / AUDITING</span>
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight group-hover:text-[#E02424] transition-colors">
                  Quality Control & Inspection
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-light font-sans">
                  Strict inline and final AQL inspections conducted by our certified QA team. We ensure all garments align with international standards and client requirements.
                </p>
              </div>
            </div>

            <div className="bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 hover:border-[#E02424] hover:shadow-lg hover:shadow-neutral-955/[0.02] transition-all duration-300 flex flex-col justify-between group">
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[#E02424] tracking-widest block">06 / LOGISTICS</span>
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight group-hover:text-[#E02424] transition-colors">
                  Export Documentation & Logistics
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed font-light font-sans">
                  End-to-end logistics coordination. We manage export documentation, customs clearances, shipping line relations, and deliver cargo up to the designated port.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section> */}

      {/* Service sample 3 */}
      {/* <section id="services-showcase" className="w-full bg-white select-none border-t border-gray-200">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_workspace_1780828183652.png"
              alt="Product Development and Sampling"
              fill
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#101010] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative text-center">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E02424]" />
            <div className="max-w-md space-y-4 font-sans">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E02424] font-bold block">01 / CONCEPT</span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-tight text-white">
                PRODUCT DEVELOPMENT & SAMPLING
              </h3>
              <span className="text-xs italic text-neutral-400 block font-light">From concept sketch to physical prototype</span>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light font-sans pt-2">
                Technical design translation, expert pattern creation, fabric sourcing, and rapid sampling to establish precise styling and fit before bulk manufacturing begins.
              </p>
            </div>
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#F8F7F3] text-neutral-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative text-center order-2 md:order-1">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E02424]" />
            <div className="max-w-md space-y-4 font-sans">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E02424] font-bold block">02 / OEM & ODM</span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-tight text-neutral-955">
                PRIVATE LABEL MANUFACTURING
              </h3>
              <span className="text-xs italic text-neutral-500 block font-light">Engineered around your brand identity</span>
              <p className="text-xs sm:text-sm text-neutral-605 leading-relaxed font-light font-sans pt-2">
                Tailored manufacturing featuring custom labels, hangtags, brand detailing, custom hardware, and buyer-specific packaging solutions to fit your exact retail guidelines.
              </p>
            </div>
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden order-1 md:order-2">
            <Image
              src="/assets/images/tko_private_label_1780828295216.png"
              alt="Private Label Sourcing and Packaging"
              fill
              className="object-cover"
            />
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_hero_1780828164727.png"
              alt="Knit Woven and Sweater Garments"
              fill
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#DDDBCF] text-neutral-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative text-center">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-neutral-800" />
            <div className="max-w-md space-y-4 font-sans">
              <span className="text-[10px] uppercase tracking-[0.4em] text-neutral-850 font-bold block">03 / PRODUCTION</span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-tight text-neutral-950">
                KNIT, Woven & Sweater
              </h3>
              <span className="text-xs italic text-neutral-600 block font-light">Versatile capabilities for global retail</span>
              <p className="text-xs sm:text-sm text-neutral-705 leading-relaxed font-light font-sans pt-2">
                High-fidelity manufacturing across diverse fabric structures, from lightweight circular knits and structured wovens to heavy-gauge sweaters and outer layers.
              </p>
            </div>
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#1A1A1A] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative text-center order-2 md:order-1">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E02424]" />
            <div className="max-w-md space-y-4 font-sans">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E02424] font-bold block">04 / FINANCE</span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-tight text-white">
                COSTING & COMMERCIAL SUPPORT
              </h3>
              <span className="text-xs italic text-neutral-400 block font-light">Maximizing margins with full transparency</span>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light font-sans pt-2">
                Granular costing analyses, yield optimizations, raw material negotiation, and supply chain efficiency reviews to secure target margins without compromising quality.
              </p>
            </div>
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden order-1 md:order-2">
            <Image
              src="/assets/images/tko_collaboration_1780828202517.png"
              alt="Commercial Sourcing Negotiation Meeting"
              fill
              className="object-cover"
            />
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_weatherproof_model_1780828259409.png"
              alt="Quality Control Sourcing Inspection"
              fill
              loading="eager"
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#FFFFFF] text-neutral-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-center items-center relative text-center border-b border-neutral-100">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E02424]" />
            <div className="max-w-md space-y-4 font-sans">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E02424] font-bold block">05 / ASSURANCE</span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-tight text-neutral-950">
                QUALITY CONTROL & INSPECTION
              </h3>
              <span className="text-xs italic text-neutral-500 block font-light">Zero-defect standard from line to carton</span>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-light font-sans pt-2">
                Dedicated in-house QA teams executing pre-production checking, inline inspections, and final AQL random audits to guarantee compliance with international standards.
              </p>
            </div>
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#DDDCCB] p-8 flex flex-col justify-center items-center relative overflow-hidden order-2 md:order-1 text-center">
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: 'radial-gradient(#1E1E1E 15%, transparent 16%)',
              backgroundSize: '12px 12px'
            }} />
            <div className="absolute inset-x-0 top-0 h-[3px] bg-neutral-800" />
            <div className="max-w-md space-y-4 font-sans relative z-10">
              <span className="text-[10px] uppercase tracking-[0.4em] text-neutral-900 font-bold block">06 / DISTRIBUTION</span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-tight text-neutral-955">
                EXPORT LOGISTICS & COORDINATION
              </h3>
              <span className="text-xs italic text-neutral-700 block font-light">Seamless delivery to your global warehouses</span>
              <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-light font-sans pt-2">
                End-to-end management of export documentation, customs clearance, shipping line bookings, and freight tracking for reliable delivery to your port of choice.
              </p>
            </div>
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden order-1 md:order-2">
            <Image
              src="/assets/images/tko_american_republic_1780828278114.png"
              alt="Apparel Shipping Sourcing Logistics"
              fill
              className="object-cover"
            />
          </div>

        </div>
      </section> */}

      {/* Templets dummy codes */}
      {/* <section id="brands" className="w-full bg-white select-none marker-class2">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_copper_oak_model_1780828221993.png"
              alt="Copper and Oak Flannel Styling"
              fill
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#1E1C1A] text-white p-8 flex flex-col justify-center items-center relative text-center">
            <div className="max-w-md space-y-4">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#C39B62] font-semibold block">THE ADVENTUROUS IN SPIRIT</span>
              <span className="text-sm italic text-gray-400 font-serif block">The Authentic</span>
              <div className="space-y-1">
                <h3 className="text-4xl sm:text-5xl font-bold tracking-[0.15em] text-[#C39B62] font-serif uppercase">COPPER</h3>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-[1px] w-12 bg-[#C39B62]/40" />
                  <span className="text-lg font-serif text-amber-100/90 italic">&</span>
                  <div className="h-[1px] w-12 bg-[#C39B62]/40" />
                </div>
                <h3 className="text-4xl sm:text-5xl font-bold tracking-[0.15em] text-[#C39B62] font-serif uppercase">OAK</h3>
              </div>
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#C39B62] font-medium block">SUPPLY</span>
              <div className="pt-2 flex items-center justify-center gap-8 text-[9px] font-mono tracking-widest text-[#C39B62]/70">
                <span>TRD.</span>
                <span className="text-[#C39B62] font-serif font-bold text-xs">G</span>
                <span>MRK.</span>
              </div>
              <div className="pt-2">
                <span className="text-[9px] uppercase tracking-[0.22em] text-[#C39B62]/80 block">QUALITY GOODS FOR QUALITY PEOPLE</span>
              </div>
            </div>
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-white text-gray-905 p-8 flex flex-col justify-center items-center relative text-center border-b border-gray-100">
            <div className="max-w-md space-y-5">
              <div className="border border-neutral-900 rounded-full w-24 h-24 mx-auto flex flex-col items-center justify-center p-2 relative">
                <span className="font-serif italic font-extrabold text-4.5xl leading-none text-neutral-900">E</span>
                <span className="text-[8px] font-mono tracking-widest text-neutral-400 font-bold uppercase mt-1">EST. 1948</span>
              </div>
              <div>
                <h3 className="text-3xl sm:text-4xl font-serif text-neutral-950 leading-none">English Laundry</h3>
                <p className="text-[10px] font-serif tracking-[0.32em] font-light text-neutral-500 uppercase mt-2">Established 1948</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1 font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
                <span>🇬🇧</span>
                <span>ESTM. 1948</span>
              </div>
            </div>
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_english_laundry_model_1780828240798.png"
              alt="English Laundry Polo Fashion"
              fill
              loading="eager"
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_weatherproof_model_1780828259409.png"
              alt="Weatherproof Styling"
              fill
              loading="eager"
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#DDDCCB] p-8 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: 'radial-gradient(#1E1E1E 15%, transparent 16%)',
              backgroundSize: '12px 12px'
            }} />
            <div className="relative z-10 w-64 bg-[#EADBBD] border-2 border-[#C6B695] rounded-xs px-6 py-10 shadow-xl flex flex-col items-center text-center text-[#554A33] font-serif">
              <div className="w-5 h-5 rounded-full bg-[#DDDCCB] border border-[#C6B695] mb-4 flex items-center justify-center relative">
                <div className="absolute w-[2px] h-6 bg-stone-500 -top-6 rotate-12" />
                <div className="w-1.5 h-1.5 rounded-full bg-stone-800" />
              </div>
              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest font-sans text-[#7B6E4A] font-extrabold block">ORIGINAL</span>
                <h3 className="text-2.5xl font-serif italic text-[#3F3723] leading-none tracking-wide font-black">
                  Weatherproof
                </h3>
                <span className="text-[11px] tracking-[0.2em] font-sans font-bold text-[#8D7F58] block">VINTAGE</span>
                <div className="h-[1px] w-20 bg-[#C8B58D] mx-auto pt-0.5" />
                <p className="text-[8px] font-sans tracking-wide uppercase font-semibold text-[#8D7F58]">Registered Brand</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#EAEAEA] text-[#1E1E1E] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden border-b border-gray-200">
            <div className="space-y-2">
              <h3 className="text-4xl sm:text-5xl font-black font-serif text-gray-950 tracking-tight leading-none uppercase">
                American<br />Republic
              </h3>
              <p className="text-[10px] font-mono tracking-[0.4em] text-gray-500 uppercase pt-2">Premium Urban Sportswear</p>
            </div>
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_american_republic_1780828278114.png"
              alt="American Republic Plaid Shirts"
              fill
              className="object-cover"
            />
          </div>

          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_private_label_1780828295216.png"
              alt="Colorful Sweaters Activewear"
              fill
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#161616] text-white p-8 flex flex-col justify-center items-center relative overflow-hidden">
            <div className="text-center space-y-6">
              <span className="text-[10px] uppercase tracking-[0.3em] font-sans font-black text-neutral-500 block">RETAIL CUSTOMIZATION</span>
              <div className="relative leading-none">
                <h3 className="text-4xl sm:text-5xl md:text-6xl font-black font-sans uppercase tracking-[0.05em] text-white" style={{
                  textShadow: '1px 1px 0px #3F3F3F, 2px 2px 0px #3F3F3F, 3px 3px 0px #2E2E2E, 4px 4px 0px #2E2E2E, 5px 5px 0px #1E1E1E, 6px 6px 12px rgba(0,0,0,0.9)'
                }}>
                  PRIVATE<br />LABEL
                </h3>
              </div>
            </div>
          </div>

        </div>
      </section> */}

      {/* 7. TWO-COLUMN: CORPORATE RESPONSIBILITY & OUR MANAGEMENT (Taupe grid bg) */}
      {!responsibilitySection?.paused && <section id="responsibility" className="py-20 bg-[#EAEAEA] text-neutral-900 border-t border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left Column: Corporate Responsibility */}
          <div className="space-y-8">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">{contentValue(responsibilitySection, 'heading', 'Corporate Responsibility')}</h2>

            <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
              {contentValue(responsibilitySection, 'introduction', 'Ethical operations and responsible stewardship are the foundation of Cross Weave Sourcing.')}
            </p>

            <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-wider text-black">{contentValue(responsibilitySection, 'tagline', 'Do The Right Thing.')}</h3>

            <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
              {contentValue(responsibilitySection, 'commitment', 'This commitment guides the standards we maintain across our supply chain:')}
            </p>

            {/* Structured Tabular List in 2 columns (No checkboxes or checkmarks, pure text list matching screenshot!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-gray-300">
              {[0, 1].map((column) => <div key={column}><ul className="space-y-1.5 text-xs sm:text-sm font-sans font-medium text-neutral-850">{contentList(responsibilitySection, 'principles', []).filter((_, index) => index % 2 === column).map((principle) => <li key={principle}>{principle}</li>)}</ul></div>)}
            </div>
          </div>

          {/* Right Column: Our Management */}
          <div className="space-y-8 lg:pl-12 lg:border-l lg:border-gray-300">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">{contentValue(responsibilitySection, 'managementHeading', 'Our Management')}</h2>

            <div className="space-y-6 text-[#1E1E1E] text-[15px] leading-relaxed font-sans font-light">
              <p>{contentValue(responsibilitySection, 'managementBody', 'Our leadership team brings decades of collective expertise in the global apparel sector.')}</p>
              {/* <p>
                To learn more about our leadership,{' '}
                <button
                  onClick={handleReturnToPortal}
                  className="font-bold underline text-black hover:text-red-650 transition-colors uppercase tracking-wider text-xs"
                >
                  click here
                </button>.
              </p> */}
            </div>
          </div>

        </div>
      </section>}

      {/* 7.5. CONTRACTING WITH US SECTION */}
      {!contactSection?.paused && <section id="contracting" className="py-24 bg-white text-neutral-900 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center space-y-3 mb-16">
            <span className="block text-xl sm:text-2xl font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">{contentValue(contactSection, 'eyebrow', 'Direct Sourcing Channels')}</span>
            {/* <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
              CONTRACTING WITH US
            </h2> */}
            <p className="text-neutral-500 text-base sm:text-lg font-light max-w-2xl mx-auto">
              {contentValue(contactSection, 'introduction', 'Partner directly with our executive leadership to establish reliable production, quality assurance, and seamless apparel supply chains.')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-neutral-200 bg-[#F8F7F3] shadow-[0_24px_80px_rgba(15,15,15,0.08)]">
            <div className="lg:col-span-5 bg-[#101010] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between gap-12 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#E02424]" />
              <div className="space-y-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E02424]">
                  {contentValue(contactSection, 'panelLabel', 'Contact Information')}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-tight">
                  {contentValue(contactSection, 'panelHeading', "Let's build your next sourcing plan.")}
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-light">
                  {contentValue(contactSection, 'panelBody', 'Send production details, sampling needs, or buying requirements. Our team will review the request and connect with you directly.')}
                </p>
              </div>

              <div className="space-y-6">
                <a
                  href={`mailto:${contentValue(contactSection, 'email', 'info@crossweavesourcing.com')}`}
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
                      {contentValue(contactSection, 'email', 'info@crossweavesourcing.com')}
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
                      {contentValue(contactSection, 'bangladeshAddress', 'Bashundhara R/A, Chittagong, Bangladesh')}
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-400 font-light">
                      {contentValue(contactSection, 'usaAddress', 'Somerdale, NJ 08083, USA')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 bg-white">
              <div className="space-y-2 mb-8">
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight">{contentValue(contactSection, 'formHeading', 'Send Us a Message')}</h3>
              </div>

              {/* Contact Information form */}
              <ContactInformationForm submitLabel={contentValue(contactSection, 'submitLabel', 'Send Request')} />

            </div>
          </div>


        </div>
      </section>}

      

      <SiteFooter categories={categories} section={footerSection} />

    </div>
  );
}
