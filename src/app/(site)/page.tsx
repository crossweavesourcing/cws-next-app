import { CategoryRepository } from '@/auth/repositories/category.repository';
import { SectionService } from '@/auth/services/section.service';
import { getEnv } from '@/auth/config/env';
import { buildWebPageSchema, serializeJsonLd } from '@/lib/seo/schema-builders';
import SiteFooter from '@/components/SiteFooter';

import HomeHeroSection from './_components/HomeHeroSection';
import AboutSection from './_components/AboutSection';
import ProductsSection from './_components/ProductsSection';
import StrategySection from './_components/StrategySection';
import ServicesSection from './_components/ServicesSection';
import ResponsibilitySection from './_components/ResponsibilitySection';
import ContactSection from './_components/ContactSection';
import type { SectionItem } from './_components/SectionHelpers';

export const revalidate = 3600; // ISR baseline revalidation: 1 hour

export default async function HomePage() {
  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const sectionService = new SectionService();
  const sections = await sectionService.getPublicSections();

  const env = getEnv();
  const schema = buildWebPageSchema(
    env.APP_URL,
    '/',
    'Cross Weave Sourcing | Export-Oriented Garments Manufacturer & Buyer Agent',
    'Cross Weave Sourcing (CWS) is an export-oriented garments manufacturer and global sourcing partner for knit, woven and sweater products, supporting brands with development, sampling, bulk production and shipment.'
  );

  const sectionMap = new Map(sections.map((s) => [s.sectionId, s as SectionItem]));
  
  const heroSection = sectionMap.get('home-hero');
  const aboutSection = sectionMap.get('home-about');
  const productsSection = sectionMap.get('home-[#products]') || sectionMap.get('home-products');
  const strategySection = sectionMap.get('home-strategy');
  const servicesSection = sectionMap.get('home-services');
  const responsibilitySection = sectionMap.get('home-responsibility');
  const contactSection = sectionMap.get('home-contact');
  const footerSection = sectionMap.get('global-footer');

  return (
    <main id="main-content" className="text-[#1E1E1E] min-h-screen font-sans antialiased selection:bg-[#E02424]/10 selection:text-[#E02424]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <HomeHeroSection section={heroSection} />
      <AboutSection section={aboutSection} />
      <ProductsSection section={productsSection} categories={categories} />
      <StrategySection section={strategySection} />
      <ServicesSection section={servicesSection} />
      <ResponsibilitySection section={responsibilitySection} />
      <ContactSection section={contactSection} />
      <SiteFooter categories={categories} section={footerSection} />
    </main>
  );
}
