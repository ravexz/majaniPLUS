
import React, { useState, useMemo, useEffect } from 'react';
import { CollectionRecord, Farmer, RouteConfig, GlobalSettings, User, UserRole, ActivityLog, PayrollRun, InspectionRecord } from '../types';
import { RAINFOREST_CRITERIA } from '../constants';
import { generateDailyReport, askAiAssistant, runMLAnalysis } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { Sparkles, Sprout, TrendingUp, Users, Search, MessageSquare, X, Plus, Save, QrCode, Printer, MapPin, CreditCard, User as UserIcon, Phone, ArrowUpDown, ArrowUp, ArrowDown, Mail, ExternalLink, Send, ClipboardList, Download, Settings, Trash2, Edit2, AlertTriangle, Scale, LogOut, Coins, Wallet, FileText, Banknote, Calendar, Filter, Lock, Shield, FileBarChart, PlayCircle, Sliders, RefreshCw, ChevronDown, CheckCircle, ShieldAlert, XCircle, ScrollText, Upload, Camera, History, CheckCheck, ShieldCheck, ClipboardCheck, CloudRain, Droplets, Clock, PieChart as PieChartIcon } from 'lucide-react';
import QRCode from 'react-qr-code';

interface Props {
  records: CollectionRecord[];
  farmers: Farmer[];
  routes: RouteConfig[];
  settings: GlobalSettings;
  users: User[];
  activityLogs: ActivityLog[];
  payrollRuns: PayrollRun[];
  inspections: InspectionRecord[];
  onAddFarmer: (farmer: Farmer) => void;
  onUpdateFarmer: (farmer: Farmer) => void;
  onUpdateRoutes: (routes: RouteConfig[]) => void;
  onUpdateSettings: (settings: GlobalSettings) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onSettlePayroll: (periodStart: string, periodEnd: string, records: CollectionRecord[], deductions: Record<string, {inputs: number, advances: number}>, totalPayout: number) => void;
  onAddInspection: (inspection: InspectionRecord) => void;
  onExit: () => void;
  currentUser: User;
}

interface PaymentCalculation {
    farmerId: string;
    farmerName: string;
    farmerPhone: string;
    totalKg: number;
    sessions: number;
    grossPay: number;
    deductions: {
        transport: number;
        cess: number;
        transactionCost: number;
        inputs: number;
        advances: number;
    };
    totalDeductions: number;
    netPay: number;
    isSettled: boolean;
}

