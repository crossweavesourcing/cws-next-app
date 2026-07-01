"use client";

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Menu, X, ArrowUpRight, Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

interface TKOPageProps {
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export default function TKOPage({ theme = 'light', onToggleTheme }: TKOPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDarkTheme = theme === 'dark';

  // Return to master platform
  const handleReturnToPortal = () => {
    window.history.pushState({ tab: 'home' }, '', '/cws-portal');
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className={`tko-page tko-page-${theme} bg-white text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]`}>
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
              className="h-full w-auto object-contain"
            />
          </button>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-gray-300">
            <a href="#story" className="hover:text-white transition-colors">Our Story</a>
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
            <a href="#story" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-white">Our Story</a>
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
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/images/tko_hero_1780828164727.png"
            alt="TKO Design Workspace Collage"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Text exactly matching layout and right-aligned position */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 flex justify-end">
          <div className="text-right select-none pr-4 md:pr-12 max-w-xl">
            <h1 className="leading-none tracking-normal">
              <span className="block text-4xl sm:text-5xl md:text-6xl font-sans font-light text-white uppercase tracking-[0.2em]">WE</span>
              <span className="block text-6xl sm:text-[100px] md:text-[120px] lg:text-[140px] font-sans font-black text-[#E02424] uppercase tracking-tighter leading-none my-1">DESIGN</span>
              <span className="block text-4xl sm:text-5xl md:text-6xl font-sans font-semibold text-white uppercase tracking-[0.1em] leading-none">APPAREL</span>
            </h1>
          </div>
        </div>
      </section>

      {/* 3. OUR STORY BLOCK (Pristine catalog look) */}
      <section id="story" className="py-20 md:py-28 bg-white text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.25em] text-gray-905">OUR STORY</h2>
          <p className="text-gray-800 leading-relaxed text-[15px] sm:text-base md:text-lg font-sans font-light max-w-3xl mx-auto">
            tko evolution is a highly respected company with a world wide reach. With a focus on design, we create stylish consumer focused apparel for our signature brands. Our diverse fashion forward portfolio includes: Copper and Oak, English Laundry, American Republic, Retailer Private Label and Weatherproof Vintage. Brands which inspire customer loyalty, lifestyle and comfort in markets across the globe.
          </p>
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
                We are fashion creators, makers, and idea people. We execute our brands vision by sourcing fabrics, trim and materials from across the globe to ensure value and high quality. TKO&apos;s technical expertise in design and eye for detail means that our customers are always assured the very best products at competitive pricing.
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">OUR APPROACH</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
                TKO has assembled a world class design team, that is experienced and well-versed in many product categories. The company&apos;s core competency is menswear, offering products ranging from casual sportswear to niche lifestyle apparel. Our creative mission is to offer and market fashion-right branded lifestyle products that appeal to a broad and diverse customer base. Extensive consumer and fashion trend research, along with the ever vigilant monitoring of retail sales, enables us to deliver the right products at the right time to the right distribution channels.
              </p>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="relative">
            <img
              src="/assets/images/tko_workspace_1780828183652.png"
              alt="TKO Fashion Design Workspace"
              className="w-full h-[400px] lg:h-full object-cover min-h-[380px] lg:min-h-[500px]"
            />
          </div>
        </div>
      </section>

      {/* 5. REVERSED TWO-COLUMN: TEAM WORKING / COMPANY STRATEGY & BRANDS (Natural light gray bg) */}
      <section id="strategy" className="py-16 md:py-24 bg-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          {/* Left Column: Image */}
          <div className="relative order-2 lg:order-1">
            <img
              src="/assets/images/tko_collaboration_1780828202517.png"
              alt="TKO Design Team Sourcing Sourcing Sourcing"
              className="w-full h-[450px] lg:h-full object-cover min-h-[380px]"
            />
          </div>

          {/* Right Column: Text */}
          <div className="space-y-12 flex flex-col justify-center order-1 lg:order-2">
            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">COMPANY STRATEGY</h2>
              <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light">
                <p>We are focused on driving strategic initiatives designed to enhance revenue and profitability with a portfolio of brands that we offer to multiple channels of distribution.</p>
                <p>We manage brand individuality and develop a distinctive merchandising and marketing strategy for each product category and distribution channel.</p>
                <p>We partner with leading retail customers, in national and regional department stores, chain, mass market and specialty stores, in North America, Europe, Asia and Australia.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-955">OUR BRANDS</h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-sans font-light font-sans">
                TKO creates unique lifestyle brands. Design focused and Sales driven we are passionate about creating high quality trend forward products for our multi-tiered channels of distribution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BRAND GRID / SHOWCASE (Seamless checkered pattern catalog layout) */}
      <section id="brands" className="w-full bg-white select-none">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">

          {/* Row 1: Left Model (MountainLogs) & Right Copper & Oak Emblem */}
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <img
              src="/assets/images/tko_copper_oak_model_1780828221993.png"
              alt="Copper and Oak Flannel Styling"
              className="w-full h-full object-cover"
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
            <img
              src="/assets/images/tko_english_laundry_model_1780828240798.png"
              alt="English Laundry Polo Fashion"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Row 3: Left Model & Right Weatherproof label card */}
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <img
              src="/assets/images/tko_weatherproof_model_1780828259409.png"
              alt="Weatherproof Styling"
              className="w-full h-full object-cover"
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
            <img
              src="/assets/images/tko_american_republic_1780828278114.png"
              alt="American Republic Plaid Shirts"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Row 5: Left Sweaters hangar & Right Private Label 3D Text Card */}
          <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative overflow-hidden">
            <img
              src="/assets/images/tko_private_label_1780828295216.png"
              alt="Colorful Sweaters Activewear"
              className="w-full h-full object-cover"
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
            <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-[0.2em] text-gray-950">CORPORATE RESPONSIBILITY</h2>

            <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
              At TKO, we have a long standing set of core principles: respect for people; ethics in the way we conduct our business; and integrity and honesty in everything we do. We often sum this up in four words:
            </p>

            <h3 className="text-2xl sm:text-3xl font-sans font-black tracking-wider text-black">DO THE RIGHT THING.</h3>

            <p className="text-neutral-800 text-[15px] leading-relaxed font-sans font-light">
              For us, doing the right thing is more than just words - it&apos;s at the heart of who we are as a company. What does &apos;doing the right thing&apos; mean in the context of our corporate social responsibility? We believe it means doing the right thing for people, the places we work and our planet. That&apos;s led us to establish the TKO Code of Conduct, that clearly specifies the minimum working and environmental conditions we require throughout our supply chain:
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
                  <li>Wage & Benefits</li>
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
                Our senior management team averages more than Thirty years in the apparel industry and has extensive creative and operational experience developing, marketing and growing brands. Building strong relationships with retailers, and global suppliers.
              </p>
              <p>
                To learn more about our leadership,{' '}
                <button
                  onClick={handleReturnToPortal}
                  className="font-bold underline text-black hover:text-red-650 transition-colors uppercase tracking-wider text-xs"
                >
                  click here
                </button>.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 8. MINIMAL DESIGNER FOOTER */}
      <footer className="bg-[#DDDBCF] text-neutral-900 pt-16 pb-12 border-t border-neutral-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Column 1: OUR STORY */}
          <div className="space-y-4">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">OUR STORY</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><a href="#story" className="hover:text-black transition-colors">OUR APPROACH</a></li>
              <li><a href="#what-we-do" className="hover:text-black transition-colors">WHAT WE DO</a></li>
              <li><a href="#strategy" className="hover:text-black transition-colors">COMPANY STRATEGY</a></li>
              <li><a href="#responsibility" className="hover:text-black transition-colors">MANAGEMENT</a></li>
            </ul>
          </div>

          {/* Column 2: OUR BRANDS */}
          <div className="space-y-4">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">OUR BRANDS</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><a href="#brands" className="hover:text-black transition-colors">COPPER & OAK</a></li>
              <li><a href="#brands" className="hover:text-black transition-colors">WEATHERPROOF VINTAGE</a></li>
              <li><a href="#brands" className="hover:text-black transition-colors">AMERICAN REPUBLIC</a></li>
              <li><a href="#brands" className="hover:text-black transition-colors">PRIVATE LABEL</a></li>
            </ul>
          </div>

          {/* Column 3: CORPORATE RESPONSIBILITY */}
          <div className="space-y-4">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">CORPORATE RESPONSIBILITY</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><a href="#responsibility" className="hover:text-black transition-colors">DO THE RIGHT THING</a></li>
            </ul>
          </div>

          {/* Column 4: CONTACT US */}
          <div className="space-y-4">
            <h5 className="font-sans font-bold uppercase tracking-[0.15em] text-xs text-black">CONTACT US</h5>
            <ul className="space-y-2 text-[11px] font-sans tracking-wider text-neutral-700 uppercase">
              <li><button onClick={handleReturnToPortal} className="hover:text-black transition-colors uppercase text-left">CAREERS</button></li>
              <li><button onClick={handleReturnToPortal} className="hover:text-black transition-colors uppercase text-left">TERMS OF USE</button></li>
              <li><button onClick={handleReturnToPortal} className="hover:text-black transition-colors uppercase text-left">PRIVACY POLICY</button></li>
            </ul>
          </div>

        </div>

        {/* Footer Accent/Copyright bar */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-12 mt-12 border-t border-neutral-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <button
            onClick={handleReturnToPortal}
            className="tko-logo-plate flex h-10 items-center select-none focus:outline-none focus:ring-2 focus:ring-black/20"
            aria-label="Return to CWS portal"
          >
            <Image
              src="/cws_logo.png"
              alt="CWS"
              width={630}
              height={394}
              className="h-full w-auto object-contain"
            />
          </button>
          <span>© {new Date().getFullYear()} TKO Evolution Apparel LLC. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
