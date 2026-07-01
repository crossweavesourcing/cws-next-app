export const productCategories = ['All', 'Knit', 'Woven', 'Sweater', 'Bag', 'Wallet', 'Hat'] as const;

export type ProductCategory = Exclude<(typeof productCategories)[number], 'All'>;

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  shortDescription: string;
  overview: string;
  image: string;
  images: string[];
  manufacturing: string[];
  specifications: {
    material: string;
    productionFocus: string;
    finishing: string;
    quality: string;
  };
  features: string[];
};

export const categoryCards: Array<{
  name: ProductCategory;
  description: string;
  image: string;
}> = [
  {
    name: 'Knit',
    description: 'T-shirts, polos, fleece and jersey programs developed for comfort, fit and consistent bulk execution.',
    image: '/assets/images/products/category-knit-tshirt.webp',
  },
  {
    name: 'Woven',
    description: 'Structured shirts, bottoms and casual woven styles supported from fabric sourcing through shipment.',
    image: '/assets/images/products/category-woven-shirt.jpg',
  },
  {
    name: 'Sweater',
    description: 'Fine-gauge and heavy-gauge sweater production with attention to handfeel, finishing and measurement control.',
    image: '/assets/images/products/category-sweater-cardigan.jpg',
  },
  {
    name: 'Bag',
    description: 'Utility totes, travel bags and soft accessories coordinated with private-label trim and packaging options.',
    image: '/assets/images/products/category-bag-tote.jpg',
  },
  {
    name: 'Wallet',
    description: 'Compact carry goods and small accessories built around material selection, finishing and brand detailing.',
    image: '/assets/images/products/category-wallet-leather.jpg',
  },
  {
    name: 'Hat',
    description: 'Caps and soft headwear programs with embroidery, labeling and buyer-specific finishing support.',
    image: '/assets/images/products/category-hat-cap.jpg',
  },
];

