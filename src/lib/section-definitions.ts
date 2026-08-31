import type { CmsPageKey, CmsSection } from '@/lib/cms-dashboard';
import { cmsSections } from '@/lib/cms-dashboard';

export type SectionContentValue = string | string[];
export type SectionContent = Record<string, SectionContentValue>;

export type SectionMediaKind = 'image' | 'video';

export type SectionMediaValue = {
  url: string;
  kind: SectionMediaKind;
  publicId?: string;
  isDefault: boolean;
};

export type SectionMedia = Record<string, SectionMediaValue>;

export type SectionFieldDefinition = {
  key: string;
  label: string;
  control: 'text' | 'textarea' | 'list';
  maxLength: number;
  helper?: string;
};

export type SectionMediaSlotDefinition = {
  key: string;
  label: string;
  accepts: SectionMediaKind[];
  defaultUrl: string;
  helper?: string;
};

export type SectionDefinition = Pick<CmsSection, 'id' | 'label' | 'route' | 'summary' | 'paused' | 'status' | 'lastEdited'> & {
  pageKey: CmsPageKey;
  fields: SectionFieldDefinition[];
  mediaSlots: SectionMediaSlotDefinition[];
  defaultContent: SectionContent;
  visibilityEditable: boolean;
  ownershipNote?: string;
};

const text = (key: string, label: string, maxLength = 160, helper?: string): SectionFieldDefinition => ({
  key, label, control: 'text', maxLength, helper,
});
const area = (key: string, label: string, maxLength = 1200, helper?: string): SectionFieldDefinition => ({
  key, label, control: 'textarea', maxLength, helper,
});
const list = (key: string, label: string, maxLength = 240, helper?: string): SectionFieldDefinition => ({
  key, label, control: 'list', maxLength, helper,
});
const image = (key: string, label: string, defaultUrl: string, helper?: string): SectionMediaSlotDefinition => ({
  key, label, defaultUrl, helper, accepts: ['image'],
});
const visual = (key: string, label: string, defaultUrl: string, helper?: string): SectionMediaSlotDefinition => ({
  key, label, defaultUrl, helper, accepts: ['image', 'video'],
});

