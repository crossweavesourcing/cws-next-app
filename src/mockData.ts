/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShipmentOrder, ApparelSample, FactoryInspection, ComplianceStandard } from './types';

export const CWS_METRICS = {
  garmentsSourced: '140M+',
  officesCount: '5+',
  professionalsCount: '800+',
  yearsOfExperience: '20+',
  partnerFactories: '120+',
  countriesOperating: '15+'
};

export const GLOBAL_OFFICES = [
  {
    city: 'Dhaka',
    country: 'Bangladesh',
    role: 'Global Production Headquarters & R&D Center',
    teamSize: '530+ Experts',
    address: 'CWS Quality Tower, Sector-11, Uttara, Dhaka'
  },
  {
    city: 'Manchester',
    country: 'United Kingdom',
    role: 'Global Design & Accounts Relationship Management',
    teamSize: '80+ Experts',
    address: 'The Spinners Hall, Manchester City Centre'
  },
  {
    city: 'Delhi NCR',
    country: 'India',
    role: 'Organic Knitwear & Woven Sourcing Office',
    teamSize: '110+ Experts',
    address: 'Udyog Vihar, Phase V, Gurugram, India'
  },
  {
    city: 'Madrid',
    country: 'Spain',
    role: 'Southern Europe Quality Assurance & Client Liaison',
    teamSize: '50+ Experts',
    address: 'Paseo de la Castellana, Madrid, Spain'
  },
  {
    city: 'Istanbul',
    country: 'Turkey',
    role: 'Premium Deniz, Activewear & Fast-Fashion Production',
    teamSize: '80+ Experts',
    address: 'Koza Plaza, Tekstilkent, Istanbul, Turkey'
  }
];

export const MOCK_ORDERS: ShipmentOrder[] = [
  {
    id: 'CWS-ORD-1049',
    buyer: 'Nordic Apparel Group',
    category: 'Knitwear',
    quantity: 45000,
    destination: 'Stockholm, Sweden',
    origin: 'Dhaka, Bangladesh',
    status: 'Production',
    progress: 68,
    value: 315000,
    carbonSaved: 12400,
    orderDate: '2026-04-12',
    estDeliveryDate: '2026-07-15'
  },
  {
    id: 'CWS-ORD-1050',
    buyer: 'Iberria Fashion Group',
    category: 'Denim',
    quantity: 60000,
    destination: 'Madrid, Spain',
    origin: 'Istanbul, Turkey',
    status: 'Shipping',
    progress: 90,
    value: 540000,
    carbonSaved: 21500,
    orderDate: '2026-03-20',
    estDeliveryDate: '2026-06-25'
  },
  {
    id: 'CWS-ORD-1051',
    buyer: 'London Trend Co.',
    category: 'Wovenwear',
    quantity: 25000,
    destination: 'London, UK',
    origin: 'Dhaka, Bangladesh',
    status: 'Quality Check',
    progress: 85,
    value: 235000,
    carbonSaved: 8900,
    orderDate: '2026-04-05',
    estDeliveryDate: '2026-06-30'
  },
  {
    id: 'CWS-ORD-1052',
    buyer: 'Amerisports Inc.',
    category: 'Activewear',
    quantity: 80000,
    destination: 'New York, USA',
    origin: 'Istanbul, Turkey',
    status: 'Sampling',
    progress: 35,
    value: 720000,
    carbonSaved: 28400,
    orderDate: '2026-05-10',
    estDeliveryDate: '2026-09-02'
  },
  {
    id: 'CWS-ORD-1053',
    buyer: 'Paris Luxe Basics',
    category: 'Intimate',
    quantity: 30000,
    destination: 'Paris, France',
    origin: 'Delhi NCR, India',
    status: 'Sourcing',
    progress: 15,
    value: 150000,
    carbonSaved: 4800,
    orderDate: '2026-05-28',
    estDeliveryDate: '2026-10-10'
  },
  {
    id: 'CWS-ORD-1054',
    buyer: 'Hanseatic Retailers',
    category: 'Outerwear',
    quantity: 18000,
    destination: 'Hamburg, Germany',
    origin: 'Dhaka, Bangladesh',
    status: 'Delivered',
    progress: 100,
    value: 298000,
    carbonSaved: 5120,
    orderDate: '2026-02-15',
    estDeliveryDate: '2026-05-25'
  },
  {
    id: 'CWS-ORD-1055',
    buyer: 'Sydney Surf Brands',
    category: 'Kids',
    quantity: 35000,
    destination: 'Sydney, Australia',
    origin: 'Delhi NCR, India',
    status: 'Production',
    progress: 55,
    value: 192500,
    carbonSaved: 9800,
    orderDate: '2026-04-20',
    estDeliveryDate: '2026-08-05'
  }
];

