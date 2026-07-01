"use client";
import { Fragment, useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, ArrowUpRight, Moon, Sun, Linkedin, Instagram, Facebook, Mail, MapPin, Send } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

interface TKOPageProps {
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

const services = [
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

export default function TKOPage({ theme = 'light', onToggleTheme }: TKOPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDarkTheme = theme === 'dark';

  const words = ["SOURCE", "CRAFT", "DELIVER"];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentWord = words[currentWordIndex];

    if (isDeleting) {
      if (currentText === "") {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
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
  }, [currentText, isDeleting, currentWordIndex]);

  // Contact Form State
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFormState({ name: '', email: '', subject: '', message: '' });
    // Reset success banner after 5 seconds
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  // Return to master platform
  const handleReturnToPortal = () => {
    window.history.pushState({ tab: 'home' }, '', '/cws-portal');
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className={`tko-page  tko-page-${theme} bg-white text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]`}>
      {/* 1. BRAND NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 bg-[#000000]/95 backdrop-blur-md border-b border-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          <button
            onClick={handleReturnToPortal}
            className="tko-logo-plate flex h-12 items-center select-none focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Return to CWS portal"
          >
            <Image
              src="/cws_logo.png"
              alt="CWS"
              width={630}
              height={394}
              loading="eager"
              className="h-full w-auto object-contain"
            />
          </button>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-gray-300">
            <a href="#about" className="hover:text-white transition-colors">About Us</a>
            <a href="#what-we-do" className="hover:text-white transition-colors">What We Do</a>
            <a href="#strategy" className="hover:text-white transition-colors">Company Strategy</a>
            <a href="#brands" className="hover:text-white transition-colors">Our Brands</a>
            <a href="#responsibility" className="hover:text-white transition-colors">Corporate Responsibility</a>
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="theme-toggle-btn h-9 w-9 rounded-full border border-white/15 bg-white/10 text-white hover:border-[#E02424]/60 hover:text-[#E02424] transition-all focus:outline-none focus:ring-2 focus:ring-[#E02424]/30 flex items-center justify-center"
                aria-label={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDarkTheme}
                title={isDarkTheme ? 'Light mode' : 'Dark mode'}
              >
                {isDarkTheme ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </nav>

          {/* Hamburger Mobile Toggle */}
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

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-[#111] border-b border-neutral-900 px-4 py-6 space-y-4 text-xs uppercase tracking-wider text-gray-300"
          >
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">About Us</a>
            <a href="#what-we-do" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">What We Do</a>
            <a href="#strategy" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Company Strategy</a>
            <a href="#brands" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Our Brands</a>
            <a href="#responsibility" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Corporate Responsibility</a>
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleReturnToPortal();
                }}
                className="w-full text-center flex items-center justify-center gap-1.5 bg-[#E02424] text-white py-3 text-xs font-bold tracking-widest"
              >
                RETURN TO CWS PORTAL
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* 2. HERO COVER SECTION (Right Aligned bold typography matching the design asset) */}
      <section className="relative h-[480px] sm:h-[600px] lg:h-[660px] bg-[#070707] overflow-hidden flex items-center">
        {/* Background photo collage exactly as shown */}
        {/* Background photo collage exactly as shown */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/images/cws_hero_image.png"
            alt="TKO Design Workspace Collage"
            fill
            loading="eager"
            sizes="100vw"
            className="object-cover opacity-50"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/10 z-[1]" />
          {/* Right-to-left blur overlay (blurry on right, clear on left) */}
          <div
            className="absolute inset-0 z-[2] backdrop-blur-[3px]"
            style={{
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)'
            }}
          />
        </div>

        {/* Text exactly matching layout and right-aligned position */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 flex justify-end">
          <div className="text-right select-none pr-4 md:pr-12 max-w-3xl">
            <h1 className="leading-none tracking-normal" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)' }}>
              <span className="block text-xs sm:text-sm font-sans font-bold text-white uppercase tracking-[0.4em] mb-4">END-TO-END SOLUTION</span>
              <span className="block text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-white uppercase tracking-[0.2em]">WE</span>
              <span className="block min-h-[60px] sm:min-h-[100px] md:min-h-[120px] lg:min-h-[140px] text-6xl sm:text-[100px] md:text-[120px] lg:text-[140px] font-sans font-black text-[#E02424] uppercase tracking-tighter leading-none my-1">
                {currentText}
                <span className="animate-pulse ml-1 text-white font-light opacity-70">|</span>
              </span>
              <span className="block mt-6 sm:mt-8 text-xs sm:text-sm md:text-base font-sans font-medium text-neutral-400 tracking-[0.3em] uppercase max-w-lg ml-auto">
                PREMIUM APPAREL
              </span>
              <span className="block text-2xl sm:text-3xl md:text-4xl font-sans font-semibold text-white uppercase tracking-[0.1em] leading-none mt-2 sm:mt-4">KNIT, WOVEN & SWEATER</span>
            </h1>
          </div>
        </div>
      </section>

      {/* 3. ABOUT US BLOCK (Pristine catalog look) */}
      <section id="about" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-[#E02424] tracking-tight uppercase leading-snug">
              ABOUT US
            </h2>
            <p className="text-neutral-900 text-lg sm:text-xl font-light max-w-4xl mx-auto leading-relaxed pt-2">
              Cross Weave Sourcing (CWS) is an export-oriented garment manufacturer and global sourcing partner committed to delivering high-quality apparel solutions for international brands, retailers, and importers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left: Description */}
            <div className="space-y-6 text-neutral-600 leading-relaxed text-sm sm:text-base font-sans font-light">
              <p>
                With expertise in knit, woven, and sweater products, we provide comprehensive manufacturing services—from product development and sampling to bulk production and final shipment. Backed by a reliable manufacturing network and an experienced merchandising team, we ensure consistent quality, ethical compliance, competitive pricing, and on-time delivery.
              </p>
              <p>
                At CWS, we believe strong partnerships are built on transparency, reliability, and excellence. Our focus is to create long-term value for our clients by delivering dependable production support and seamless sourcing solutions.
              </p>
            </div>

            {/* Right: Why Choose CWS */}
            <div className="bg-[#F9F9F9] border border-neutral-100 p-8 sm:p-10 space-y-6">
              <h3 className="text-lg font-sans font-bold uppercase tracking-[0.2em] text-neutral-900 border-b border-neutral-200 pb-3">
                WHY CHOOSE CWS
              </h3>
              <ul className="space-y-4">
                {[
                  "Export-Oriented Manufacturing",
                  "Quality-Assured Production",
                  "Experienced Sourcing & Merchandising Team",
                  "Competitive Pricing",
                  "On-Time Delivery",
                  "Transparent Communication & Dedicated Support"
                ].map((item, idx) => (
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

      {/* 4. TWO-COLUMN: WHAT WE DO & OUR APPROACH / WORKSPACE IMAGE */}
      <section id="what-we-do" className="py-16 md:py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          {/* Left Column: Text */}
          <div className="space-y-12 flex flex-col justify-center">
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-950">WHAT WE DO</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
                We deliver comprehensive apparel manufacturing and sourcing solutions tailored to the needs of global brands and retailers. Specializing in knit, woven, and sweater products, CWS oversees the entire supply chain—from initial product development, pattern making, and material sourcing to rigorous quality control, bulk production, and final shipment. We act as a seamless extension of your business to bring garments to market efficiently.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-950">OUR APPROACH</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
                Our approach is built on a foundation of quality, compliance, and transparent communication. We partner with a trusted manufacturing network and deploy an experienced in-house merchandising team to manage every stage of production. By maintaining strict quality assurance and keeping clients updated in real time, we guarantee that every batch of garments meets international standards, stays within budget, and is delivered on schedule.
              </p>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="relative w-full h-[400px] lg:h-full min-h-[380px] lg:min-h-[500px]">
            <Image
              src="/assets/images/tko_workspace_1780828183652.png"
              alt="TKO Fashion Design Workspace"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 5. REVERSED TWO-COLUMN: TEAM WORKING / COMPANY STRATEGY & BRANDS (Natural light gray bg) */}
      <section id="strategy" className="py-16 md:py-24 bg-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          {/* Left Column: Image */}
          <div className="relative order-2 lg:order-1 w-full h-[450px] lg:h-full min-h-[380px]">
            <Image
              src="/assets/images/tko_collaboration_1780828202517.png"
              alt="TKO Design Team Sourcing Sourcing Sourcing"
              fill
              className="object-cover"
            />
          </div>

          {/* Right Column: Text */}
          <div className="space-y-12 flex flex-col justify-center order-1 lg:order-2">
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">COMPANY STRATEGY</h2>
              <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
                <p>At Cross Weave Sourcing (CWS), our strategy is centered on delivering consistent value through quality, reliability, and long-term partnerships. We combine industry expertise, an extensive manufacturing network, and efficient supply chain management to provide apparel solutions that meet the evolving needs of global brands and retailers.</p>
                <p>By maintaining transparent communication, ensuring strict quality control, and optimizing every stage of production—from product development to final shipment—we help our clients reduce sourcing complexity while achieving competitive pricing and timely delivery.</p>
                <p>We are committed to continuous improvement, ethical manufacturing practices, and customer-focused innovation, enabling our partners to grow with confidence in an increasingly competitive global apparel market.</p>
              </div>
            </div>

            {/* <div className="space-y-4 marker-class">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">OUR BRANDS</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light font-sans">
                TKO creates unique lifestyle brands. Design focused and Sales driven we are passionate about creating high quality trend forward products for our multi-tiered channels of distribution.
              </p>
            </div> */}
          </div>
        </div>
      </section>

      {/* SERVICES SHOWCASE */}
      <section id="services-showcase" className="w-full bg-white select-none border-t border-gray-100">
        <h2 className="sr-only">Services Showcase</h2>
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


            {/* SERVICES */}
      <section id="services" className="marker-class py-16 md:py-24 bg-white border-t border-gray-100">
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
      </section>

      {/* 5.5. SERVICES SECTION */}
      <section id="services" className="py-20 md:py-28 bg-white border-b border-gray-150">
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

            {/* Service 1 */}
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

            {/* Service 2 */}
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

            {/* Service 3 */}
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

            {/* Service 4 */}
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

            {/* Service 5 */}
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

            {/* Service 6 */}
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
      </section>

      {/* 5.8. SERVICES GRID SHOWCASE (checkered pattern catalog layout matching brand showcase) */}
      <section id="services-showcase" className="w-full bg-white select-none border-t border-gray-200">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">

          {/* Service 1: Left Image & Right Text Card */}
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

          {/* Service 2: Left Text Card & Right Image */}
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

          {/* Service 3: Left Image & Right Text Card */}
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

          {/* Service 4: Left Text Card & Right Image */}
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

          {/* Service 5: Left Image & Right Text Card */}
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_weatherproof_model_1780828259409.png"
              alt="Quality Control Sourcing Inspection"
              fill
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

          {/* Service 6: Left Text Card & Right Image */}
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
      </section>

      {/* 6. BRAND GRID / SHOWCASE (Seamless checkered pattern catalog layout) */}
      <section id="brands" className="marker-class w-full bg-white select-none">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">

          {/* Row 1: Left Model (MountainLogs) & Right Copper & Oak Emblem */}
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

          {/* Row 2: Left English Laundry Logo block & Right Portrait Image */}
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

          {/* Row 3: Left Model & Right Weatherproof label card */}
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <Image
              src="/assets/images/tko_weatherproof_model_1780828259409.png"
              alt="Weatherproof Styling"
              fill
              className="object-cover"
            />
          </div>
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] bg-[#DDDCCB] p-8 flex flex-col justify-center items-center relative overflow-hidden">
            {/* Dots background pattern */}
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: 'radial-gradient(#1E1E1E 15%, transparent 16%)',
              backgroundSize: '12px 12px'
            }} />

            {/* Clothing cardboard tag */}
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

          {/* Row 4: Left American Republic Card & Right hanger products */}
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

          {/* Row 5: Left Sweaters hangar & Right Private Label 3D Text Card */}
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
      </section>

      {/* 7. TWO-COLUMN: CORPORATE RESPONSIBILITY & OUR MANAGEMENT (Taupe grid bg) */}
      <section id="responsibility" className="py-20 bg-[#EAEAEA] text-neutral-900 border-t border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left Column: Corporate Responsibility */}
          <div className="space-y-8">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">CORPORATE RESPONSIBILITY</h2>

            <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
              Ethical operations and responsible stewardship are the foundation of Cross Weave Sourcing. We collaborate exclusively with production facilities that mirror our devotion to human rights, safe operational standards, and ecological responsibility.
            </p>

            <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-wider text-black">DO THE RIGHT THING.</h3>

            <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
              By championing transparency and holding ourselves to the highest benchmarks of quality and ethics, we deliver sustainable excellence for global brands while uplifting our workforce, our manufacturing partners, and the planet. This commitment guides our operations and defines the standards we maintain across our supply chain:
            </p>

            {/* Structured Tabular List in 2 columns (No checkboxes or checkmarks, pure text list matching screenshot!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-gray-300">
              <div>
                <ul className="space-y-1.5 text-xs sm:text-sm font-sans font-medium text-neutral-850">
                  <li>Compliance with the Law</li>
                  <li>Child Labor</li>
                  <li>Harassment & Abuse</li>
                  <li>Customs</li>
                  <li>Non-Discrimination</li>
                  <li>Wage & Benefit's</li>
                </ul>
              </div>
              <div>
                <ul className="space-y-1.5 text-xs sm:text-sm font-sans font-medium text-neutral-850">
                  <li>Hours & Overtime</li>
                  <li>Health & Safety</li>
                  <li>Environment</li>
                  <li>Forced or Compulsory Labor</li>
                  <li>Freedom of Association & Collective Bargaining</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Our Management */}
          <div className="space-y-8 lg:pl-12 lg:border-l lg:border-gray-300">
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">OUR MANAGEMENT</h2>

            <div className="space-y-6 text-[#1E1E1E] text-[15px] leading-relaxed font-sans font-light">
              <p>
                Our leadership team brings decades of collective expertise in the global apparel sector. We combine deep creative vision with robust operational strategies to manage production complexity, maintain strict quality control, and cultivate strong partnerships with global suppliers and brands.
              </p>
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
      </section>

      {/* 7.5. CONTRACTING WITH US SECTION */}
      <section id="contracting" className="py-24 bg-white text-neutral-900 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center space-y-3 mb-16">
            <span className="block text-xl sm:text-2xl font-sans font-bold text-[#E02424] uppercase tracking-[0.3em]">DIRECT SOURCING CHANNELS</span>
            {/* <h2 className="text-3xl sm:text-4xl md:text-5xl font-sans font-bold text-neutral-900 tracking-tight uppercase leading-snug">
              CONTRACTING WITH US
            </h2> */}
            <p className="text-neutral-500 text-base sm:text-lg font-light max-w-2xl mx-auto">
              Partner directly with our executive leadership to establish reliable production, quality assurance, and seamless apparel supply chains.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-neutral-200 bg-[#F8F7F3] shadow-[0_24px_80px_rgba(15,15,15,0.08)]">
            <div className="lg:col-span-5 bg-[#101010] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between gap-12 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#E02424]" />
              <div className="space-y-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E02424]">
                  Contact Information
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-tight">
                  Let&apos;s build your next sourcing plan.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-light">
                  Send production details, sampling needs, or buying requirements. Our team will review the request and connect with you directly.
                </p>
              </div>

              <div className="space-y-6">
                <a
                  href="mailto:info@crossweavesourcing.com"
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
                      info@crossweavesourcing.com
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
                      Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-400 font-light">
                      PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 bg-white">
              <div className="space-y-2 mb-8">
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight">Send Us a Message</h3>
              </div>
              <form onSubmit={handleContactSubmit} className=" space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                      Name
                    </span>
                    <input
                      type="text"
                      name="name"
                      value={formState.name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Your name"
                      className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] px-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                      Email Address
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formState.email}
                      onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="you@example.com"
                      className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] px-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Subject
                  </span>
                  <input
                    type="text"
                    name="subject"
                    value={formState.subject}
                    onChange={(e) => setFormState((prev) => ({ ...prev, subject: e.target.value }))}
                    required
                    placeholder="Production inquiry"
                    className="h-12 w-full border border-neutral-200 bg-[#F9F9F9] px-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                    Message
                  </span>
                  <textarea
                    name="message"
                    value={formState.message}
                    onChange={(e) => setFormState((prev) => ({ ...prev, message: e.target.value }))}
                    required
                    rows={6}
                    placeholder="Tell us about product type, order volume, target timeline, and destination market."
                    className="min-h-36 w-full resize-y border border-neutral-200 bg-[#F9F9F9] px-4 py-3 text-sm leading-relaxed text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#E02424] focus:bg-white"
                  />
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 bg-[#E02424] px-7 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-neutral-400"
                  >
                    {isSubmitting ? 'Sending' : 'Contact Us'}
                    <Send className="h-4 w-4" />
                  </button>

                  {submitSuccess && (
                    <p className="text-sm font-medium text-[#E02424]">
                      Request received. Our team will contact you soon.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mt-12">

            {/* Left portion: Static Contact Info (5 cols) */}
            <div className="lg:col-span-5 space-y-10">

              {/* Email Us */}
              <div className="space-y-4">
                <div className="border-b border-[#E02424]/30 pb-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#E02424] rounded-full inline-block"></span>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E02424] font-sans">
                    EMAIL US
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">General Inquiries</span>
                    <a href="mailto:info@crossweavesourcing.com" className="text-neutral-800 hover:text-[#E02424] text-base font-light transition-colors break-all">
                      info@crossweavesourcing.com
                    </a>
                  </div>

                  <div className="pt-2 space-y-3">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Direct Executive Channels</span>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="text-xs">
                        <span className="font-semibold text-neutral-900 block">MD Shariful Islam</span>
                        <span className="text-neutral-500 block text-[10px] font-normal uppercase tracking-wider">Founder</span>
                        <a href="mailto:sharif@crossweavesourcing.com" className="text-neutral-600 hover:text-[#E02424] transition-colors break-all">
                          sharif@crossweavesourcing.com
                        </a>
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-neutral-900 block">MD. Shahnewaz Rajin</span>
                        <span className="text-neutral-500 block text-[10px] font-normal uppercase tracking-wider">Co-Founder</span>
                        <a href="mailto:rajin@crossweavesourcing.com" className="text-neutral-600 hover:text-[#E02424] transition-colors break-all">
                          rajin@crossweavesourcing.com
                        </a>
                      </div>
                      <div className="text-xs col-span-1 sm:col-span-2 lg:col-span-1">
                        <span className="font-semibold text-neutral-900 block">Ashrafur Rahaman</span>
                        <span className="text-neutral-500 block text-[10px] font-normal uppercase tracking-wider">Co-Founder</span>
                        <a href="mailto:ashrahaman@crossweavesourcing.com" className="text-neutral-600 hover:text-[#E02424] transition-colors break-all">
                          ashrahaman@crossweavesourcing.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Us */}
              <div className="space-y-4">
                <div className="border-b border-[#E02424]/30 pb-3 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-[#E02424] rounded-full inline-block"></span>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#E02424] font-sans">
                    VISIT US
                  </h3>
                </div>
                <div className="space-y-5 text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Bangladesh Office</span>
                    <p className="text-neutral-700 leading-relaxed font-light text-sm">
                      Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">USA Office & Mailing Address</span>
                    <p className="text-neutral-700 leading-relaxed font-light text-sm">
                      PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right portion: Message Form (7 cols) */}
            <div className="lg:col-span-7 bg-[#FBFBFA] border border-neutral-200/80 rounded-xl p-8 md:p-10 shadow-sm">
              <div className="space-y-2 mb-8">
                <h3 className="text-lg font-bold text-neutral-900 font-sans tracking-tight">Send Us a Message</h3>
                <p className="text-xs text-neutral-500 font-light">
                  Have a specific sourcing request or inquiry? Send us a message and our executive leadership will get back to you.
                </p>
              </div>

