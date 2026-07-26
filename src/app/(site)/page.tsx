import { CategoryRepository } from '@/auth/repositories/category.repository';
import { SectionService } from '@/auth/services/section.service';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const categoryRepo = new CategoryRepository();
  const categories = await categoryRepo.findAll();

  const sectionService = new SectionService();
  const sections = await sectionService.getPublicSections();

  const serializedCategories = categories.map(cat => ({
    ...cat,
    _id: cat._id.toString(),
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];

  const serializedSections = JSON.parse(JSON.stringify(sections));

  return <HomePageClient categories={serializedCategories} sections={serializedSections} />;
}