const editable: Record<string, Omit<SectionDefinition, keyof Pick<CmsSection, 'id' | 'label' | 'route' | 'summary' | 'paused' | 'status' | 'lastEdited' | 'pageKey'>>> = {
  'home-hero': {
    visibilityEditable: true,
    fields: [text('eyebrow', 'Eyebrow'), text('prefix', 'Headline prefix'), list('rotatingWords', 'Rotating words', 40), text('supportingLabel', 'Supporting label'), text('headline', 'Headline')],
    mediaSlots: [visual('background', 'Hero background', '/assets/images/cws_hero_image.png', 'Wide image or a muted looping video.')],
    defaultContent: { eyebrow: 'End-to-End Solution', prefix: 'We', rotatingWords: ['Source', 'Craft', 'Deliver'], supportingLabel: 'Premium Apparel', headline: 'Knit, Woven & Sweater' },
  },
  'home-about': {
    visibilityEditable: true,
    fields: [text('heading', 'Heading'), area('introduction', 'Introduction'), list('paragraphs', 'Body paragraphs', 900), list('reasons', 'Why choose CWS', 160)],
    mediaSlots: [],
    defaultContent: {
      heading: 'About Us',
      introduction: 'Cross Weave Sourcing (CWS) is an export-oriented garment manufacturer and global sourcing partner committed to delivering high-quality apparel solutions for international brands, retailers, and importers.',
      paragraphs: [
        'With expertise in knit, woven, and sweater products, we provide comprehensive manufacturing services—from product development and sampling to bulk production and final shipment. Backed by a reliable manufacturing network and an experienced merchandising team, we ensure consistent quality, ethical compliance, competitive pricing, and on-time delivery.',
        'At CWS, we believe strong partnerships are built on transparency, reliability, and excellence. Our focus is to create long-term value for our clients by delivering dependable production support and seamless sourcing solutions.',
      ],
      reasons: ['Export-Oriented Manufacturing', 'Quality-Assured Production', 'Experienced Sourcing & Merchandising Team', 'Competitive Pricing', 'On-Time Delivery', 'Transparent Communication & Dedicated Support'],
    },
  },
  'home-products': {
    visibilityEditable: true,
    fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading'), area('body', 'Introduction'), text('ctaLabel', 'Button label')],
    mediaSlots: [],
    ownershipNote: 'Category card names, descriptions, and images are managed in Category Manager.',
    defaultContent: { eyebrow: 'Product Portfolio', heading: 'Products', body: 'Explore representative manufacturing categories supported by product development, private-label production, quality control and export coordination for global apparel programs.', ctaLabel: 'View All Products' },
  },
  'home-strategy': {
    visibilityEditable: true,
    fields: [text('heading', 'Heading'), list('paragraphs', 'Body paragraphs', 900)],
    mediaSlots: [visual('visual', 'Strategy visual', '/assets/images/tko_collaboration_1780828202517.png')],
    defaultContent: { heading: 'Company Strategy', paragraphs: [
      'At Cross Weave Sourcing (CWS), our strategy is centered on delivering consistent value through quality, reliability, and long-term partnerships. We combine industry expertise, an extensive manufacturing network, and efficient supply chain management to provide apparel solutions that meet the evolving needs of global brands and retailers.',
      'By maintaining transparent communication, ensuring strict quality control, and optimizing every stage of production—from product development to final shipment—we help our clients reduce sourcing complexity while achieving competitive pricing and timely delivery.',
      'We are committed to continuous improvement, ethical manufacturing practices, and customer-focused innovation, enabling our partners to grow with confidence in an increasingly competitive global apparel market.',
    ] },
  },
  'home-services': {
    visibilityEditable: true,
    fields: [text('heading', 'Section heading'), ...Array.from({ length: 6 }, (_, index) => [text(`service${index + 1}Title`, `Service ${index + 1} title`), area(`service${index + 1}Description`, `Service ${index + 1} description`, 500)]).flat()],
    mediaSlots: [
      image('service1', 'Product development image', '/assets/images/service_product_development_sampling.jpg'),
      image('service2', 'Private label image', '/assets/images/service_private_label_manufacturing.jpg'),
      image('service3', 'Production image', '/assets/images/service_knit_woven_sweater_production.jpg'),
      image('service4', 'Commercial support image', '/assets/images/service_costing_commercial_support.jpg'),
      image('service5', 'Quality control image', '/assets/images/service_quality_control_inspection.jpg'),
      image('service6', 'Logistics image', '/assets/images/service_export_documentation_logistics.jpg'),
    ],
    defaultContent: {
      heading: 'Services Showcase',
      service1Title: 'Product Development & Sampling', service1Description: 'Support from concept review and material selection through fit samples, proto samples and pre-production approvals.',
      service2Title: 'Private Label Manufacturing', service2Description: 'End-to-end production for buyer-owned labels with brand-specific trims, packaging and quality requirements.',
      service3Title: 'Knit, Woven & Sweater Production', service3Description: 'Reliable manufacturing coordination across core apparel categories through a trusted production network.',
      service4Title: 'Costing & Commercial Support', service4Description: 'Transparent costing, supplier negotiation and commercial guidance to help brands meet target margins.',
      service5Title: 'Quality Control & Inspection', service5Description: 'Inline, midline and final inspection support to maintain product quality, compliance and shipment readiness.',
      service6Title: 'Export Documentation & Logistics Coordination', service6Description: 'Shipment follow-up, export document coordination and logistics support from production handover to delivery.',
    },
  },
  'home-responsibility': {
    visibilityEditable: true,
    fields: [text('heading', 'Responsibility heading'), area('introduction', 'Introduction'), text('tagline', 'Tagline'), area('commitment', 'Commitment'), list('principles', 'Principles', 160), text('managementHeading', 'Management heading'), area('managementBody', 'Management body')],
    mediaSlots: [],
    defaultContent: {
      heading: 'Corporate Responsibility', introduction: 'Ethical operations and responsible stewardship are the foundation of Cross Weave Sourcing. We collaborate exclusively with production facilities that mirror our devotion to human rights, safe operational standards, and ecological responsibility.', tagline: 'Do The Right Thing.', commitment: 'By championing transparency and holding ourselves to the highest benchmarks of quality and ethics, we deliver sustainable excellence for global brands while uplifting our workforce, our manufacturing partners, and the planet. This commitment guides our operations and defines the standards we maintain across our supply chain:',
      principles: ['Compliance with the Law', 'Child Labor', 'Harassment & Abuse', 'Customs', 'Non-Discrimination', 'Wage & Benefits', 'Hours & Overtime', 'Health & Safety', 'Environment', 'Forced or Compulsory Labor', 'Freedom of Association & Collective Bargaining'],
      managementHeading: 'Our Management', managementBody: 'Our leadership team brings decades of collective expertise in the global apparel sector. We combine deep creative vision with robust operational strategies to manage production complexity, maintain strict quality control, and cultivate strong partnerships with global suppliers and brands.',
    },
  },
  'home-contact': {
    visibilityEditable: true,
    fields: [
      text('eyebrow', 'Eyebrow'),
      area('introduction', 'Introduction'),
      text('panelLabel', 'Panel label'),
      text('panelHeading', 'Panel heading'),
      area('panelBody', 'Panel body'),
      text('person1Name', 'Person 1 Name'),
      text('person1Email', 'Person 1 Email'),
      text('person1Phone', 'Person 1 Phone'),
      area('person1UsaAddress', 'Person 1 USA Address'),
      area('person1BdAddress', 'Person 1 Bangladesh Address'),
      text('person2Name', 'Person 2 Name'),
      text('person2Email', 'Person 2 Email'),
      text('person2Phone', 'Person 2 Phone'),
      area('person2UsaAddress', 'Person 2 USA Address'),
      area('person2BdAddress', 'Person 2 Bangladesh Address'),
      text('formHeading', 'Form heading'),
      text('submitLabel', 'Submit button label'),
    ],
    mediaSlots: [],
    defaultContent: {
      eyebrow: 'Direct Sourcing Channels',
      introduction: 'Partner directly with our executive leadership to establish reliable production, quality assurance, and seamless apparel supply chains.',
      panelLabel: 'Contact Information',
      panelHeading: "Let's build your next sourcing plan.",
      panelBody: 'Send production details, sampling needs, or buying requirements. Our team will review the request and connect with you directly.',
      person1Name: 'ASHRAFUR RAHAMAN',
      person1Email: 'ashrahaman@crossweavesourcing.com',
      person1Phone: '+1 347 659 2484',
      person1UsaAddress: 'Serda, A White Horse Pike, Somerdale, NJ 08083, USA',
      person1BdAddress: 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh',
      person2Name: 'MD SHARIFUL ISLAM',
      person2Email: 'sharif@crossweavesourcing.com',
      person2Phone: 'USA: +1 609 453 5301 | BD: +880 1811-182609',
      person2UsaAddress: 'PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA',
      person2BdAddress: 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh',
      formHeading: 'Send Us a Message',
      submitLabel: 'Send Request',
    },
  },
  'products-hero': {
    visibilityEditable: true,
    fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading'), area('body', 'Body')],
    mediaSlots: [visual('background', 'Hero background', '/assets/images/service_knit_woven_sweater_production.jpg')],
    defaultContent: { eyebrow: 'Product Portfolio', heading: 'Manufacturing Capability', body: 'Explore representative knit, woven, sweater and accessory programs supported by development, sampling, private-label production, quality control and export coordination.' },
  },
  'products-portfolio': {
    visibilityEditable: true,
    fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading'), text('searchPlaceholder', 'Search placeholder'), text('itemLabel', 'Item count label'), area('emptyMessage', 'Empty state message')],
    mediaSlots: [], ownershipNote: 'Product cards and their media are managed in Product Manager.',
    defaultContent: { eyebrow: 'Manufacturing Portfolio', heading: 'All Products', searchPlaceholder: 'Search products', itemLabel: 'Items', emptyMessage: 'No products match the current search. Try another category or keyword.' },
  },
  'detail-hero': { visibilityEditable: true, fields: [text('backLabel', 'Back link label')], mediaSlots: [], ownershipNote: 'Product name, overview, category, and gallery are managed per product.', defaultContent: { backLabel: 'Back to Portfolio' } },
  'detail-overview': { visibilityEditable: true, fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading'), area('supportingText', 'Supporting text')], mediaSlots: [], ownershipNote: 'The product short description and manufacturing cards remain product data.', defaultContent: { eyebrow: 'Product Overview', heading: 'Built for Buyer Programs', supportingText: 'CWS positions this product as a manufacturing portfolio item, supported by sampling, commercial planning, quality checks and shipment coordination.' } },
  'detail-specs': { visibilityEditable: true, fields: [text('specificationsHeading', 'Specifications heading'), text('featuresHeading', 'Features heading')], mediaSlots: [], ownershipNote: 'Specification and feature values are managed per product.', defaultContent: { specificationsHeading: 'Specifications', featuresHeading: 'Features' } },
  'detail-gallery': { visibilityEditable: true, fields: [text('accessibleHeading', 'Accessible heading')], mediaSlots: [], ownershipNote: 'Gallery images are managed per product.', defaultContent: { accessibleHeading: 'Product Gallery' } },
  'detail-related': { visibilityEditable: true, fields: [text('eyebrow', 'Eyebrow'), text('heading', 'Heading'), area('body', 'Body')], mediaSlots: [], ownershipNote: 'Related product cards are selected from product data.', defaultContent: { eyebrow: 'Related Products', heading: 'Explore More', body: 'Representative portfolio items across CWS production categories, shown as manufacturing capabilities rather than retail SKUs.' } },
  'detail-cta': { visibilityEditable: true, fields: [text('eyebrow', 'Eyebrow'), text('headingTemplate', 'Heading template', 180, 'Use {category} where the product category should appear.'), area('body', 'Body'), text('buttonLabel', 'Button label')], mediaSlots: [], defaultContent: { eyebrow: 'Contact CTA', headingTemplate: 'Discuss a {category} Program', body: 'Share target product type, expected volume, sampling needs and delivery market. The CWS team can support development, costing, production follow-up and export coordination.', buttonLabel: 'Contact Us' } },
  'global-header': { visibilityEditable: false, fields: [], mediaSlots: [], ownershipNote: 'The public header is intentionally hidden. Manage future links in Navigation.', defaultContent: {} },
  'global-footer': {
    visibilityEditable: true,
    fields: [text('bangladeshLabel', 'Bangladesh office label'), area('bangladeshAddress', 'Bangladesh address'), text('usaLabel', 'USA office label'), area('usaAddress', 'USA address'), text('aboutHeading', 'About heading'), text('categoriesHeading', 'Categories heading'), text('responsibilityHeading', 'Responsibility heading'), text('followHeading', 'Social heading'), text('copyright', 'Copyright text', 240, 'Use {year} for the current year.')],
    mediaSlots: [image('logo', 'Footer logo', '/cws_logo.png')],
    ownershipNote: 'Footer navigation, category links, and social URLs remain in Navigation and Category Manager.',
    defaultContent: { bangladeshLabel: 'Bangladesh Office', bangladeshAddress: 'Bashundhara R/A, Road No. 3, Lane No. 3, House No. 1339/A, Ward No. 24, Chittagong, Bangladesh', usaLabel: 'USA Office & Mailing Address', usaAddress: 'PO Box: 41, 26 S White Horse Pike, Somerdale, NJ 08083, USA', aboutHeading: 'About Us', categoriesHeading: 'Product Categories', responsibilityHeading: 'Corporate Responsibility', followHeading: 'Follow Us', copyright: '© {year} Cross Weave Sourcing (CWS). All rights reserved.' },
  },
};

export const SECTION_DEFINITIONS: SectionDefinition[] = cmsSections.map((section) => ({
  ...section,
  ...editable[section.id],
}));

export const SECTION_DEFINITION_MAP = new Map(SECTION_DEFINITIONS.map((definition) => [definition.id, definition]));

export function defaultMediaFor(definition: SectionDefinition): SectionMedia {
  return Object.fromEntries(definition.mediaSlots.map((slot) => [slot.key, {
    url: slot.defaultUrl,
    kind: 'image' as const,
    isDefault: true,
  }]));
}

export function mergeSectionValues<T extends { sectionId: string; content?: SectionContent; media?: SectionMedia; mediaUrl?: string }>(section: T) {
  const definition = SECTION_DEFINITION_MAP.get(section.sectionId);
  if (!definition) return section;
  const media = { ...defaultMediaFor(definition), ...(section.media ?? {}) };
  if (section.mediaUrl && definition.mediaSlots[0] && !section.media?.[definition.mediaSlots[0].key]) {
    const primary = definition.mediaSlots[0];
    media[primary.key] = {
      url: section.mediaUrl,
      kind: /\.(mp4|webm|mov)(?:\?|$)/i.test(section.mediaUrl) ? 'video' : 'image',
      isDefault: false,
    };
  }
  return { ...section, content: { ...definition.defaultContent, ...(section.content ?? {}) }, media };
}
