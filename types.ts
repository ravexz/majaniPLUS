
export interface Farmer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  profilePicture?: string; // URL or Base64 string
  cooperativeId: string;
  acreage: number;
  // Extended fields
  firstName?: string;
  middleName?: string;
  lastName?: string;
  route?: string;
  centre?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  location?: {
    lat: number;
    lng: number;
  };
  nextOfKin?: string;
  nextOfKinRelation?: string;
  nextOfKinPhone?: string;
  // Financials
  balanceInputs: number; // Outstanding farm inputs (fertilizer etc)
  balanceAdvances: number; // Cash advances
}

export interface CollectionRecord {
  id: string;
  farmerId: string;
  weight: number; // Gross weight in kg
  netWeight?: number; // Net weight after deductions
  qualityScore: number; // 1-100
  timestamp: string; // ISO string
  location?: {
    lat: number;
    lng: number;
  };
  clerkId: string;
  synced: boolean;
  status?: 'approved' | 'pending' | 'rejected'; // Approval status
  payrollRunId?: string; // ID of the payroll run if settled
}

export interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalPayout: number; // Net amount paid out
  totalWeight: number;
  totalFarmers: number;
  processedBy: string;
  timestamp: string;
  status: 'completed' | 'processing';
}

export interface InspectionRecord {
  id: string;
  farmerId: string;
  auditorId: string;
  date: string;
  score: number; // 0-100%
  status: 'compliant' | 'non_compliant' | 'conditional';
  notes: string;
  checklist: {
      category: string;
      item: string;
      passed: boolean;
  }[];
}

export interface RouteConfig {
  name: string;
  centres: string[];
  pricePerKg: number;
  transportCostPerKg: number; // Deduction for transport per kg
}

export interface GlobalSettings {
  tareWeight: number; // kg per bag
  moistureDeduction: number; // percentage
  cessPerKg: number; // County tax per kg
  costPerTransaction: number; // Flat fee per weighing session
}

export interface DailyStat {
  date: string;
  totalWeight: number;
  avgQuality: number;
  collectionCount: number;
}

export type ViewMode = 'login' | 'mobile-app' | 'admin-dashboard' | 'farmer-portal' | 'access-denied';

export enum UserRole {
  CLERK = 'Clerk',
  ADMIN = 'Administrator',
  FARMER = 'Farmer',
  EXTENSION_OFFICER = 'Extension Officer',
  MANAGER = 'Manager',
  PAYROLL_ADMIN = 'Payroll Administrator'
}

export interface User {
  username: string;
  name: string;
  role: UserRole;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole | string;
  action: string;
  details: string;
  timestamp: string;
}