import { Fragment } from 'react';
import Image from 'next/image';
import { SectionItem, contentValue, mediaValue } from './SectionHelpers';

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

export default function ServicesSection({ section }: { section?: SectionItem }) {
  if (section?.paused) return null;

  const services = defaultServices.map((service, index) => ({
    title: contentValue(section, `service${index + 1}Title`, service.title),
    description: contentValue(section, `service${index + 1}Description`, service.description),
    image: mediaValue(section, `service${index + 1}`, service.image),
  }));

  return (
    <section id="services-showcase" className="w-full bg-white select-none border-t border-gray-100">
      <h2 className="sr-only">{contentValue(section, 'heading', 'Services Showcase')}</h2>
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
                  <span className={`block text-[10px] uppercase tracking-[0.4em] font-sans font-bold ${index % 3 === 0 ? 'text-[#EF4444]' : 'text-[#CC1E1E]'}`}>
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
  );
}
