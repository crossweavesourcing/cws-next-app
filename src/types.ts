/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShipmentOrder {
  id: string;
  buyer: string;
  category: 'Knitwear' | 'Wovenwear' | 'Denim' | 'Outerwear' | 'Activewear' | 'Intimate' | 'Kids' | 'Home Apparel';
  quantity: number;
  destination: string;
  origin: string;
  status: 'Sourcing' | 'Sampling' | 'Production' | 'Quality Check' | 'Shipping' | 'Delivered';
  progress: number;
  value: number;
  carbonSaved: number; // in kg CO2e
  orderDate: string;
  estDeliveryDate: string;
}

export interface ApparelSample {
  id: string;
  name: string;
  category: string;
  material: string;
  certification: string;
  status: 'Approved' | 'Pending Review' | 'Revision Requested';
  image: string;
  sustainabilityDetails: string;
  weightGsm: number;
  minPriceUsd: number;
}

export interface FactoryInspection {
  id: string;
  factoryName: string;
  location: string;
  inspectionType: 'Inline Quality' | 'AQL Audit' | 'Ethical Audit' | 'Final Inspection';
  status: 'Pass' | 'Fail' | 'In Progress';
  aqlScore: number; // e.g. 1.5 (with 2.5 being passing)
  auditor: string;
  date: string;
}

export interface ComplianceStandard {
  id: string;
  name: string;
  fullName: string;
  description: string;
  status: 'Verified' | 'Audit Scheduled';
  coverage: string;
  nextAuditDate: string;
  complianceScore: number;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