              {submitSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-4 mb-6 flex flex-col gap-1 font-sans"
                >
                  <span className="font-bold">Thank you for reaching out!</span>
                  <span className="font-light text-emerald-700">Your message has been sent successfully. We will get back to you shortly.</span>
                </motion.div>
              ) : null}

              <form onSubmit={handleContactSubmit} className="space-y-6 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="form-name" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      id="form-name"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-955 placeholder:text-neutral-400 focus:outline-none focus:border-[#E02424] focus:ring-1 focus:ring-[#E02424] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="form-email" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      id="form-email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="e.g. john@example.com"
                      className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-955 placeholder:text-neutral-400 focus:outline-none focus:border-[#E02424] focus:ring-1 focus:ring-[#E02424] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="form-subject" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Subject</label>
                  <input
                    type="text"
                    id="form-subject"
                    required
                    value={formState.subject}
                    onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                    placeholder="e.g. Partnership Request / Custom Apparel Sourcing"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-955 placeholder:text-neutral-400 focus:outline-none focus:border-[#E02424] focus:ring-1 focus:ring-[#E02424] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="form-message" className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Message</label>
                  <textarea
                    id="form-message"
                    required
                    rows={5}
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    placeholder="Describe your requirements, volume requirements, or questions..."
                    className="w-full bg-white border border-neutral-300 rounded-lg px-4 py-3 text-sm text-neutral-955 placeholder:text-neutral-400 focus:outline-none focus:border-[#E02424] focus:ring-1 focus:ring-[#E02424] transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#E02424] hover:bg-neutral-950 text-white font-bold uppercase tracking-widest text-xs py-4 px-6 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#E02424] focus:ring-offset-2 disabled:bg-neutral-400 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>SENDING REQUEST...</span>
                    </>
                  ) : (
                    <span>SEND REQUEST</span>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* 8. MINIMAL DESIGNER FOOTER */}
      <footer className="bg-[#DDDBCF] text-neutral-900 pt-16 pb-12 border-t border-neutral-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">

          {/* Column 1: Logo & Office Info (Spans 5 cols on desktop) */}
          <div className="col-span-1 md:col-span-5 space-y-6">
            <div className="w-40 h-12 relative mb-4">
              <Image
                src="/cws_logo.png"
                alt="CWS"
                fill
                sizes="(max-width: 768px) 160px, 160px"
                className="object-contain object-left"
              />
            </div>

            <div className="space-y-6 text-neutral-700">
              <div className="text-[11px] font-sans tracking-wider uppercase">
                <span className="font-sans font-bold uppercase tracking-[0.15em] text-[10px] text-black block mb-2">Bangladesh Office</span>
                <p className="leading-relaxed text-neutral-600 normal-case font-light">Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh</p>
              </div>
              <div className="text-[11px] font-sans tracking-wider uppercase">
                <span className="font-sans font-bold uppercase tracking-[0.15em] text-[10px] text-black block mb-2">USA Office & Mailing Address</span>
                <p className="leading-relaxed text-neutral-600 normal-case font-light">PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA</p>
              </div>
            </div>
          </div>

          {/* Column 2: ABOUT US (Spans 2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-4 md:border-l md:border-neutral-300/60 md:pl-8">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">ABOUT US</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><a href="#about" className="hover:text-black transition-colors">OUR APPROACH</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">WHAT WE DO</a></li>
              <li><a href="#strategy" className="hover:text-black transition-colors">COMPANY STRATEGY</a></li>
              <li><a href="#responsibility" className="hover:text-black transition-colors">MANAGEMENT</a></li>
            </ul>
          </div>

          {/* Column 3: PRODUCT CATEGORIES (Spans 2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-4 md:border-l md:border-neutral-300/60 md:pl-8">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">PRODUCT CATEGORIES</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><a href="#what-we-do" className="hover:text-black transition-colors">KNIT</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">WOVEN</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">SWEATER</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">BAG</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">WALLET</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">HAT</a></li>
            </ul>
          </div>

          {/* Column 4: CORPORATE RESPONSIBILITY (Spans 3 cols) */}
          <div className="col-span-1 md:col-span-3 space-y-6 md:border-l md:border-neutral-300/60 md:pl-8">
            <div className="space-y-4">
              <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">CORPORATE RESPONSIBILITY</h5>
              <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
                <li><a href="#responsibility" className="hover:text-black transition-colors">DO THE RIGHT THING</a></li>
              </ul>
            </div>

            <div className="space-y-4 border-t border-neutral-300/60 pt-5">
              <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">FOLLOW US</h5>
              <div className="flex gap-4 pt-1">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-black/5 hover:bg-[#E02424] hover:text-white transition-all text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black/25"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-black/5 hover:bg-[#E02424] hover:text-white transition-all text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black/25"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-black/5 hover:bg-[#E02424] hover:text-white transition-all text-neutral-700 focus:outline-none focus:ring-1 focus:ring-black/25"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Accent/Copyright bar */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-8 mt-12 border-t border-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-neutral-600 font-sans uppercase tracking-wider ">
          <span className='ml-auto'>© {new Date().getFullYear()} Cross Weave Sourcing (CWS). All rights reserved.</span>
          {/* <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
            <button onClick={handleReturnToPortal} className="hover:text-black transition-colors">CAREERS</button>
            <span className="text-neutral-300 hidden sm:inline">|</span>
            <button onClick={handleReturnToPortal} className="hover:text-black transition-colors">TERMS OF USE</button>
            <span className="text-neutral-300 hidden sm:inline">|</span>
            <button onClick={handleReturnToPortal} className="hover:text-black transition-colors">PRIVACY POLICY</button>
          </div> */}
        </div>
      </footer>
    </div>
  );
}
