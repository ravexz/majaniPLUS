
import { Farmer, CollectionRecord, RouteConfig, GlobalSettings, User, UserRole, ActivityLog, PayrollRun, InspectionRecord } from './types';

export const DEFAULT_SETTINGS: GlobalSettings = {
  tareWeight: 1.5, // 1.5kg bag weight
  moistureDeduction: 2.0, // 2% deduction
  cessPerKg: 1.0, // 1 KES Cess
  costPerTransaction: 5.0 // 5 KES per weighing
};

export const DEFAULT_ROUTES: RouteConfig[] = [
  {
    name: "Kapsoit",
    centres: ["Kapsoit Main", "Kapsuser", "Sosiot", "Ainamoi"],
    pricePerKg: 25.0,
    transportCostPerKg: 2.0
  },
  {
    name: "Litein",
    centres: ["Litein Centre", "Cheborge", "Kapkatet", "Boito"],
    pricePerKg: 24.5,
    transportCostPerKg: 2.5
  },
  {
    name: "Roret",
    centres: ["Roret Market", "Mabasi", "Tulwap", "Kibuk"],
    pricePerKg: 26.0,
    transportCostPerKg: 3.0
  },
  {
    name: "Chepseon",
    centres: ["Chepseon Junction", "Kiptere", "Lelu", "Kipkelion"],
    pricePerKg: 25.0,
    transportCostPerKg: 2.2
  },
  {
    name: "Silibwet",
    centres: ["Silibwet", "Tenwek", "Mugango", "Bomet"],
    pricePerKg: 23.5,
    transportCostPerKg: 1.8
  }
];

// Kept for backward compatibility if needed, but derived from DEFAULT_ROUTES in App logic usually
export const TEA_ROUTES: Record<string, string[]> = {
  "Kapsoit": ["Kapsoit Main", "Kapsuser", "Sosiot", "Ainamoi"],
  "Litein": ["Litein Centre", "Cheborge", "Kapkatet", "Boito"],
  "Roret": ["Roret Market", "Mabasi", "Tulwap", "Kibuk"],
  "Chepseon": ["Chepseon Junction", "Kiptere", "Lelu", "Kipkelion"],
  "Silibwet": ["Silibwet", "Tenwek", "Mugango", "Bomet"]
};

export const MOCK_FARMERS: Farmer[] = [
  { 
    id: 'F001', 
    name: 'Jomo Kenyatta', 
    firstName: 'Jomo',
    lastName: 'Kenyatta',
    phone: '+254700000001', 
    email: 'jomo.k@majani.co.ke',
    profilePicture: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=300&h=300&q=80',
    cooperativeId: 'COOP-KERICHO-01', 
    route: 'Kapsoit',
    centre: 'Kapsoit Main',
    acreage: 2.5,
    location: { lat: -0.3677, lng: 35.2831 },
    nextOfKin: 'Ngina Kenyatta',
    nextOfKinRelation: 'Spouse',
    nextOfKinPhone: '+254700000099',
    balanceInputs: 5000,
    balanceAdvances: 0
  },
  { 
    id: 'F002', 
    name: 'Wangari Maathai',
    firstName: 'Wangari',
    lastName: 'Maathai',
    phone: '+254700000002', 
    email: 'wangari@greenbelt.org',
    profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&h=300&q=80',
    cooperativeId: 'COOP-KERICHO-01', 
    route: 'Kapsoit',
    centre: 'Sosiot',
    acreage: 5.0,
    location: { lat: -0.3600, lng: 35.2900 },
    nextOfKin: 'Waweru Mathai',
    nextOfKinRelation: 'Son',
    nextOfKinPhone: '+254700111222',
    balanceInputs: 1200,
    balanceAdvances: 2000
  },
  { 
    id: 'F003', 
    name: 'Ngugi wa Thiong\'o', 
    firstName: 'Ngugi',
    middleName: 'wa',
    lastName: 'Thiong\'o',
    phone: '+254700000003', 
    cooperativeId: 'COOP-LIMURU-02', 
    route: 'Litein',
    centre: 'Cheborge',
    acreage: 1.2,
    location: { lat: -1.1155, lng: 36.6645 },
    nextOfKin: 'Njeeri wa Ngugi',
    nextOfKinRelation: 'Spouse',
    nextOfKinPhone: '+254722333444',
    balanceInputs: 0,
    balanceAdvances: 0
  },
  { 
    id: 'F004', 
    name: 'Lupita Nyong\'o', 
    firstName: 'Lupita',
    lastName: 'Nyong\'o',
    phone: '+254700000004', 
    profilePicture: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=300&h=300&q=80',
    cooperativeId: 'COOP-LIMURU-02', 
    route: 'Litein',
    centre: 'Kapkatet',
    acreage: 3.8,
    location: { lat: -1.1200, lng: 36.6700 },
    balanceInputs: 8500,
    balanceAdvances: 500
  },
  { 
    id: 'F005', 
    name: 'Eliud Kipchoge', 
    firstName: 'Eliud',
    lastName: 'Kipchoge',
    phone: '+254700000005', 
    profilePicture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&h=300&q=80',
    cooperativeId: 'COOP-NANDI-03', 
    route: 'Roret',
    centre: 'Mabasi',
    acreage: 10.0,
    location: { lat: 0.1833, lng: 35.0833 },
    balanceInputs: 0,
    balanceAdvances: 0
  },
];