export const AdminDashboard: React.FC<Props> = ({ records, farmers, routes, settings, users, activityLogs, payrollRuns, inspections, onAddFarmer, onUpdateFarmer, onUpdateRoutes, onUpdateSettings, onAddUser, onUpdateUser, onSettlePayroll, onAddInspection, onExit, currentUser }) => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'farmers' | 'collections' | 'payments' | 'rainforest' | 'users' | 'activity' | 'reports' | 'ai' | 'settings'>('overview');
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isAskingAssistant, setIsAskingAssistant] = useState(false);
  
  // Search States
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [inspectionSearchQuery, setInspectionSearchQuery] = useState('');
  
  // Collections Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterCentre, setFilterCentre] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterClerk, setFilterClerk] = useState('');

  // Payment Tab States
  const [paymentViewMode, setPaymentViewMode] = useState<'pending' | 'history'>('pending');
  const [showSettleModal, setShowSettleModal] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Farmer Registration/Edit State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isEditingFarmer, setIsEditingFarmer] = useState(false);
  
  // Registration Form Fields
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleName, setRegMiddleName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regId, setRegId] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRoute, setRegRoute] = useState('');
  const [regCentre, setRegCentre] = useState('');
  const [regAcreage, setRegAcreage] = useState('');
  const [regLat, setRegLat] = useState('');
  const [regLng, setRegLng] = useState('');
  const [regBankName, setRegBankName] = useState('');
  const [regBankBranch, setRegBankBranch] = useState('');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [regNokName, setRegNokName] = useState('');
  const [regNokRelation, setRegNokRelation] = useState('');
  const [regNokPhone, setRegNokPhone] = useState('');

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>(UserRole.CLERK);
  const [passwordResetMsg, setPasswordResetMsg] = useState<string | null>(null);

  // Farmer Detail View State
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  
  // Payslip Modal
  const [selectedPayslip, setSelectedPayslip] = useState<PaymentCalculation | null>(null);
  const [chargeModal, setChargeModal] = useState<{farmerId: string, type: 'input' | 'advance'} | null>(null);
  const [chargeAmount, setChargeAmount] = useState('');

  // Inspection Modal
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [auditFarmerId, setAuditFarmerId] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [auditChecklist, setAuditChecklist] = useState(RAINFOREST_CRITERIA.map(c => ({ ...c, passed: false })));

  // Settings State
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);
  const [editingRoutes, setEditingRoutes] = useState<RouteConfig[]>(JSON.parse(JSON.stringify(routes)));

  // Email Form State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // ML Reports State
  const [mlModelType, setMlModelType] = useState<'forecast' | 'anomaly' | 'clustering'>('forecast');
  const [mlHorizon, setMlHorizon] = useState(7);
  const [mlSensitivity, setMlSensitivity] = useState('Medium');
  const [isRunningML, setIsRunningML] = useState(false);
  const [mlResult, setMlResult] = useState<string | null>(null);

  // Sync props to local state when opening Settings
  useEffect(() => {
    if (activeTab === 'settings') {
      setLocalSettings(settings);
      setEditingRoutes(JSON.parse(JSON.stringify(routes)));
    }
  }, [activeTab, settings, routes]);

  // Reset email form when farmer changes
  useEffect(() => {
    if (selectedFarmer) {
      setEmailSubject('');
      setEmailMessage('');
    }
  }, [selectedFarmer]);

  // Reset sorting, search and filters when tab changes
  useEffect(() => {
    setSortConfig(null);
    setFarmerSearchQuery('');
    setCollectionSearchQuery('');
    setPaymentSearchQuery('');
    setUserSearchQuery('');
    setActivitySearchQuery('');
    setInspectionSearchQuery('');
    setStartDate('');
    setEndDate('');
    setFilterRoute('');
    setFilterCentre('');
    setFilterSession('');
    setFilterClerk('');
    setMlResult(null); // Reset ML result
  }, [activeTab]);

  // Derived Stats
  const stats = useMemo(() => {
    const totalWeight = records.reduce((sum, r) => sum + r.weight, 0);
    const avgQuality = records.length > 0 ? records.reduce((sum, r) => sum + r.qualityScore, 0) / records.length : 0;
    const uniqueFarmers = new Set(records.map(r => r.farmerId)).size;
    
    // Group by Date for Chart
    const dateMap = new Map<string, number>();
    records.forEach(r => {
      const date = new Date(r.timestamp).toLocaleDateString('en-KE', { weekday: 'short' });
      dateMap.set(date, (dateMap.get(date) || 0) + r.weight);
    });
    const chartData = Array.from(dateMap.entries()).map(([name, weight]) => ({ name, weight }));

    return { totalWeight, avgQuality, uniqueFarmers, chartData };
  }, [records]);

  // 1. Route Performance Data (Donut Chart)
  const routePerformance = useMemo(() => {
      const data: Record<string, number> = {};
      records.forEach(r => {
          const farmer = farmers.find(f => f.id === r.farmerId);
          if (farmer && farmer.route) {
              data[farmer.route] = (data[farmer.route] || 0) + r.netWeight!;
          }
      });
      return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [records, farmers]);

  // 2. Quality Spectrum (Pie Chart)
  const qualityDistribution = useMemo(() => {
      let premium = 0; // > 85
      let standard = 0; // 75 - 85
      let low = 0; // < 75
      
      records.forEach(r => {
          if (r.qualityScore >= 85) premium++;
          else if (r.qualityScore >= 75) standard++;
          else low++;
      });
      
      return [
          { name: 'Premium (>85)', value: premium, color: '#10b981' },
          { name: 'Standard (75-85)', value: standard, color: '#f59e0b' },
          { name: 'Low (<75)', value: low, color: '#ef4444' }
      ];
  }, [records]);

  // 3. Clerk Performance (Bar Chart)
  const clerkPerformance = useMemo(() => {
      const data: Record<string, number> = {};
      records.forEach(r => {
          data[r.clerkId] = (data[r.clerkId] || 0) + r.netWeight!;
      });
      return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 5); // Top 5
  }, [records]);

  // 4. Hourly Intake (Area Chart) for Collections Tab
  const hourlyIntake = useMemo(() => {
      const hours = new Array(24).fill(0);
      records.forEach(r => {
          const h = new Date(r.timestamp).getHours();
          hours[h] += r.netWeight!;
      });
      return hours.map((weight, hour) => ({
          hour: `${hour}:00`,
          weight: parseFloat(weight.toFixed(1))
      })).slice(6, 20); // Filter for 6am - 8pm
  }, [records]);


  // Weekly Dual Data (Weight vs Quality) for Overview Chart
  const weeklyDualData = useMemo(() => {
      const data = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateKey = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString('en-KE', { weekday: 'short' });

          const daysRecords = records.filter(r => r.timestamp.startsWith(dateKey));
          const dailyWeight = daysRecords.reduce((acc, r) => acc + (r.netWeight || 0), 0);
          const dailyQuality = daysRecords.length ? daysRecords.reduce((acc, r) => acc + r.qualityScore, 0) / daysRecords.length : 0;

          data.push({
              name: dayName,
              weight: parseFloat(dailyWeight.toFixed(1)),
              quality: parseFloat(dailyQuality.toFixed(1))
          });
      }
      return data;
  }, [records]);

  // RA Stats
  const raStats = useMemo(() => {
      const certified = inspections.filter(i => i.status === 'compliant').length;
      const conditional = inspections.filter(i => i.status === 'conditional').length;
      const nonCompliant = inspections.filter(i => i.status === 'non_compliant').length;
      const total = inspections.length;
      return { certified, conditional, nonCompliant, total };
  }, [inspections]);

  // Calculation Helper: Current Month Running Balance
  const calculateRunningBalance = (farmerId: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Get records for this month
    const monthlyRecords = records.filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.farmerId === farmerId && !r.payrollRunId;
    });

    if (monthlyRecords.length === 0) return { 
        gross: 0, net: 0, weight: 0, deductions: 0, 
        breakdown: { transport: 0, cess: 0, txn: 0 } 
    };

    const farmer = farmers.find(f => f.id === farmerId);
    const route = routes.find(r => r.name === farmer?.route) || { pricePerKg: 0, transportCostPerKg: 0 };

    let totalWeight = 0;
    let grossPay = 0;
    let transport = 0;
    let cess = 0;
    let txnCost = 0;

    monthlyRecords.forEach(r => {
        const net = r.netWeight || 0;
        totalWeight += net;
        grossPay += net * route.pricePerKg;
        transport += net * route.transportCostPerKg;
        cess += net * settings.cessPerKg;
        txnCost += settings.costPerTransaction;
    });

    const totalOperationalDeductions = transport + cess + txnCost;
    
    return {
        weight: totalWeight,
        gross: grossPay,
        deductions: totalOperationalDeductions,
        net: grossPay - totalOperationalDeductions,
        breakdown: {
            transport,
            cess,
            txn: txnCost
        }
    };
  };

  const selectedFarmerMonthStats = useMemo(() => {
    if (!selectedFarmer) return null;
    return calculateRunningBalance(selectedFarmer.id);
  }, [selectedFarmer, records, farmers, routes, settings]);

  // 1. Derived records for Payment tab (filtered by date)
  const paymentRecords = useMemo(() => {
    let result = [...records];
    
    // In "Pending" mode, filter out already settled records
    if (paymentViewMode === 'pending') {
        result = result.filter(r => !r.payrollRunId && r.status === 'approved');
    }

    if (startDate) {
        const start = new Date(startDate).setHours(0,0,0,0);
        result = result.filter(r => new Date(r.timestamp).getTime() >= start);
    }
    if (endDate) {
        const end = new Date(endDate).setHours(23,59,59,999);
        result = result.filter(r => new Date(r.timestamp).getTime() <= end);
    }
    return result;
  }, [records, startDate, endDate, paymentViewMode]);

  // Payment Calculation Logic (Using paymentRecords)
  const payments: PaymentCalculation[] = useMemo(() => {
      return farmers.map(farmer => {
          const farmerRecords = paymentRecords.filter(r => r.farmerId === farmer.id);
          const route = routes.find(r => r.name === farmer.route) || { pricePerKg: 0, transportCostPerKg: 0 };
          
          let totalKg = 0;
          let grossPay = 0;
          let transport = 0;
          let cess = 0;
          let transactionCost = 0;
          let isSettled = true;

          farmerRecords.forEach(record => {
             if (!record.payrollRunId) isSettled = false;
             const net = record.netWeight || 0;
             totalKg += net;
             grossPay += net * route.pricePerKg;
             transport += net * route.transportCostPerKg; // Route-based transport deduction
             cess += net * settings.cessPerKg; // Global cess
             transactionCost += settings.costPerTransaction; // Per session cost
          });

          // Only calculate personal deductions against pending payments, 
          // historically they are already deducted.
          const inputs = Math.min(farmer.balanceInputs, grossPay); 
          const advances = farmer.balanceAdvances; 
          
          const totalDeductions = transport + cess + transactionCost + inputs + advances;

          return {
              farmerId: farmer.id,
              farmerName: farmer.name,
              farmerPhone: farmer.phone,
              totalKg,
              sessions: farmerRecords.length,
              grossPay,
              deductions: {
                  transport,
                  cess,
                  transactionCost,
                  inputs,
                  advances
              },
              totalDeductions,
              netPay: grossPay - totalDeductions,
              isSettled: farmerRecords.length > 0 && isSettled
          };
      }).filter(p => p.totalKg > 0 || (paymentViewMode === 'pending' && (p.deductions.inputs > 0 || p.deductions.advances > 0)));
  }, [farmers, paymentRecords, routes, settings, paymentViewMode]);

  const payrollSummary = useMemo(() => {
      return payments.reduce((acc, curr) => {
          return {
              farmers: acc.farmers + 1,
              weight: acc.weight + curr.totalKg,
              gross: acc.gross + curr.grossPay,
              deductions: acc.deductions + curr.totalDeductions,
              net: acc.net + curr.netPay
          };
      }, { farmers: 0, weight: 0, gross: 0, deductions: 0, net: 0 });
  }, [payments]);

  // Historical Chart Data for Selected Farmer + Weather Correlation
  const historyChartData = useMemo(() => {
    if (!selectedFarmer) return [];
    const data = [];
    const today = new Date();
    
    // Seed random rainfall based on Farmer ID char code sum
    const seed = selectedFarmer.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const monthRecords = records.filter(r => {
        const rd = new Date(r.timestamp);
        return rd.getMonth() === month && rd.getFullYear() === year && r.farmerId === selectedFarmer.id;
      });

      const totalWeight = monthRecords.reduce((sum, r) => sum + (r.netWeight || 0), 0);
      
      const route = routes.find(r => r.name === selectedFarmer.route) || { pricePerKg: 0, transportCostPerKg: 0 };
      const gross = totalWeight * route.pricePerKg;
      const operationalDeductions = totalWeight * (route.transportCostPerKg + settings.cessPerKg) + (monthRecords.length * settings.costPerTransaction);
      const estimatedNet = Math.max(0, gross - operationalDeductions);

      // Simulate Rainfall based on Kenya seasons (Long Rains: Mar-May, Short Rains: Oct-Dec)
      let baseRainfall = 50; // base mm
      // Add seasonality
      if ([2, 3, 4].includes(month)) baseRainfall += 150; // Mar, Apr, May (Wet)
      if ([9, 10, 11].includes(month)) baseRainfall += 100; // Oct, Nov, Dec (Wet)
      
      // Randomize slightly using ID seed to keep it consistent per farmer
      const variance = (seed % 50) + (Math.random() * 20);
      const rainfall = Math.floor(baseRainfall + variance);

      data.push({
        name: monthName,
        weight: parseFloat(totalWeight.toFixed(1)),
        earnings: parseFloat(estimatedNet.toFixed(0)),
        rainfall: rainfall
      });
    }
    return data;
  }, [selectedFarmer, records, routes, settings]);

  const filteredInspections = useMemo(() => {
      let result = [...inspections];
      if (inspectionSearchQuery) {
          const lower = inspectionSearchQuery.toLowerCase();
          result = result.filter(i => 
              i.farmerId.toLowerCase().includes(lower) || 
              farmers.find(f => f.id === i.farmerId)?.name.toLowerCase().includes(lower)
          );
      }
      return result.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inspections, inspectionSearchQuery, farmers]);

  const handleGenerateReport = async () => {
    setIsLoadingReport(true);
    const report = await generateDailyReport(records, farmers);
    setAiReport(report);
    setIsLoadingReport(false);
  };

  const handleRunML = async () => {
    setIsRunningML(true);
    let analysisRecords = [...records];
    if (startDate) {
        const start = new Date(startDate).setHours(0,0,0,0);
        analysisRecords = analysisRecords.filter(r => new Date(r.timestamp).getTime() >= start);
    }
    if (endDate) {
        const end = new Date(endDate).setHours(23,59,59,999);
        analysisRecords = analysisRecords.filter(r => new Date(r.timestamp).getTime() <= end);
    }

    const params = {
        horizon: mlHorizon,
        sensitivity: mlSensitivity
    };

    const result = await runMLAnalysis(analysisRecords, mlModelType, params);
    setMlResult(result);
    setIsRunningML(false);
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;
    
    setIsAskingAssistant(true);
    const context = JSON.stringify({
      totalCollected: stats.totalWeight,
      activeFarmers: stats.uniqueFarmers,
      recentRecords: records.slice(-10)
    });
    const response = await askAiAssistant(assistantQuery, context);
    setAssistantResponse(response);
    setIsAskingAssistant(false);
  };

  const openRegisterModal = () => { setIsEditingFarmer(false); setRegFirstName(''); setRegMiddleName(''); setRegLastName(''); setRegId(''); setRegPhone(''); setRegEmail(''); setRegRoute(''); setRegCentre(''); setRegAcreage(''); setRegLat(''); setRegLng(''); setRegBankName(''); setRegBankBranch(''); setRegAccountNumber(''); setRegNokName(''); setRegNokRelation(''); setRegNokPhone(''); setShowRegisterModal(true); }
  const openEditFarmerModal = (farmer: Farmer) => { setIsEditingFarmer(true); setRegFirstName(farmer.firstName || ''); setRegMiddleName(farmer.middleName || ''); setRegLastName(farmer.lastName || ''); setRegId(farmer.id); setRegPhone(farmer.phone); setRegEmail(farmer.email || ''); setRegRoute(farmer.route || ''); setRegCentre(farmer.centre || farmer.cooperativeId); setRegAcreage(farmer.acreage.toString()); setRegLat(farmer.location?.lat.toString() || ''); setRegLng(farmer.location?.lng.toString() || ''); setRegBankName(farmer.bankName || ''); setRegBankBranch(farmer.bankBranch || ''); setRegAccountNumber(farmer.accountNumber || ''); setRegNokName(farmer.nextOfKin || ''); setRegNokRelation(farmer.nextOfKinRelation || ''); setRegNokPhone(farmer.nextOfKinPhone || ''); setShowRegisterModal(true); }
  const handleSaveFarmer = (e: React.FormEvent) => { e.preventDefault(); if (regFirstName && regLastName && regId && regAcreage) { const fullName = [regFirstName, regMiddleName, regLastName].filter(Boolean).join(' '); const farmerData: Farmer = { id: regId, name: fullName, firstName: regFirstName, middleName: regMiddleName, lastName: regLastName, phone: regPhone || '', email: regEmail, cooperativeId: regCentre || 'MAIN-COOP', acreage: Number(regAcreage), route: regRoute, centre: regCentre, bankName: regBankName, bankBranch: regBankBranch, accountNumber: regAccountNumber, location: (regLat && regLng) ? { lat: Number(regLat), lng: Number(regLng) } : undefined, nextOfKin: regNokName, nextOfKinRelation: regNokRelation, nextOfKinPhone: regNokPhone, balanceInputs: isEditingFarmer ? (farmers.find(f => f.id === regId)?.balanceInputs || 0) : 0, balanceAdvances: isEditingFarmer ? (farmers.find(f => f.id === regId)?.balanceAdvances || 0) : 0, profilePicture: isEditingFarmer ? (farmers.find(f => f.id === regId)?.profilePicture) : undefined, }; if (isEditingFarmer) { onUpdateFarmer(farmerData); if (selectedFarmer && selectedFarmer.id === farmerData.id) { setSelectedFarmer({ ...farmerData, profilePicture: selectedFarmer.profilePicture }); } } else { onAddFarmer(farmerData); } setShowRegisterModal(false); } };
  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file && selectedFarmer) { const reader = new FileReader(); reader.onloadend = () => { const base64String = reader.result as string; const updatedFarmer = { ...selectedFarmer, profilePicture: base64String }; setSelectedFarmer(updatedFarmer); onUpdateFarmer(updatedFarmer); }; reader.readAsDataURL(file); } };
  const handleGenerateProfilePicture = () => { if (selectedFarmer) { const randomId = Math.floor(Math.random() * 1000); const url = `https://i.pravatar.cc/300?img=${randomId % 70}`; const updatedFarmer = { ...selectedFarmer, profilePicture: url }; setSelectedFarmer(updatedFarmer); onUpdateFarmer(updatedFarmer); } };
  const handleAddCharge = () => { if (!chargeModal || !chargeAmount) return; const amount = parseFloat(chargeAmount); if (isNaN(amount) || amount <= 0) return; const farmer = farmers.find(f => f.id === chargeModal.farmerId); if (farmer) { const updatedFarmer = { ...farmer }; if (chargeModal.type === 'input') { updatedFarmer.balanceInputs += amount; } else { updatedFarmer.balanceAdvances += amount; } onUpdateFarmer(updatedFarmer); } setChargeModal(null); setChargeAmount(''); };
  const handleExportFarmers = () => { const headers = [ "ID", "First Name", "Middle Name", "Last Name", "Phone", "Email", "Route", "Centre", "Acreage", "Bank Name", "Branch", "Account Number", "NOK Name", "NOK Relation", "NOK Phone" ]; const csvContent = [ headers.join(","), ...farmers.map(f => { const row = [ f.id, f.firstName || "", f.middleName || "", f.lastName || "", f.phone, f.email || "", f.route || "", f.centre || f.cooperativeId, f.acreage, f.bankName || "", f.bankBranch || "", f.accountNumber || "", f.nextOfKin || "", f.nextOfKinRelation || "", f.nextOfKinPhone || "" ]; return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","); }) ].join("\n"); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `majani_farmers_export_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleSaveSettings = () => { onUpdateSettings(localSettings); onUpdateRoutes(editingRoutes); alert('Settings and Routes saved successfully.'); };
  const openUserModal = (user?: User) => { setPasswordResetMsg(null); if (user) { setIsEditingUser(true); setUserFormUsername(user.username); setUserFormName(user.name); setUserFormRole(user.role); } else { setIsEditingUser(false); setUserFormUsername(''); setUserFormName(''); setUserFormRole(UserRole.CLERK); } setShowUserModal(true); };
  const handleSaveUser = (e: React.FormEvent) => { e.preventDefault(); if (userFormUsername && userFormName) { const newUser: User = { username: userFormUsername, name: userFormName, role: userFormRole }; if (isEditingUser) { onUpdateUser(newUser); } else { onAddUser(newUser); } setShowUserModal(false); } };
  const handleResetPassword = () => { setPasswordResetMsg(`Password reset successfully! Temporary password is: ${userFormUsername}123`); };
  const handleSaveInspection = () => { if (!auditFarmerId) return; const passedCount = auditChecklist.filter(c => c.passed).length; const score = (passedCount / auditChecklist.length) * 100; let status: 'compliant' | 'non_compliant' | 'conditional' = 'non_compliant'; if (score === 100) status = 'compliant'; else if (score >= 80) status = 'conditional'; const inspection: InspectionRecord = { id: `INS-${Date.now()}`, farmerId: auditFarmerId, auditorId: currentUser.username, date: new Date().toISOString(), score, status, notes: auditNotes, checklist: auditChecklist }; onAddInspection(inspection); setShowInspectionModal(false); setAuditFarmerId(''); setAuditNotes(''); setAuditChecklist(RAINFOREST_CRITERIA.map(c => ({ ...c, passed: false }))); };
  const filteredUsers = useMemo(() => { let result = [...users]; if (userSearchQuery) { const lower = userSearchQuery.toLowerCase(); result = result.filter(u => u.name.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower) || u.role.toLowerCase().includes(lower)); } return result; }, [users, userSearchQuery]);
  const filteredLogs = useMemo(() => { let result = [...activityLogs]; if (activitySearchQuery) { const lower = activitySearchQuery.toLowerCase(); result = result.filter(log => log.userName.toLowerCase().includes(lower) || log.userId.toLowerCase().includes(lower) || log.action.toLowerCase().includes(lower) || log.details.toLowerCase().includes(lower) ); } return result.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); }, [activityLogs, activitySearchQuery]);
  const handleSort = (key: string) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };
  const handleSendEmail = (e: React.FormEvent) => { e.preventDefault(); if (!selectedFarmer?.email) return; const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedFarmer.email)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`; window.open(gmailUrl, '_blank'); setEmailSubject(''); setEmailMessage(''); };
  const getSession = (timestamp: string) => { const date = new Date(timestamp); const hour = date.getHours(); return hour < 12 ? '1' : '2'; };
  const getFarmerDetails = (farmerId: string) => farmers.find(f => f.id === farmerId);
  const filteredFarmers = useMemo(() => { let result = [...farmers]; if (farmerSearchQuery) { const lowerQuery = farmerSearchQuery.toLowerCase(); result = result.filter(f => f.name.toLowerCase().includes(lowerQuery) || f.id.toLowerCase().includes(lowerQuery) || f.phone.includes(lowerQuery) ); } if (sortConfig) { result.sort((a, b) => { let valA: any = a[sortConfig.key as keyof Farmer]; let valB: any = b[sortConfig.key as keyof Farmer]; if (sortConfig.key === 'centre') { valA = a.centre || a.cooperativeId || ''; valB = b.centre || b.cooperativeId || ''; } else if (sortConfig.key === 'route') { valA = a.route || ''; valB = b.route || ''; } if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase(); if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); } return result; }, [farmers, farmerSearchQuery, sortConfig]);
  const filteredCollections = useMemo(() => { let result = [...records]; if (startDate) { const start = new Date(startDate).setHours(0,0,0,0); result = result.filter(r => new Date(r.timestamp).getTime() >= start); } if (endDate) { const end = new Date(endDate).setHours(23,59,59,999); result = result.filter(r => new Date(r.timestamp).getTime() <= end); } if (filterSession) { result = result.filter(r => getSession(r.timestamp) === filterSession); } if (filterClerk) { result = result.filter(r => r.clerkId === filterClerk); } if (filterRoute || filterCentre) { result = result.filter(r => { const farmer = getFarmerDetails(r.farmerId); if (!farmer) return false; if (filterRoute && farmer.route !== filterRoute) return false; if (filterCentre && (farmer.centre !== filterCentre && farmer.cooperativeId !== filterCentre)) return false; return true; }); } if (collectionSearchQuery) { const lowerQuery = collectionSearchQuery.toLowerCase(); result = result.filter(r => { const farmer = getFarmerDetails(r.farmerId); return ( r.id.toLowerCase().includes(lowerQuery) || r.farmerId.toLowerCase().includes(lowerQuery) || (farmer && farmer.name.toLowerCase().includes(lowerQuery)) ); }); } if (sortConfig) { result.sort((a, b) => { let valA: any = ''; let valB: any = ''; const farmerA = getFarmerDetails(a.farmerId); const farmerB = getFarmerDetails(b.farmerId); switch (sortConfig.key) { case 'timestamp': valA = new Date(a.timestamp).getTime(); valB = new Date(b.timestamp).getTime(); break; case 'weight': valA = a.weight; valB = b.weight; break; case 'session': valA = getSession(a.timestamp); valB = getSession(b.timestamp); break; case 'farmerId': valA = a.farmerId; valB = b.farmerId; break; case 'route': valA = farmerA?.route || ''; valB = farmerB?.route || ''; break; case 'centre': valA = farmerA?.centre || farmerA?.cooperativeId || ''; valB = farmerB?.centre || farmerB?.cooperativeId || ''; break; default: valA = a[sortConfig.key as keyof CollectionRecord] || ''; valB = b[sortConfig.key as keyof CollectionRecord] || ''; } if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase(); if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; return 0; }); } else { result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); } return result; }, [records, farmers, collectionSearchQuery, sortConfig, startDate, endDate, filterRoute, filterCentre, filterSession, filterClerk]);
  const collectionAnalysis = useMemo(() => { const totalWeight = filteredCollections.reduce((acc, curr) => acc + curr.weight, 0); const bagCount = filteredCollections.length; const avgQuality = bagCount > 0 ? filteredCollections.reduce((acc, curr) => acc + curr.qualityScore, 0) / bagCount : 0; return { totalWeight, bagCount, avgQuality }; }, [filteredCollections]);
  const filteredPayments = useMemo(() => { let result = [...payments]; if (paymentSearchQuery) { const lowerQuery = paymentSearchQuery.toLowerCase(); result = result.filter(p => p.farmerName.toLowerCase().includes(lowerQuery) || p.farmerId.toLowerCase().includes(lowerQuery) ); } return result; }, [payments, paymentSearchQuery]);
  const handleExportPayments = () => { const headers = [ "Farmer ID", "Name", "Phone", "Total Kg", "Gross Pay", "Transport", "Cess", "Transaction Costs", "Inputs Deduction", "Advances Deduction", "Net Pay" ]; const csvContent = [ headers.join(","), ...filteredPayments.map(p => { const row = [ p.farmerId, p.farmerName, p.farmerPhone, p.totalKg.toFixed(2), p.grossPay.toFixed(2), p.deductions.transport.toFixed(2), p.deductions.cess.toFixed(2), p.deductions.transactionCost.toFixed(2), p.deductions.inputs.toFixed(2), p.deductions.advances.toFixed(2), p.netPay.toFixed(2) ]; return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","); }) ].join("\n"); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `majani_payroll_export_${startDate || 'all'}_to_${endDate || 'all'}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const confirmSettlement = () => { 
      const deductionMap: Record<string, {inputs: number, advances: number}> = {}; 
      payments.forEach(p => { 
          deductionMap[p.farmerId] = { inputs: p.deductions.inputs, advances: p.deductions.advances }; 
      }); 
      onSettlePayroll( 
          startDate || new Date().toISOString().split('T')[0], 
          endDate || new Date().toISOString().split('T')[0], 
          paymentRecords, 
          deductionMap,
          payrollSummary.net
      ); 
      setShowSettleModal(false); 
      setPaymentViewMode('history'); 
  };

  return (
    <div className="flex h-screen bg-stone-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-stone-900 text-stone-300 flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 text-white border-b border-stone-800">
           <div className="bg-emerald-600 p-2 rounded-lg"><Sprout size={24} /></div>
           <div>
             <h1 className="font-bold text-lg leading-none">Majani Gold</h1>
             <span className="text-xs text-stone-500">Admin Portal</span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1">
           {[
             { id: 'overview', icon: FileBarChart, label: 'Overview' },
             { id: 'farmers', icon: Users, label: 'Farmers' },
             { id: 'collections', icon: ClipboardList, label: 'Collections' },
             { id: 'payments', icon: Banknote, label: 'Payroll' },
             { id: 'rainforest', icon: ShieldCheck, label: 'Compliance' },
             { id: 'users', icon: Lock, label: 'Access Control' },
             { id: 'reports', icon: FileText, label: 'Reports & ML' },
             { id: 'settings', icon: Settings, label: 'Configuration' },
             { id: 'activity', icon: History, label: 'Audit Logs' },
           ].map(item => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id as any)}
               className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors border-l-4
                 ${activeTab === item.id 
                    ? 'bg-stone-800 text-emerald-400 border-emerald-500' 
                    : 'border-transparent hover:bg-stone-800 hover:text-white'}
               `}
             >
               <item.icon size={18} />
               {item.label}
             </button>
           ))}
        </div>

        <div className="p-4 border-t border-stone-800">
           <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-900 text-emerald-400 flex items-center justify-center font-bold border border-emerald-700">
                {currentUser.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-stone-500 truncate">{currentUser.role}</p>
              </div>
           </div>
           <button onClick={onExit} className="w-full flex items-center justify-center gap-2 text-stone-400 hover:text-white text-sm py-2 rounded-lg hover:bg-stone-800 transition-colors">
             <LogOut size={16} /> Sign Out
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
         {/* Top Header */}
         <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-8 flex-shrink-0">
            <h2 className="text-xl font-bold text-stone-800 capitalize">{activeTab.replace('-', ' ')}</h2>
            <div className="flex items-center gap-4">
               <button className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
                  <span className="sr-only">Notifications</span>
                  <div className="relative">
                    <MessageSquare size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </div>
               </button>
               <div className="h-8 w-px bg-stone-200"></div>
               <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Calendar size={16} />
                  {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
               </div>
            </div>
         </header>

         {/* Content Scroll Area */}
         <main className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
               <div className="space-y-6 animate-fade-in-up">
                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                        <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><Scale size={24} /></div>
                           <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+12%</span>
                        </div>
                        <p className="text-stone-500 text-sm font-medium">Total Volume</p>
                        <h3 className="text-2xl font-bold text-stone-800">{stats.totalWeight.toLocaleString()} <span className="text-sm font-normal text-stone-400">kg</span></h3>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                         <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Users size={24} /></div>
                           <span className="flex items-center text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">Active</span>
                        </div>
                        <p className="text-stone-500 text-sm font-medium">Farmers</p>
                        <h3 className="text-2xl font-bold text-stone-800">{stats.uniqueFarmers}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                         <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Sparkles size={24} /></div>
                           <span className={`flex items-center text-xs font-bold px-2 py-1 rounded ${stats.avgQuality >= 80 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>{stats.avgQuality.toFixed(1)}%</span>
                        </div>
                        <p className="text-stone-500 text-sm font-medium">Avg Quality</p>
                        <h3 className="text-2xl font-bold text-stone-800">{stats.avgQuality >= 80 ? 'Premium' : 'Standard'}</h3>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                         <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><ShieldCheck size={24} /></div>
                           <span className="flex items-center text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">{((raStats.certified / raStats.total) * 100 || 0).toFixed(0)}%</span>
                        </div>
                        <p className="text-stone-500 text-sm font-medium">Compliance</p>
                        <h3 className="text-2xl font-bold text-stone-800">{raStats.certified}/{raStats.total} <span className="text-sm font-normal text-stone-400">Farms</span></h3>
                     </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
                     <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col">
                        <h3 className="font-bold text-stone-800 mb-6">Volume & Quality Trends (Last 7 Days)</h3>
                        <div className="flex-1">
                           <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={weeklyDualData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                                 <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#10b981'}} />
                                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#f59e0b'}} domain={[0, 100]} />
                                 <Tooltip />
                                 <Legend />
                                 <Bar yAxisId="left" dataKey="weight" name="Net Weight (kg)" fill="#10b981" barSize={32} radius={[4, 4, 0, 0]} />
                                 <Line yAxisId="right" type="monotone" dataKey="quality" name="Avg Quality (%)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} />
                              </ComposedChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col">
                        <h3 className="font-bold text-stone-800 mb-6">Recent Activity</h3>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                           {filteredLogs.slice(0, 5).map(log => (
                              <div key={log.id} className="flex gap-3 items-start">
                                 <div className="mt-1 min-w-[8px] h-2 rounded-full bg-emerald-400"></div>
                                 <div>
                                    <p className="text-sm font-medium text-stone-800">{log.action.replace('_', ' ')}</p>
                                    <p className="text-xs text-stone-500">{log.details}</p>
                                    <p className="text-[10px] text-stone-400 mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* DEEP DIVE ANALYTICS ROW */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-80">
                      {/* Route Contribution */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col">
                          <h3 className="font-bold text-stone-800 mb-2 flex items-center gap-2"><MapPin size={16} /> Route Yield</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={routePerformance}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {routePerformance.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend wrapperStyle={{fontSize: '11px'}} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>

                      {/* Clerk Efficiency */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col">
                          <h3 className="font-bold text-stone-800 mb-2 flex items-center gap-2"><Users size={16} /> Top Clerks</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={clerkPerformance} layout="vertical" margin={{left: 0}}>
                                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}} />
                                  <Tooltip cursor={{fill: 'transparent'}} />
                                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Weight Collected (kg)" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>

                      {/* Quality Distribution */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 flex flex-col">
                          <h3 className="font-bold text-stone-800 mb-2 flex items-center gap-2"><PieChartIcon size={16} /> Quality Spectrum</h3>
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={qualityDistribution}
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={80}
                                      dataKey="value"
                                  >
                                      {qualityDistribution.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                  </Pie>
                                  <Tooltip />
                                  <Legend wrapperStyle={{fontSize: '11px'}} />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
               </div>
            )}
            
            {/* FARMERS TAB */}
            {activeTab === 'farmers' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                            <input 
                                value={farmerSearchQuery}
                                onChange={(e) => setFarmerSearchQuery(e.target.value)}
                                placeholder="Search farmers by name, ID or phone..." 
                                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleExportFarmers} className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200">
                                <Download size={18} /> Export
                            </button>
                            <button onClick={openRegisterModal} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                                <Plus size={18} /> Add Farmer
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 text-stone-500 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('id')}>ID</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('name')}>Farmer Name</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('centre')}>Centre</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('acreage')}>Acreage</th>
                                    <th className="px-6 py-4">Balance (MTD)</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredFarmers.map(farmer => {
                                    const mtd = calculateRunningBalance(farmer.id);
                                    return (
                                    <tr key={farmer.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => setSelectedFarmer(farmer)}>
                                        <td className="px-6 py-4 font-mono text-xs text-stone-500">{farmer.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {farmer.profilePicture ? (
                                                    <img src={farmer.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                        {farmer.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-stone-800 text-sm">{farmer.name}</p>
                                                    <p className="text-xs text-stone-400">{farmer.phone}</p>
                                                </div>
                                            </div>
                                            <div className="mt-1">
                                                <QRCode value={farmer.id} size={32} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-600">{farmer.centre}</td>
                                        <td className="px-6 py-4 text-sm text-stone-600">{farmer.acreage} ac</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-emerald-700">KES {mtd.net.toLocaleString()}</div>
                                            <div className="text-xs text-stone-400">{mtd.weight.toFixed(1)} kg</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEditFarmerModal(farmer)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* COLLECTIONS TAB */}
            {activeTab === 'collections' && (
                <div className="space-y-6">
                    {/* Hourly Analysis Area Chart */}
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                        <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2"><Clock size={16} /> Hourly Throughput (Operational Rhythm)</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hourlyIntake}>
                                    <defs>
                                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="weight" stroke="#10b981" fillOpacity={1} fill="url(#colorWeight)" name="Collected (kg)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                <input value={collectionSearchQuery} onChange={e => setCollectionSearchQuery(e.target.value)} className="w-full pl-9 p-2 border border-stone-300 rounded-lg text-sm" placeholder="Search..." />
                            </div>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Date Range</label>
                             <div className="flex gap-2">
                                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-stone-300 rounded-lg text-sm" />
                                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-stone-300 rounded-lg text-sm" />
                             </div>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Route</label>
                             <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="p-2 border border-stone-300 rounded-lg text-sm min-w-[150px]">
                                 <option value="">All Routes</option>
                                 {routes.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                             </select>
                        </div>
                    </div>

                    {/* Interactive Summary Bar */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-md">
                            <p className="text-emerald-200 text-xs font-bold uppercase">Total Volume</p>
                            <p className="text-2xl font-bold">{collectionAnalysis.totalWeight.toFixed(1)} kg</p>
                        </div>
                        <div className="bg-white text-stone-800 p-4 rounded-xl shadow-sm border border-stone-200">
                            <p className="text-stone-400 text-xs font-bold uppercase">Bag Count</p>
                            <p className="text-2xl font-bold">{collectionAnalysis.bagCount}</p>
                        </div>
                        <div className="bg-white text-stone-800 p-4 rounded-xl shadow-sm border border-stone-200">
                            <p className="text-stone-400 text-xs font-bold uppercase">Avg Quality</p>
                            <p className={`text-2xl font-bold ${collectionAnalysis.avgQuality >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{collectionAnalysis.avgQuality.toFixed(1)}%</p>
                        </div>
                    </div>
                    
                    {/* Data Table */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 text-stone-500 text-xs uppercase font-bold">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('timestamp')}>Time</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('farmerId')}>Farmer</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('route')}>Route</th>
                                    <th className="px-6 py-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('centre')}>Centre</th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:text-emerald-600" onClick={() => handleSort('weight')}>Gross (kg)</th>
                                    <th className="px-6 py-4 text-right">Net (kg)</th>
                                    <th className="px-6 py-4 text-center">Quality</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Clerk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredCollections.map(r => {
                                    const f = farmers.find(farm => farm.id === r.farmerId);
                                    return (
                                        <tr key={r.id} className="hover:bg-stone-50 text-sm">
                                            <td className="px-6 py-4 text-stone-500">
                                                {new Date(r.timestamp).toLocaleDateString()} <br/>
                                                <span className="text-xs">{new Date(r.timestamp).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-stone-800">
                                                {f?.name || r.farmerId} <br/>
                                                <span className="text-xs text-stone-400 font-mono">{r.farmerId}</span>
                                            </td>
                                            <td className="px-6 py-4 text-stone-600">{f?.route || '-'}</td>
                                            <td className="px-6 py-4 text-stone-600">{f?.centre || '-'}</td>
                                            <td className="px-6 py-4 text-right text-stone-600">{r.weight}</td>
                                            <td className="px-6 py-4 text-right font-bold text-stone-800">{r.netWeight}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${r.qualityScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {r.qualityScore}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                 {r.status === 'pending' ? (
                                                     <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold flex items-center justify-center gap-1">
                                                         <AlertTriangle size={10} /> Pending
                                                     </span>
                                                 ) : (
                                                     <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-bold">Approved</span>
                                                 )}
                                            </td>
                                            <td className="px-6 py-4 text-stone-500 text-xs font-mono">{r.clerkId}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
                            <button onClick={() => setPaymentViewMode('pending')} className={`px-4 py-2 rounded-md text-sm font-medium ${paymentViewMode === 'pending' ? 'bg-emerald-100 text-emerald-800' : 'text-stone-500 hover:bg-stone-50'}`}>Pending Settlement</button>
                            <button onClick={() => setPaymentViewMode('history')} className={`px-4 py-2 rounded-md text-sm font-medium ${paymentViewMode === 'history' ? 'bg-emerald-100 text-emerald-800' : 'text-stone-500 hover:bg-stone-50'}`}>Payroll History</button>
                        </div>
                        {paymentViewMode === 'pending' && (
                             <div className="flex items-center gap-3">
                                 <button onClick={handleExportPayments} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 text-sm font-bold flex items-center gap-2">
                                     <Download size={16} /> Export CSV
                                 </button>
                                 <button onClick={() => setShowSettleModal(true)} disabled={filteredPayments.length === 0} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-transform active:scale-95 font-bold disabled:opacity-50">
                                    <Banknote size={20} /> Process Payment
                                 </button>
                             </div>
                        )}
                    </div>
                    
                    {paymentViewMode === 'pending' ? (
                        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-100">
                                    <tr>
                                        <th className="p-4">Farmer</th>
                                        <th className="p-4 text-right">Total Net Weight</th>
                                        <th className="p-4 text-right">Gross Pay</th>
                                        <th className="p-4 text-right">Deductions</th>
                                        <th className="p-4 text-right">Net Pay</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {filteredPayments.map(p => (
                                        <tr key={p.farmerId} className="hover:bg-stone-50">
                                            <td className="p-4">
                                                <div className="font-bold text-stone-800">{p.farmerName}</div>
                                                <div className="text-xs text-stone-500">{p.farmerId} • {p.farmerPhone}</div>
                                            </td>
                                            <td className="p-4 text-right">{p.totalKg.toFixed(2)} kg</td>
                                            <td className="p-4 text-right font-medium text-stone-600">{p.grossPay.toLocaleString()}</td>
                                            <td className="p-4 text-right text-red-400">-{p.totalDeductions.toLocaleString()}</td>
                                            <td className="p-4 text-right font-bold text-emerald-600">{p.netPay.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {filteredPayments.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-stone-400">No pending payments found for this period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-4">
                             {payrollRuns.map(run => (
                                 <div key={run.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex justify-between items-center">
                                     <div>
                                         <h3 className="font-bold text-stone-800">Payroll Run: {new Date(run.timestamp).toLocaleDateString()}</h3>
                                         <p className="text-sm text-stone-500">Period: {run.periodStart} to {run.periodEnd}</p>
                                         <div className="flex gap-3 mt-2">
                                             <span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-600">ID: {run.id}</span>
                                             <span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-600">By: {run.processedBy}</span>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-sm text-stone-500">Total Volume</p>
                                         <p className="font-bold text-stone-800">{run.totalWeight.toLocaleString()} kg</p>
                                         <p className="text-sm text-stone-500 mt-1">Total Payout</p>
                                         <p className="font-bold text-emerald-600">KES {run.totalPayout.toLocaleString()}</p>
                                         <button className="mt-2 text-emerald-600 text-sm font-medium hover:underline">Download Report</button>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* RAINFOREST ALLIANCE TAB */}
            {activeTab === 'rainforest' && (
                <div className="space-y-6">
                    {/* Compliance Stats */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                             <div className="flex items-center gap-3 mb-2 text-emerald-700 font-bold">
                                 <CheckCheck size={24} /> Fully Certified
                             </div>
                             <p className="text-3xl font-bold text-stone-800">{raStats.certified}</p>
                             <p className="text-xs text-stone-500">Farms compliant with all standards</p>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                             <div className="flex items-center gap-3 mb-2 text-amber-700 font-bold">
                                 <AlertTriangle size={24} /> Conditional
                             </div>
                             <p className="text-3xl font-bold text-stone-800">{raStats.conditional}</p>
                             <p className="text-xs text-stone-500">Minor corrective actions needed</p>
                        </div>
                        <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                             <div className="flex items-center gap-3 mb-2 text-red-700 font-bold">
                                 <XCircle size={24} /> Non-Compliant
                             </div>
                             <p className="text-3xl font-bold text-stone-800">{raStats.nonCompliant}</p>
                             <p className="text-xs text-stone-500">Critical failures found</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="relative w-80">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                             <input value={inspectionSearchQuery} onChange={e => setInspectionSearchQuery(e.target.value)} placeholder="Search inspections..." className="w-full pl-9 p-2 border border-stone-300 rounded-lg text-sm" />
                        </div>
                        <button onClick={() => setShowInspectionModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-bold">
                             <ClipboardCheck size={16} /> New Audit
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-stone-50 text-stone-500 font-bold">
                                <tr>
                                    <th className="p-4">Audit Date</th>
                                    <th className="p-4">Farmer</th>
                                    <th className="p-4 text-center">Score</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4">Auditor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredInspections.map(ins => {
                                    const farmer = farmers.find(f => f.id === ins.farmerId);
                                    return (
                                        <tr key={ins.id} className="hover:bg-stone-50">
                                            <td className="p-4 text-stone-500">{new Date(ins.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold text-stone-800">{farmer?.name || ins.farmerId}</td>
                                            <td className="p-4 text-center font-mono font-bold">{ins.score.toFixed(1)}%</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    ins.status === 'compliant' ? 'bg-green-100 text-green-700' :
                                                    ins.status === 'conditional' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {ins.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-stone-500">{ins.auditorId}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                         <div className="relative w-80">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                             <input value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} placeholder="Search users..." className="w-full pl-9 p-2 border border-stone-300 rounded-lg text-sm" />
                        </div>
                        <button onClick={() => openUserModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm">
                            <Plus size={16} /> Add User
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-stone-50 text-stone-500 font-bold">
                                <tr>
                                    <th className="p-4">Username</th>
                                    <th className="p-4">Full Name</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredUsers.map(u => (
                                    <tr key={u.username} className="hover:bg-stone-50">
                                        <td className="p-4 font-mono text-stone-600">{u.username}</td>
                                        <td className="p-4 font-bold text-stone-800">{u.name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 
                                                u.role === UserRole.CLERK ? 'bg-blue-100 text-blue-700' :
                                                'bg-stone-100 text-stone-600'
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => openUserModal(u)} className="text-emerald-600 hover:text-emerald-800 font-medium">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Global Settings */}
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm h-fit">
                            <h3 className="font-bold text-lg text-stone-800 mb-4 flex items-center gap-2"><Scale size={20} /> Global Weighment Variables</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Tare Weight (kg)</label>
                                    <input type="number" step="0.1" value={localSettings.tareWeight} onChange={e => setLocalSettings({...localSettings, tareWeight: parseFloat(e.target.value)})} className="w-full p-2 border border-stone-300 rounded-lg" />
                                    <p className="text-xs text-stone-400 mt-1">Deducted from every bag for sack weight.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Moisture Deduction (%)</label>
                                    <input type="number" step="0.1" value={localSettings.moistureDeduction} onChange={e => setLocalSettings({...localSettings, moistureDeduction: parseFloat(e.target.value)})} className="w-full p-2 border border-stone-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">County Cess (KES/kg)</label>
                                    <input type="number" step="0.1" value={localSettings.cessPerKg} onChange={e => setLocalSettings({...localSettings, cessPerKg: parseFloat(e.target.value)})} className="w-full p-2 border border-stone-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Per-Transaction Cost (KES)</label>
                                    <input type="number" step="0.1" value={localSettings.costPerTransaction} onChange={e => setLocalSettings({...localSettings, costPerTransaction: parseFloat(e.target.value)})} className="w-full p-2 border border-stone-300 rounded-lg" />
                                </div>
                            </div>
                        </div>

                        {/* Route Settings */}
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                             <h3 className="font-bold text-lg text-stone-800 mb-4 flex items-center gap-2"><MapPin size={20} /> Route Configurations</h3>
                             <div className="space-y-6">
                                 {editingRoutes.map((route, idx) => (
                                     <div key={idx} className="p-4 bg-stone-50 rounded-lg border border-stone-100">
                                         <div className="flex justify-between font-bold text-stone-800 mb-2">
                                             <span>{route.name} Route</span>
                                         </div>
                                         <div className="grid grid-cols-2 gap-4">
                                             <div>
                                                 <label className="block text-xs text-stone-400 mb-1">Price / Kg (KES)</label>
                                                 <input 
                                                    type="number" 
                                                    value={route.pricePerKg} 
                                                    onChange={(e) => {
                                                        const newRoutes = [...editingRoutes];
                                                        newRoutes[idx].pricePerKg = parseFloat(e.target.value);
                                                        setEditingRoutes(newRoutes);
                                                    }}
                                                    className="w-full p-2 bg-white border border-stone-200 rounded text-sm" 
                                                 />
                                             </div>
                                             <div>
                                                 <label className="block text-xs text-stone-400 mb-1">Transport / Kg (KES)</label>
                                                 <input 
                                                    type="number" 
                                                    value={route.transportCostPerKg} 
                                                    onChange={(e) => {
                                                        const newRoutes = [...editingRoutes];
                                                        newRoutes[idx].transportCostPerKg = parseFloat(e.target.value);
                                                        setEditingRoutes(newRoutes);
                                                    }}
                                                    className="w-full p-2 bg-white border border-stone-200 rounded text-sm" 
                                                 />
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <button onClick={handleSaveSettings} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 flex items-center gap-2">
                            <Save size={20} /> Save Configuration
                        </button>
                    </div>
                </div>
            )}
            
            {/* ACTIVITY LOG TAB */}
            {activeTab === 'activity' && (
                <div className="space-y-6">
                     <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                         <input value={activitySearchQuery} onChange={e => setActivitySearchQuery(e.target.value)} placeholder="Search logs..." className="w-full p-2 border border-stone-300 rounded-lg text-sm" />
                     </div>
                     <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                         <table className="w-full text-left text-sm">
                             <thead className="bg-stone-50 text-stone-500 font-bold">
                                 <tr>
                                     <th className="p-4">Time</th>
                                     <th className="p-4">User</th>
                                     <th className="p-4">Action</th>
                                     <th className="p-4">Details</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-stone-100">
                                 {filteredLogs.map(log => (
                                     <tr key={log.id} className="hover:bg-stone-50">
                                         <td className="p-4 text-stone-500 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                         <td className="p-4">
                                             <div className="font-bold text-stone-800">{log.userName}</div>
                                             <div className="text-xs text-stone-500">{log.userRole}</div>
                                         </td>
                                         <td className="p-4">
                                             <span className="px-2 py-1 bg-stone-100 rounded text-xs font-bold text-stone-700">{log.action}</span>
                                         </td>
                                         <td className="p-4 text-stone-600">{log.details}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                </div>
            )}
            
            {/* REPORTS & ML TAB */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8 rounded-2xl shadow-xl">
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Sparkles /> AI Analytics Engine</h2>
                            <p className="text-indigo-200 mb-6 text-sm">Use Gemini AI to forecast yields, detect anomalies, or cluster farmer performance.</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-300 uppercase mb-1">Model Type</label>
                                    <select value={mlModelType} onChange={(e) => setMlModelType(e.target.value as any)} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white">
                                        <option value="forecast">Yield Forecasting</option>
                                        <option value="anomaly">Anomaly Detection</option>
                                        <option value="clustering">Performance Clustering</option>
                                    </select>
                                </div>
                                
                                {mlModelType === 'forecast' && (
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-300 uppercase mb-1">Forecast Horizon (Days)</label>
                                        <input type="number" value={mlHorizon} onChange={e => setMlHorizon(parseInt(e.target.value))} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
                                    </div>
                                )}
                                
                                {mlModelType === 'anomaly' && (
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-300 uppercase mb-1">Sensitivity</label>
                                        <select value={mlSensitivity} onChange={e => setMlSensitivity(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white">
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>
                                )}
                                
                                <button onClick={handleRunML} disabled={isRunningML} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                                    {isRunningML ? <RefreshCw className="animate-spin" /> : <PlayCircle />} Run Analysis
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                            <h3 className="font-bold text-stone-800 mb-4 border-b border-stone-100 pb-2">Analysis Results</h3>
                            <div className="flex-1 overflow-y-auto bg-stone-50 p-4 rounded-lg font-mono text-sm text-stone-700 whitespace-pre-wrap">
                                {mlResult || "Run an analysis model to see results here..."}
                            </div>
                        </div>
                    </div>
                </div>
            )}

         </main>
      </div>
      
      {/* Modals */}
      {showSettleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Banknote size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-stone-800">Confirm Payroll Settlement</h2>
                      <p className="text-stone-500 text-sm mt-2">
                          This will close the current period and process payments for <strong className="text-stone-800">{filteredPayments.length} farmers</strong>.
                      </p>
                  </div>
                  
                  <div className="bg-stone-50 p-4 rounded-xl space-y-2 mb-6 text-sm">
                      <div className="flex justify-between">
                          <span className="text-stone-500">Period</span>
                          <span className="font-medium text-stone-800">{startDate || 'Start'} - {endDate || 'Now'}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-stone-500">Total Net Payout</span>
                          <span className="font-bold text-emerald-600">KES {payrollSummary.net.toLocaleString()}</span>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setShowSettleModal(false)} className="flex-1 py-3 text-stone-600 hover:bg-stone-100 rounded-xl font-medium">Cancel</button>
                      <button onClick={confirmSettlement} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg">Confirm & Pay</button>
                  </div>
              </div>
          </div>
      )}

      {showUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <h2 className="text-xl font-bold text-stone-800 mb-6">{isEditingUser ? 'Edit User' : 'Add New User'}</h2>
                  <form onSubmit={handleSaveUser} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Username</label>
                          <input required value={userFormUsername} onChange={e => setUserFormUsername(e.target.value)} disabled={isEditingUser} className="w-full p-2 border border-stone-300 rounded-lg disabled:bg-stone-100" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                          <input required value={userFormName} onChange={e => setUserFormName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Role</label>
                          <select value={userFormRole} onChange={e => setUserFormRole(e.target.value as UserRole)} className="w-full p-2 border border-stone-300 rounded-lg">
                              {Object.values(UserRole).map(role => (
                                  <option key={role} value={role}>{role}</option>
                              ))}
                          </select>
                      </div>
                      
                      {isEditingUser && (
                          <div className="pt-2">
                              <button type="button" onClick={handleResetPassword} className="text-emerald-600 text-sm font-medium hover:underline">Reset Password</button>
                              {passwordResetMsg && <p className="text-xs text-green-600 mt-1">{passwordResetMsg}</p>}
                          </div>
                      )}

                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Save User</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {showInspectionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                       <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2"><ShieldCheck /> New Compliance Audit</h2>
                       <button onClick={() => setShowInspectionModal(false)} className="p-2 hover:bg-stone-100 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                           <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Select Farmer</label>
                           <select value={auditFarmerId} onChange={e => setAuditFarmerId(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg">
                               <option value="">-- Choose Farmer --</option>
                               {farmers.map(f => <option key={f.id} value={f.id}>{f.name} ({f.id})</option>)}
                           </select>
                      </div>

                      <div className="space-y-3">
                          <h3 className="font-bold text-stone-700 border-b border-stone-100 pb-2">Audit Checklist</h3>
                          {auditChecklist.map((item, idx) => (
                              <label key={idx} className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 cursor-pointer">
                                  <input 
                                     type="checkbox" 
                                     checked={item.passed} 
                                     onChange={(e) => {
                                         const newList = [...auditChecklist];
                                         newList[idx].passed = e.target.checked;
                                         setAuditChecklist(newList);
                                     }}
                                     className="mt-1 w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500" 
                                  />
                                  <div>
                                      <p className="font-bold text-stone-800 text-sm">{item.item}</p>
                                      <span className="text-xs text-stone-400 bg-white border border-stone-200 px-1 rounded">{item.category}</span>
                                  </div>
                              </label>
                          ))}
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Auditor Notes</label>
                          <textarea value={auditNotes} onChange={e => setAuditNotes(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg h-24" placeholder="Enter observations..." />
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                          <button onClick={() => setShowInspectionModal(false)} className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg">Cancel</button>
                          <button onClick={handleSaveInspection} disabled={!auditFarmerId} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">Submit Audit</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {selectedFarmer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
              <div className="w-full max-w-4xl bg-white h-full shadow-2xl overflow-y-auto animate-slide-in-right">
                  <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                      <div>
                          <h2 className="text-2xl font-bold text-stone-800">Farmer Profile</h2>
                          <p className="text-sm text-stone-500">Full details and history</p>
                      </div>
                      <button onClick={() => setSelectedFarmer(null)} className="p-2 hover:bg-stone-200 rounded-full"><X size={24}/></button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row h-[calc(100vh-88px)]">
                      {/* Left Sidebar */}
                      <div className="w-full md:w-80 bg-stone-50 p-6 border-r border-stone-200 flex-shrink-0">
                          <div className="text-center mb-6">
                              <div className="relative w-32 h-32 mx-auto mb-4 group">
                                  {selectedFarmer.profilePicture ? (
                                      <img src={selectedFarmer.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover shadow-md border-4 border-white" />
                                  ) : (
                                      <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-4xl font-bold border-4 border-white shadow-md">
                                          {selectedFarmer.name.charAt(0)}
                                      </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                       <label className="cursor-pointer bg-white text-stone-800 p-2 rounded-full hover:bg-emerald-50">
                                           <Upload size={16} />
                                           <input type="file" className="hidden" accept="image/*" onChange={handleProfilePictureUpload} />
                                       </label>
                                       <button onClick={handleGenerateProfilePicture} className="bg-white text-stone-800 p-2 rounded-full hover:bg-emerald-50">
                                           <RefreshCw size={16} />
                                       </button>
                                  </div>
                              </div>
                              <h3 className="text-xl font-bold text-stone-800">{selectedFarmer.name}</h3>
                              <div className="bg-stone-900 text-white font-mono text-lg py-1 px-3 rounded mt-2 inline-block">
                                  {selectedFarmer.id}
                              </div>
                              <p className="text-sm text-stone-500 mt-2">{selectedFarmer.centre}</p>
                              
                              <button 
                                onClick={() => openEditFarmerModal(selectedFarmer)}
                                className="mt-4 w-full py-2 bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                              >
                                <Edit2 size={16} /> Edit Profile
                              </button>
                          </div>

                          <div className="space-y-4 mb-8">
                              <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                  <p className="text-xs text-stone-400 uppercase font-bold">Total Acreage</p>
                                  <p className="font-bold text-stone-800 flex items-center gap-2"><MapPin size={16} className="text-emerald-500"/> {selectedFarmer.acreage} Acres</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                  <p className="text-xs text-stone-400 uppercase font-bold">Route</p>
                                  <p className="font-bold text-stone-800">{selectedFarmer.route}</p>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                  <p className="text-xs text-stone-400 uppercase font-bold">Cooperative ID</p>
                                  <p className="font-bold text-stone-800">{selectedFarmer.cooperativeId}</p>
                              </div>
                          </div>
                          
                          <div className="text-center">
                              <div className="bg-white p-4 rounded-xl inline-block shadow-sm border border-stone-200 mb-2">
                                  <QRCode value={selectedFarmer.id} size={120} />
                              </div>
                              <p className="text-xs text-stone-400">Digital ID</p>
                          </div>
                      </div>

                      {/* Right Content */}
                      <div className="flex-1 p-8 overflow-y-auto">
                          
                          {/* Financial Snapshot */}
                          <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg mb-8 relative overflow-hidden">
                              <div className="relative z-10 flex justify-between items-start">
                                  <div>
                                      <p className="text-emerald-300 text-sm font-bold uppercase mb-1">Current Month (MTD)</p>
                                      <h3 className="text-4xl font-bold">KES {selectedFarmerMonthStats?.net.toLocaleString()}</h3>
                                      <p className="text-emerald-200 text-sm mt-1">Est. Net Payout</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-emerald-300 text-sm font-bold uppercase mb-1">Collected Volume</p>
                                      <h3 className="text-2xl font-bold">{selectedFarmerMonthStats?.weight.toFixed(1)} kg</h3>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mt-6 border-t border-emerald-800 pt-4">
                                  <div>
                                      <p className="text-xs text-emerald-400 uppercase">Outstanding Inputs</p>
                                      <p className="font-bold">KES {selectedFarmer.balanceInputs.toLocaleString()}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs text-emerald-400 uppercase">Cash Advances</p>
                                      <p className="font-bold">KES {selectedFarmer.balanceAdvances.toLocaleString()}</p>
                                  </div>
                              </div>
                          </div>

                          {/* Historical Chart */}
                          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
                               <h4 className="font-bold text-stone-700 mb-4">6 Month Performance</h4>
                               <div className="h-64">
                                   <ResponsiveContainer width="100%" height="100%">
                                       <ComposedChart data={historyChartData}>
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                           <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                           <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                           <Tooltip />
                                           <Bar yAxisId="left" dataKey="weight" name="Weight (kg)" fill="#10b981" barSize={32} radius={[4,4,0,0]} />
                                           <Line yAxisId="right" type="monotone" dataKey="earnings" name="Earnings (KES)" stroke="#f59e0b" strokeWidth={2} dot={{r:4}} />
                                       </ComposedChart>
                                   </ResponsiveContainer>
                               </div>
                          </div>

                          {/* Environmental Data & Correlation */}
                          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
                               <div className="flex justify-between items-center mb-6">
                                   <h4 className="font-bold text-stone-700 flex items-center gap-2">
                                       <CloudRain size={20} className="text-blue-500" />
                                       Weather & Environment
                                   </h4>
                                   <div className="flex gap-4">
                                        <div className="text-right">
                                            <p className="text-xs text-stone-400 uppercase">Est. Rainfall</p>
                                            <p className="font-bold text-blue-600 flex items-center gap-1 justify-end">
                                                <Droplets size={14} /> {historyChartData.length > 0 ? historyChartData[0].rainfall : 0} mm
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-stone-400 uppercase">Soil Moisture</p>
                                            <p className="font-bold text-stone-700">Good (65%)</p>
                                        </div>
                                   </div>
                               </div>
                               
                               <div className="h-64">
                                   <p className="text-xs text-stone-400 mb-2 text-center">Yield vs Rainfall Correlation</p>
                                   <ResponsiveContainer width="100%" height="100%">
                                       <ComposedChart data={historyChartData}>
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                           <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#10b981'}} label={{ value: 'Yield (kg)', angle: -90, position: 'insideLeft', style: {textAnchor: 'middle', fill: '#10b981', fontSize: 10} }} />
                                           <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#3b82f6'}} label={{ value: 'Rain (mm)', angle: 90, position: 'insideRight', style: {textAnchor: 'middle', fill: '#3b82f6', fontSize: 10} }} />
                                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                           <Bar yAxisId="left" dataKey="weight" name="Yield (kg)" fill="#10b981" barSize={24} radius={[4,4,0,0]} />
                                           <Line yAxisId="right" type="monotone" dataKey="rainfall" name="Rainfall (mm)" stroke="#3b82f6" strokeWidth={3} dot={{r:4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} />
                                       </ComposedChart>
                                   </ResponsiveContainer>
                               </div>
                          </div>

                          {/* Contact Info */}
                          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
                              <h4 className="font-bold text-stone-700 mb-4 border-b border-stone-100 pb-2">Contact & Personal</h4>
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-stone-100 p-2 rounded text-stone-500"><Phone size={16} /></div>
                                          <div>
                                              <p className="text-xs text-stone-400 uppercase">Mobile</p>
                                              <p className="font-medium">{selectedFarmer.phone}</p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                          <div className="bg-stone-100 p-2 rounded text-stone-500"><Mail size={16} /></div>
                                          <div>
                                              <p className="text-xs text-stone-400 uppercase">Email</p>
                                              <p className="font-medium">{selectedFarmer.email || 'N/A'}</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="space-y-3">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-stone-100 p-2 rounded text-stone-500"><UserIcon size={16} /></div>
                                          <div>
                                              <p className="text-xs text-stone-400 uppercase">Next of Kin</p>
                                              <p className="font-medium">{selectedFarmer.nextOfKin}</p>
                                              <p className="text-xs text-stone-500">{selectedFarmer.nextOfKinRelation} • {selectedFarmer.nextOfKinPhone}</p>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Map Section */}
                          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
                               <h4 className="font-bold text-stone-700 mb-4 flex items-center justify-between">
                                  <span>Farm Location</span>
                                  {selectedFarmer.location && (
                                      <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${selectedFarmer.location.lat},${selectedFarmer.location.lng}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-emerald-100"
                                      >
                                          <ExternalLink size={12} /> Open in Google Maps
                                      </a>
                                  )}
                               </h4>
                               <div className="h-64 bg-stone-100 rounded-xl overflow-hidden relative">
                                  {selectedFarmer.location ? (
                                      <iframe 
                                          width="100%" 
                                          height="100%" 
                                          frameBorder="0" 
                                          scrolling="no" 
                                          marginHeight={0} 
                                          marginWidth={0} 
                                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedFarmer.location.lng - 0.01}%2C${selectedFarmer.location.lat - 0.01}%2C${selectedFarmer.location.lng + 0.01}%2C${selectedFarmer.location.lat + 0.01}&layer=mapnik&marker=${selectedFarmer.location.lat}%2C${selectedFarmer.location.lng}`}
                                      ></iframe>
                                  ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                                          <MapPin size={48} className="mb-2 opacity-20" />
                                          <p>No GPS coordinates recorded</p>
                                      </div>
                                  )}
                               </div>
                          </div>

                          {/* Communication */}
                          {selectedFarmer.email && (
                              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
                                   <h4 className="font-bold text-stone-700 mb-4 flex items-center gap-2"><Send size={16} /> Send Email</h4>
                                   <form onSubmit={handleSendEmail} className="space-y-4">
                                       <input 
                                           placeholder="Subject" 
                                           value={emailSubject}
                                           onChange={e => setEmailSubject(e.target.value)}
                                           className="w-full p-2 border border-stone-300 rounded-lg text-sm"
                                       />
                                       <textarea 
                                           placeholder="Message..." 
                                           value={emailMessage}
                                           onChange={e => setEmailMessage(e.target.value)}
                                           className="w-full p-2 border border-stone-300 rounded-lg text-sm h-24"
                                       />
                                       <div className="flex justify-end">
                                           <button type="submit" className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-stone-900">
                                               <Mail size={14} /> Open in Gmail
                                           </button>
                                       </div>
                                   </form>
                              </div>
                          )}

                          {/* Recent Collections */}
                          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                              <h4 className="font-bold text-stone-700 mb-4">Recent Collections</h4>
                              <table className="w-full text-left text-sm">
                                  <thead className="bg-stone-50 text-stone-500 font-bold">
                                      <tr>
                                          <th className="p-3">Receipt #</th>
                                          <th className="p-3">Date</th>
                                          <th className="p-3">Session</th>
                                          <th className="p-3 text-right">Net Weight</th>
                                          <th className="p-3 text-center">Quality</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100">
                                      {records.filter(r => r.farmerId === selectedFarmer.id).slice(0, 5).map(r => (
                                          <tr key={r.id}>
                                              <td className="p-3 font-mono text-stone-500 text-xs">{r.id}</td>
                                              <td className="p-3">{new Date(r.timestamp).toLocaleDateString()}</td>
                                              <td className="p-3">{getSession(r.timestamp) === '1' ? 'AM' : 'PM'}</td>
                                              <td className="p-3 text-right font-bold">{r.netWeight} kg</td>
                                              <td className="p-3 text-center">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.qualityScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                      {r.qualityScore}%
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                      {records.filter(r => r.farmerId === selectedFarmer.id).length === 0 && (
                                          <tr><td colSpan={5} className="p-6 text-center text-stone-400">No collections found.</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>

                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* Farmer Registration/Edit Modal - MOVED AFTER DETAIL VIEW TO ENSURE Z-INDEX LAYERING or set z-[60] */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-stone-800">{isEditingFarmer ? 'Edit Farmer' : 'Register New Farmer'}</h2>
                     <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-stone-100 rounded-full"><X size={20}/></button>
                 </div>
                 <form onSubmit={handleSaveFarmer} className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">First Name</label>
                            <input required value={regFirstName} onChange={e => setRegFirstName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Last Name</label>
                            <input required value={regLastName} onChange={e => setRegLastName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                        </div>
                     </div>
                     
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Farmer ID (Unique)</label>
                        <input required value={regId} onChange={e => setRegId(e.target.value)} disabled={isEditingFarmer} className="w-full p-2 border border-stone-300 rounded-lg disabled:bg-stone-100" />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Acreage</label>
                            <input required type="number" step="0.1" value={regAcreage} onChange={e => setRegAcreage(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                            <input value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Route</label>
                             <select value={regRoute} onChange={e => setRegRoute(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg">
                                 <option value="">Select Route</option>
                                 {routes.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Centre</label>
                             <input value={regCentre} onChange={e => setRegCentre(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                         </div>
                     </div>
                     
                     {/* Bank Details */}
                     <div className="border-t border-stone-100 pt-4 mt-4">
                         <h4 className="font-bold text-stone-700 mb-3 text-sm">Financial Details</h4>
                         <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Bank Name</label>
                                <input value={regBankName} onChange={e => setRegBankName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Branch</label>
                                <input value={regBankBranch} onChange={e => setRegBankBranch(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Account No.</label>
                                <input value={regAccountNumber} onChange={e => setRegAccountNumber(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                            </div>
                         </div>
                     </div>

                     {/* Next of Kin */}
                     <div className="border-t border-stone-100 pt-4 mt-4">
                         <h4 className="font-bold text-stone-700 mb-3 text-sm">Next of Kin</h4>
                         <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                                <input value={regNokName} onChange={e => setRegNokName(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Relation</label>
                                <input value={regNokRelation} onChange={e => setRegNokRelation(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                                <input value={regNokPhone} onChange={e => setRegNokPhone(e.target.value)} className="w-full p-2 border border-stone-300 rounded-lg" />
                            </div>
                         </div>
                     </div>

                     <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
                         <button type="button" onClick={() => setShowRegisterModal(false)} className="px-4 py-2 text-stone-500 hover:bg-stone-50 rounded-lg">Cancel</button>
                         <button type="submit" className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Save Farmer</button>
                     </div>
                 </form>
             </div>
        </div>
      )}

    </div>
  );
};