export const products: Product[] = [
  {
    slug: 'premium-pique-polo',
    name: 'Premium Pique Polo',
    category: 'Knit',
    shortDescription: 'Retail-ready pique polo program with collar, placket and private-label trim support.',
    overview: 'A core knitwear product for global retail programs, developed with stable shrinkage control, clean placket construction and buyer-specific branding.',
    image: '/assets/images/products/product-knit-polo.jpg',
    images: [
      '/assets/images/products/product-knit-polo.jpg',
      '/assets/images/products/category-knit-tshirt.webp',
      '/assets/images/tko_english_laundry_model_1780828240798.png',
    ],
    manufacturing: ['Fabric sourcing and lab-dip coordination', 'Fit sample, proto sample and pre-production approval', 'Inline measurement checks and final inspection'],
    specifications: {
      material: 'Cotton, cotton-elastane or blended pique',
      productionFocus: 'Menswear, womenswear and youth polo programs',
      finishing: 'Rib collar, button placket, side vents, custom labels',
      quality: 'Shrinkage, colorfastness and AQL final inspection',
    },
    features: ['Private-label trims', 'Consistent bulk handfeel', 'Export-ready carton planning', 'Size-set measurement control'],
  },
  {
    slug: 'performance-jersey-tee',
    name: 'Performance Jersey Tee',
    category: 'Knit',
    shortDescription: 'Lightweight jersey tee program for lifestyle, active and promotional apparel lines.',
    overview: 'A scalable jersey program designed for reliable production flow, smooth print/embroidery compatibility and repeatable fit across bulk orders.',
    image: '/assets/images/products/category-knit-tshirt.webp',
    images: [
      '/assets/images/products/category-knit-tshirt.webp',
      '/assets/images/tko_english_laundry_model_1780828240798.png',
      '/assets/images/tko_hero_1780828164727.png',
    ],
    manufacturing: ['Yarn and fabric quality review', 'Pattern adjustment and sample sealing', 'Production follow-up from cutting to packing'],
    specifications: {
      material: 'Single jersey, slub jersey or performance blends',
      productionFocus: 'Core tees, graphic tees and lifestyle programs',
      finishing: 'Neck rib, cover stitch, print or embroidery placement',
      quality: 'GSM, twisting, shrinkage and seam-strength checks',
    },
    features: ['Soft handfeel options', 'Print-friendly surfaces', 'Fast sampling support', 'Bulk production coordination'],
  },
  {
    slug: 'structured-oxford-shirt',
    name: 'Structured Oxford Shirt',
    category: 'Woven',
    shortDescription: 'Classic woven shirt program with reliable fit, collar shape and export finishing.',
    overview: 'A polished woven category option for corporate, lifestyle and private-label programs requiring clean construction and consistent measurement control.',
    image: '/assets/images/products/category-woven-shirt.jpg',
    images: [
      '/assets/images/products/category-woven-shirt.jpg',
      '/assets/images/tko_american_republic_1780828278114.png',
      '/assets/images/tko_copper_oak_model_1780828221993.png',
    ],
    manufacturing: ['Fabric and trim sourcing', 'Collar, cuff and placket development', 'Inline inspection and final carton audit'],
    specifications: {
      material: 'Cotton oxford, poplin, twill or blended woven fabrics',
      productionFocus: 'Casual shirts, uniform shirts and branded retail shirts',
      finishing: 'Button-down collar, yoke, cuffs, branded buttons',
      quality: 'SPI, seam puckering, shade band and measurement audit',
    },
    features: ['Custom wash options', 'Branded trim packages', 'Structured collar support', 'Reliable export documentation'],
  },
  {
    slug: 'lightweight-chino-trouser',
    name: 'Lightweight Chino Trouser',
    category: 'Woven',
    shortDescription: 'Casual woven bottom program with fit development and durable finishing support.',
    overview: 'A versatile trouser product built for brands that require dependable sizing, clean waistband execution and commercially viable fabric options.',
    image: '/assets/images/products/product-woven-trouser.jpg',
    images: [
      '/assets/images/products/product-woven-trouser.jpg',
      '/assets/images/products/category-woven-shirt.jpg',
      '/assets/images/tko_american_republic_1780828278114.png',
    ],
    manufacturing: ['Fit block review and sample iteration', 'Fabric consumption and costing support', 'Finishing, pressing and packing control'],
    specifications: {
      material: 'Cotton twill, stretch twill or blended woven fabrics',
      productionFocus: 'Casual bottoms, uniforms and lifestyle trousers',
      finishing: 'Waistband, belt loops, pocketing, zipper or button closure',
      quality: 'Fit approval, seam strength and shade consistency',
    },
    features: ['Commercial costing guidance', 'Size-run planning', 'Durable trims', 'Shipment-ready documentation'],
  },
  {
    slug: 'cotton-blend-cardigan',
    name: 'Cotton Blend Cardigan',
    category: 'Sweater',
    shortDescription: 'Fine-gauge cardigan program with private-label branding and controlled measurements.',
    overview: 'A refined sweater product for seasonal retail ranges, managed from yarn selection and sample approval through bulk linking and finishing.',
    image: '/assets/images/products/category-sweater-cardigan.jpg',
    images: [
      '/assets/images/products/category-sweater-cardigan.jpg',
      '/assets/images/products/product-sweater-pullover.jpg',
      '/assets/images/products/product-sweater-knit-person.jpg',
    ],
    manufacturing: ['Yarn sourcing and gauge recommendation', 'Fit and panel measurement development', 'Linking, washing and finishing follow-up'],
    specifications: {
      material: 'Cotton, acrylic, viscose or blended yarns',
      productionFocus: 'Cardigans, pullovers and seasonal layering items',
      finishing: 'Button front, rib hem, neck tape, brand labels',
      quality: 'Pilling, twist, measurement and appearance inspection',
    },
    features: ['Gauge planning', 'Soft wash finishing', 'Private-label packaging', 'Seasonal color development'],
  },
  {
    slug: 'heavy-gauge-pullover',
    name: 'Heavy Gauge Pullover',
    category: 'Sweater',
    shortDescription: 'Warm pullover sweater program for autumn/winter retail and lifestyle assortments.',
    overview: 'A heavier sweater capability for brands needing texture, warmth and reliable production management across seasonal delivery windows.',
    image: '/assets/images/products/product-sweater-knit-person.jpg',
    images: [
      '/assets/images/products/product-sweater-knit-person.jpg',
      '/assets/images/products/product-sweater-pullover.jpg',
      '/assets/images/products/category-sweater-cardigan.jpg',
    ],
    manufacturing: ['Gauge and yarn-count selection', 'Sample development with fit correction', 'Bulk inspection for appearance and measurements'],
    specifications: {
      material: 'Acrylic, wool blend, cotton blend or recycled yarn options',
      productionFocus: 'Pullovers, crew necks, mock necks and textured knits',
      finishing: 'Rib neck, cuffs, hem and buyer-specific labels',
      quality: 'Weight, handfeel, pilling and measurement checks',
    },
    features: ['Seasonal yarn options', 'Texture development', 'Measurement discipline', 'Buyer-approved packaging'],
  },
  {
    slug: 'canvas-utility-tote',
    name: 'Canvas Utility Tote',
    category: 'Bag',
    shortDescription: 'Structured tote program for lifestyle, promotional and private-label accessory ranges.',
    overview: 'A soft-goods accessory program that pairs material sourcing, trim development and export-ready packing for branded utility bags.',
    image: '/assets/images/products/product-bag-tote.jpg',
    images: [
      '/assets/images/products/product-bag-tote.jpg',
      '/assets/images/products/category-bag-tote.jpg',
      '/assets/images/products/product-bag-duffel.jpg',
    ],
    manufacturing: ['Canvas and lining sourcing', 'Handle, pocket and label development', 'Packing and logistics coordination'],
    specifications: {
      material: 'Cotton canvas, recycled canvas or blended heavy fabrics',
      productionFocus: 'Totes, market bags and branded utility bags',
      finishing: 'Reinforced handles, inside pocket, woven label',
      quality: 'Load, seam strength and finishing inspection',
    },
    features: ['Custom dimensions', 'Printed or embroidered branding', 'Reinforced construction', 'Carton optimization'],
  },
  {
    slug: 'technical-travel-duffel',
    name: 'Technical Travel Duffel',
    category: 'Bag',
    shortDescription: 'Travel bag program with hardware, lining and functional construction coordination.',
    overview: 'A developed soft-luggage capability for brands that need reliable accessory production, durable trims and practical compartment layouts.',
    image: '/assets/images/products/product-bag-duffel.jpg',
    images: [
      '/assets/images/products/product-bag-duffel.jpg',
      '/assets/images/products/category-bag-tote.jpg',
      '/assets/images/products/product-bag-tote.jpg',
    ],
    manufacturing: ['Material and hardware sourcing', 'Prototype sampling and function review', 'Inspection for stitching, trims and packing'],
    specifications: {
      material: 'Canvas, nylon, polyester twill or coated fabrics',
      productionFocus: 'Duffels, weekenders and travel accessories',
      finishing: 'Zippers, webbing handles, lining, logo patch',
      quality: 'Function test, seam strength and visual inspection',
    },
    features: ['Hardware sourcing', 'Functional sample review', 'Private-label trim set', 'Export logistics support'],
  },
  {
    slug: 'leather-card-holder',
    name: 'Leather Card Holder',
    category: 'Wallet',
    shortDescription: 'Compact card holder accessory program with branding and finishing options.',
    overview: 'A small leather-goods capability for brands seeking neat edge finishing, controlled dimensions and clean logo application.',
    image: '/assets/images/products/category-wallet-leather.jpg',
    images: [
      '/assets/images/products/category-wallet-leather.jpg',
      '/assets/images/products/product-wallet-bifold.jpg',
      '/assets/images/products/product-wallet-zip.jpg',
    ],
    manufacturing: ['Material selection and trim review', 'Sampling for edge, stitch and logo placement', 'Final inspection and packaging coordination'],
    specifications: {
      material: 'Leather, vegan leather or coated synthetic options',
      productionFocus: 'Card holders, slim wallets and giftable accessories',
      finishing: 'Edge paint, debossing, stitching, dust bag or box',
      quality: 'Dimension, stitch, edge and surface checks',
    },
    features: ['Debossed branding', 'Compact construction', 'Custom packaging', 'Material alternatives'],
  },
  {
    slug: 'zip-around-wallet',
    name: 'Zip Around Wallet',
    category: 'Wallet',
    shortDescription: 'Functional wallet program with zipper, compartments and private-label packaging.',
    overview: 'A practical accessory product developed for everyday carry assortments, managed with attention to hardware quality and interior layout.',
    image: '/assets/images/products/product-wallet-zip.jpg',
    images: [
      '/assets/images/products/product-wallet-zip.jpg',
      '/assets/images/products/category-wallet-leather.jpg',
      '/assets/images/products/product-wallet-bifold.jpg',
    ],
    manufacturing: ['Prototype and compartment review', 'Hardware and zipper sourcing', 'Quality inspection before export packing'],
    specifications: {
      material: 'Leather, vegan leather, nylon or coated fabric',
      productionFocus: 'Wallets, pouches and compact organizers',
      finishing: 'Zip closure, card slots, coin pocket, branded puller',
      quality: 'Zipper function, dimension and surface inspection',
    },
    features: ['Custom interior layout', 'Hardware options', 'Gift packaging', 'Quality-controlled finishing'],
  },
  {
    slug: 'six-panel-cap',
    name: 'Six Panel Cap',
    category: 'Hat',
    shortDescription: 'Classic cap program with embroidery, labeling and adjustable closure support.',
    overview: 'A reliable headwear option for retail, uniform and promotional programs requiring clean embroidery and fit consistency.',
    image: '/assets/images/products/category-hat-cap.jpg',
    images: [
      '/assets/images/products/category-hat-cap.jpg',
      '/assets/images/tko_weatherproof_model_1780828259409.png',
      '/assets/images/tko_copper_oak_model_1780828221993.png',
    ],
    manufacturing: ['Fabric and peak construction review', 'Embroidery strike-off and label approval', 'Bulk inspection for shape and finishing'],
    specifications: {
      material: 'Cotton twill, brushed canvas or performance fabrics',
      productionFocus: 'Caps, promotional headwear and branded uniforms',
      finishing: 'Embroidery, woven label, snapback or metal closure',
      quality: 'Shape, stitching, embroidery and closure checks',
    },
    features: ['Embroidery coordination', 'Adjustable closures', 'Private-label trims', 'Shape retention checks'],
  },
  {
    slug: 'structured-bucket-hat',
    name: 'Structured Bucket Hat',
    category: 'Hat',
    shortDescription: 'Soft headwear program for seasonal lifestyle collections and brand campaigns.',
    overview: 'A casual headwear product designed for flexible fabric options, branded finishing and coordinated production timelines.',
    image: '/assets/images/products/product-hat-bucket.jpg',
    images: [
      '/assets/images/products/product-hat-bucket.jpg',
      '/assets/images/products/category-hat-cap.jpg',
      '/assets/images/tko_copper_oak_model_1780828221993.png',
    ],
    manufacturing: ['Pattern and brim structure review', 'Fabric sourcing and sampling', 'Final inspection and export packing'],
    specifications: {
      material: 'Cotton twill, canvas, nylon or seasonal blends',
      productionFocus: 'Bucket hats, soft hats and lifestyle headwear',
      finishing: 'Top stitching, label patch, drawcord or print',
      quality: 'Panel symmetry, stitch quality and dimension checks',
    },
    features: ['Seasonal fabric options', 'Patch or print branding', 'Sampling support', 'Shipment coordination'],
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 3) {
  return products
    .filter((candidate) => candidate.category === product.category && candidate.slug !== product.slug)
    .concat(products.filter((candidate) => candidate.category !== product.category))
    .slice(0, limit);
}
