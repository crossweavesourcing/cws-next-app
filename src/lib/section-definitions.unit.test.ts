import { describe, expect, it } from 'vitest';
import { SECTION_DEFINITIONS, defaultMediaFor, mergeSectionValues } from '@/lib/section-definitions';

describe('section definitions', () => {
  it('defines each of the 17 public sections exactly once', () => {
    expect(SECTION_DEFINITIONS).toHaveLength(17);
    expect(new Set(SECTION_DEFINITIONS.map((section) => section.id)).size).toBe(17);
  });

  it('uses unique field and media-slot keys within every section', () => {
    for (const section of SECTION_DEFINITIONS) {
      expect(new Set(section.fields.map((field) => field.key)).size).toBe(section.fields.length);
      expect(new Set(section.mediaSlots.map((slot) => slot.key)).size).toBe(section.mediaSlots.length);
    }
  });

  it('merges persisted overrides without losing section defaults', () => {
    const merged = mergeSectionValues({
      sectionId: 'home-hero',
      content: { eyebrow: 'A new eyebrow' },
      media: {},
    });
    const def = SECTION_DEFINITIONS.find((s) => s.id === 'home-hero')!;
    expect(merged.content?.eyebrow).toBe('A new eyebrow');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((merged.content as any)?.rotatingWords).toEqual(['Source', 'Craft', 'Deliver']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((def.defaultContent as any).rotatingWords).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((defaultMediaFor(def) as any).background).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((merged.media as any)?.background).toEqual({
      url: '/assets/images/cws_hero_image.png',
      kind: 'image',
      isDefault: true,
    });
  });

  it('creates explicit default media for every visual slot', () => {
    const services = SECTION_DEFINITIONS.find((section) => section.id === 'home-services')!;
    expect(Object.keys(defaultMediaFor(services))).toHaveLength(6);
    expect(Object.values(defaultMediaFor(services)).every((media) => media.kind === 'image' && media.isDefault)).toBe(true);
  });
});