export const MOCK_SAMPLES: ApparelSample[] = [
  {
    id: 'SMP-KT-09',
    name: 'Sustainable Recycled Pullover',
    category: 'Knitwear',
    material: '70% Recycled Cotton, 30% Seawool',
    certification: 'GOTS & GRS Certified',
    status: 'Approved',
    image: 'A dense, richly textured waffle knit sweater in minimalist sage green, hanging elegantly in CWS Design Labs.',
    sustainabilityDetails: 'Zero waste spinning, saving 2,100L of fresh water per piece compared to standard cotton.',
    weightGsm: 280,
    minPriceUsd: 6.45
  },
  {
    id: 'SMP-DN-43',
    name: 'Laser-Etched Zero-Water Indigo Jean',
    category: 'Denim',
    material: '100% Organic Cotton Denim, 12oz',
    certification: 'Oeko-Tex Standard 100',
    status: 'Approved',
    image: 'A classic straight-fit raw indigo denim with custom hardware, detailed distress lines achieved using chemical-free laser finishing.',
    sustainabilityDetails: 'No ozone gas or chemical stone washing applied. Reusable closed-loop dye filter used.',
    weightGsm: 340,
    minPriceUsd: 8.90
  },
  {
    id: 'SMP-AW-12',
    name: 'Econyl Quick-Dry Sport Hoodie',
    category: 'Activewear',
    material: '88% Recycled Ocean Nylon, 12% Lycra',
    certification: 'RCS & Bluedesign Certified',
    status: 'Pending Review',
    image: 'An athletic charcoal hoodie with flatlock ergonomic seam stitching and integrated reflective branding details.',
    sustainabilityDetails: 'Uses 100% reclaimed marine ocean nylon nets. Carbon footprint offset by 4.8kg.',
    weightGsm: 210,
    minPriceUsd: 7.20
  },
  {
    id: 'SMP-WW-78',
    name: 'Linen-Blend Breathable Resort Shirt',
    category: 'Wovenwear',
    material: '55% French Flax Linen, 45% Organic Cotton',
    certification: 'GOTS & OEKO-TEX',
    status: 'Pending Review',
    image: 'A lightweight casual button-down shirt in sun-washed oatmeal tone, showcasing tortoiseshell biosourced buttons.',
    sustainabilityDetails: 'French flax requires no artificial irrigation or hazardous pesticides.',
    weightGsm: 145,
    minPriceUsd: 5.15
  },
  {
    id: 'SMP-OW-05',
    name: 'Repreve Sherpa Technical Parka',
    category: 'Outerwear',
    material: '100% Repreve Recycled Polyester Sherpa',
    certification: 'GRS Certified Mills',
    status: 'Revision Requested',
    image: 'A rugged mountain utility park jacket in heavy beige fleece, with reinforced contrast water-repellent chest pockets.',
    sustainabilityDetails: 'Sourced from 35 recycled PET bottles. Lining dyed using waterless dye vat technology.',
    weightGsm: 420,
    minPriceUsd: 14.80
  }
];

