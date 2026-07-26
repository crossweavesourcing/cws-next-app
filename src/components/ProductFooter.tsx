import { CategoryRepository } from '@/auth/repositories/category.repository';
import { SectionService } from '@/auth/services/section.service';
import SiteFooter from '@/components/SiteFooter';

export default async function ProductFooter() {
  const [categories, sections] = await Promise.all([
    new CategoryRepository().findAll(),
    new SectionService().getPublicSections(),
  ]);
  const footer = sections.find((section) => section.sectionId === 'global-footer');
  return <SiteFooter categories={categories} section={footer} />;
}