export const MOCK_USERS: User[] = [
  { username: 'admin', name: 'System Administrator', role: UserRole.ADMIN },
  { username: 'clerk1', name: 'John Doe', role: UserRole.CLERK },
  { username: 'clerk2', name: 'Jane Smith', role: UserRole.CLERK },
  { username: 'manager', name: 'Operations Manager', role: UserRole.MANAGER },
  { username: 'payroll', name: 'Finance Lead', role: UserRole.PAYROLL_ADMIN },
  { username: 'officer', name: 'Field Officer', role: UserRole.EXTENSION_OFFICER },
];

export const INITIAL_RECORDS: CollectionRecord[] = [
  { id: 'REC-101', farmerId: 'F001', weight: 12.5, netWeight: 10.8, qualityScore: 85, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), clerkId: 'CLK-01', synced: true, status: 'approved', location: { lat: -0.3677, lng: 35.2831 } },
  { id: 'REC-102', farmerId: 'F002', weight: 45.2, netWeight: 42.8, qualityScore: 92, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), clerkId: 'CLK-01', synced: true, status: 'approved', location: { lat: -0.3600, lng: 35.2900 } },
  { id: 'REC-103', farmerId: 'F001', weight: 15.0, netWeight: 13.2, qualityScore: 88, timestamp: new Date(Date.now() - 86400000).toISOString(), clerkId: 'CLK-01', synced: true, status: 'approved', location: { lat: -0.3675, lng: 35.2835 } },
  { id: 'REC-104', farmerId: 'F003', weight: 8.5, netWeight: 6.8, qualityScore: 75, timestamp: new Date(Date.now() - 86400000).toISOString(), clerkId: 'CLK-02', synced: true, status: 'pending', location: { lat: -1.1155, lng: 36.6645 } },
  { id: 'REC-105', farmerId: 'F005', weight: 120.0, netWeight: 116.1, qualityScore: 95, timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), clerkId: 'CLK-02', synced: true, status: 'approved', location: { lat: 0.1833, lng: 35.0833 } },
];

export const MOCK_PAYROLL_RUNS: PayrollRun[] = [
    {
        id: 'PAY-2023-OCT',
        periodStart: '2023-10-01',
        periodEnd: '2023-10-31',
        totalPayout: 452000,
        totalWeight: 18500,
        totalFarmers: 142,
        processedBy: 'payroll',
        timestamp: '2023-11-01T10:00:00Z',
        status: 'completed'
    }
];

export const MOCK_LOGS: ActivityLog[] = [
  { id: 'LOG-001', userId: 'admin', userName: 'System Administrator', userRole: UserRole.ADMIN, action: 'SYSTEM_START', details: 'System initialized', timestamp: new Date(Date.now() - 100000000).toISOString() },
  { id: 'LOG-002', userId: 'clerk1', userName: 'John Doe', userRole: UserRole.CLERK, action: 'LOGIN', details: 'User logged in', timestamp: new Date(Date.now() - 36000000).toISOString() },
  { id: 'LOG-003', userId: 'clerk1', userName: 'John Doe', userRole: UserRole.CLERK, action: 'COLLECTION', details: 'Added collection record for F001', timestamp: new Date(Date.now() - 35000000).toISOString() },
  { id: 'LOG-004', userId: 'manager', userName: 'Operations Manager', userRole: UserRole.MANAGER, action: 'LOGIN', details: 'User logged in', timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: 'LOG-005', userId: 'manager', userName: 'Operations Manager', userRole: UserRole.MANAGER, action: 'UPDATE_ROUTES', details: 'Updated pricing for Kapsoit route', timestamp: new Date(Date.now() - 17500000).toISOString() },
];

export const RAINFOREST_CRITERIA = [
    { category: "Social", item: "No Child Labor involved in farm activities" },
    { category: "Social", item: "Workers paid at least minimum wage" },
    { category: "Social", item: "Access to potable water for workers" },
    { category: "Environmental", item: "No deforestation or encroachment" },
    { category: "Environmental", item: "Native vegetation buffer zones maintained" },
    { category: "Environmental", item: "Safe storage of agrochemicals" },
    { category: "Agronomic", item: "Soil erosion control measures in place" },
    { category: "Agronomic", item: "Record keeping of fertilizer application" }
];

export const MOCK_INSPECTIONS: InspectionRecord[] = [
    {
        id: 'INS-001',
        farmerId: 'F001',
        auditorId: 'officer',
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        score: 100,
        status: 'compliant',
        notes: 'Excellent farm management. Buffer zones well maintained.',
        checklist: RAINFOREST_CRITERIA.map(c => ({ ...c, passed: true }))
    },
    {
        id: 'INS-002',
        farmerId: 'F003',
        auditorId: 'officer',
        date: new Date(Date.now() - 86400000 * 12).toISOString(),
        score: 87.5,
        status: 'conditional',
        notes: 'Minor issue with chemical storage shed lock. Corrective action required.',
        checklist: RAINFOREST_CRITERIA.map((c, i) => ({ ...c, passed: i !== 5 }))
    }
];

export const CLERK_ID = 'CLK-CURRENT-USER';