export const MOCK_INSPECTIONS: FactoryInspection[] = [
  {
    id: 'INS-0091',
    factoryName: 'CWS Apex Knit Ltd',
    location: 'Gazipur, Bangladesh',
    inspectionType: 'AQL Audit',
    status: 'Pass',
    aqlScore: 1.1, // limit is 1.5
    auditor: 'Hassan Al-Mumin',
    date: '2026-06-06'
  },
  {
    id: 'INS-0092',
    factoryName: 'CWS Orient Denim Mills',
    location: 'Izmir, Turkey',
    inspectionType: 'Inline Quality',
    status: 'In Progress',
    aqlScore: 0.8,
    auditor: 'Ebru Sahin',
    date: '2026-06-07'
  },
  {
    id: 'INS-0093',
    factoryName: 'CWS Yamagata Garments',
    location: 'Haryana, India',
    inspectionType: 'Ethical Audit',
    status: 'Pass',
    aqlScore: 100, // Pass rate score
    auditor: 'Priyanka Sen',
    date: '2026-06-05'
  },
  {
    id: 'INS-0094',
    factoryName: 'CWS EcoWoven Ltd',
    location: 'Narayanganj, Bangladesh',
    inspectionType: 'Final Inspection',
    status: 'Fail',
    aqlScore: 2.8, // failed limit of 1.5
    auditor: 'Zaman Jahangir',
    date: '2026-06-04'
  },
  {
    id: 'INS-0095',
    factoryName: 'CWS Troy Composite',
    location: 'Bursa, Turkey',
    inspectionType: 'AQL Audit',
    status: 'Pass',
    aqlScore: 1.4,
    auditor: 'Can Yilmaz',
    date: '2026-06-06'
  }
];

export const MOCK_CERTIFICATIONS: ComplianceStandard[] = [
  {
    id: 'CERT-01',
    name: 'OEKO-TEX',
    fullName: 'STANDARD 100 by OEKO-TEX®',
    description: 'Ensures apparel is 100% free from hazardous levels of over 300 toxic chemicals and substances.',
    status: 'Verified',
    coverage: '100% of Woven & Knit Mills',
    nextAuditDate: '2026-11-20',
    complianceScore: 100
  },
  {
    id: 'CERT-02',
    name: 'GOTS',
    fullName: 'Global Organic Textile Standard',
    description: 'The worldwide leading textile processing standard for organic fibers, including ecological and social criteria.',
    status: 'Verified',
    coverage: '85% of Knitwear Facilities',
    nextAuditDate: '2026-09-15',
    complianceScore: 97
  },
  {
    id: 'CERT-03',
    name: 'GRS / RCS',
    fullName: 'Global Recycled Standard',
    description: 'Verifies recycled content, tracking chain of custody from origin to finished product with strict chemical restrictions.',
    status: 'Verified',
    coverage: '92% of Denim & Synth Mills',
    nextAuditDate: '2026-08-30',
    complianceScore: 94
  },
  {
    id: 'CERT-04',
    name: 'BSCI',
    fullName: 'Business Social Compliance Initiative',
    description: 'Monitors and improves social performance in global supply chains, enforcing fair wages, workplace safety, and no child labor.',
    status: 'Verified',
    coverage: '100% of Sourcing Factories',
    nextAuditDate: '2026-10-05',
    complianceScore: 99
  },
  {
    id: 'CERT-05',
    name: 'WRAP',
    fullName: 'Worldwide Responsible Accredited Production',
    description: 'The world\'s largest independent facility certification program centered on social responsibility and compliance.',
    status: 'Verified',
    coverage: '96% of Manufacturing Partners',
    nextAuditDate: '2026-12-01',
    complianceScore: 98
  },
  {
    id: 'CERT-06',
    name: 'SEDEX / SMETA',
    fullName: 'Sedex Members Ethical Trade Audit',
    description: 'Comprehensive audit methodology covering labor standards, health and safety, environment, and business ethics.',
    status: 'Audit Scheduled',
    coverage: '100% of Primary Mill Base',
    nextAuditDate: '2026-06-22',
    complianceScore: 96
  }
];

export const INITIAL_CHAT_HISTORY = [
  {
    id: 'msg-init-1',
    sender: 'assistant' as const,
    text: `Hello, welcome to CWS International's Sourcing & Supply Chain Co-Pilot.

I am synced with our real-time global production data, design laboratories, quality audits, and compliance credentials across our manufacturing networks.

Here are a few things you can ask me:
1. **"Suggest fabrics for lightweight GOTS-certified activewear."**
2. **"What organic certifications do we maintain at CWS?"**
3. **"Draft an RFQ for 50,000 recycled cotton knit sweaters."**
4. **"Check current order shipment statuses."**

How can I assist your brand development and procurement operations today?`,
    timestamp: '08:30'
  }
];
