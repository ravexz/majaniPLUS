
import React, { useState, useMemo } from 'react';
import { CollectionRecord, Farmer, RouteConfig, GlobalSettings, User } from '../types';
import { askAiAssistant } from '../services/geminiService';
import { 
  Sprout, 
  TrendingUp, 
  ClipboardList, 
  Coins, 
  MessageSquare, 
  LogOut, 
  Calendar, 
  Leaf, 
  Droplets, 
  Scale, 
  ArrowUp,
  MapPin,
  ChevronRight,
  User as UserIcon,
  Phone,
  Wallet,
  X,
  CreditCard,
  Building,
  Smartphone,
  Zap,
  CheckCircle,
  Loader2,
  AlertCircle,
  Mail
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, Legend } from 'recharts';
import QRCode from 'react-qr-code';

interface Props {
  farmer: Farmer;
  records: CollectionRecord[];
  routeConfig: RouteConfig | undefined;
  settings: GlobalSettings;
  currentUser: User;
  onExit: () => void;
}

export const FarmerDashboard: React.FC<Props> = ({ farmer, records, routeConfig, settings, currentUser, onExit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'financials' | 'ai'>('overview');
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isAskingAssistant, setIsAskingAssistant] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // Payment Request State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Filter records for this farmer
  const myRecords = useMemo(() => {
    return records
      .filter(r => r.farmerId === farmer.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, farmer.id]);

  // Derived Stats
  const stats = useMemo(() => {
    const totalWeight = myRecords.reduce((sum, r) => sum + (r.netWeight || 0), 0);
    const avgQuality = myRecords.length > 0 
      ? myRecords.reduce((sum, r) => sum + r.qualityScore, 0) / myRecords.length 
      : 0;
    
    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentWeight = myRecords
      .filter(r => new Date(r.timestamp) >= thirtyDaysAgo)
      .reduce((sum, r) => sum + (r.netWeight || 0), 0);

    return { totalWeight, avgQuality, recentWeight };
  }, [myRecords]);

  // Financial Calculations (Current Month)
  const currentFinancials = useMemo(() => {
    const now = new Date();
    const currentMonthRecords = myRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const price = routeConfig?.pricePerKg || 0;
    const transport = routeConfig?.transportCostPerKg || 0;
    
    let gross = 0;
    let transportCost = 0;
    let cessCost = 0;
    let txnCost = 0;
    let weight = 0;

    currentMonthRecords.forEach(r => {
      const w = r.netWeight || 0;
      weight += w;
      gross += w * price;
      transportCost += w * transport;
      cessCost += w * settings.cessPerKg;
      txnCost += settings.costPerTransaction;
    });

    const totalDeductions = transportCost + cessCost + txnCost + farmer.balanceInputs + farmer.balanceAdvances;

    return {
      monthName: now.toLocaleString('default', { month: 'long' }),
      weight,
      gross,
      transportCost,
      cessCost,
      txnCost,
      inputDebt: farmer.balanceInputs,
      advanceDebt: farmer.balanceAdvances,
      totalDeductions,
      net: gross - totalDeductions
    };
  }, [myRecords, routeConfig, settings, farmer]);

  // Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-KE', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];
      
      const dayWeight = myRecords
        .filter(r => r.timestamp.startsWith(dateStr))
        .reduce((sum, r) => sum + (r.netWeight || 0), 0);
      
      data.push({ name: dayStr, weight: dayWeight });
    }
    return data;
  }, [myRecords]);

  // Historical Data (Last 6 Months) with Deductions
  const historyData = useMemo(() => {
    const data = [];
    const today = new Date();
    const price = routeConfig?.pricePerKg || 0;
    const transportRate = routeConfig?.transportCostPerKg || 0;
    const cessRate = settings.cessPerKg;
    const txnRate = settings.costPerTransaction;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const monthRecords = myRecords.filter(r => {
        const rd = new Date(r.timestamp);
        return rd.getMonth() === month && rd.getFullYear() === year;
      });

      const weight = monthRecords.reduce((sum, r) => sum + (r.netWeight || 0), 0);
      const gross = weight * price;
      
      const transport = weight * transportRate;
      const cess = weight * cessRate;
      const txn = monthRecords.length * txnRate;
      const deductions = transport + cess + txn;
      
      const net = Math.max(0, gross - deductions);

      data.push({
        name: monthName,
        weight: parseFloat(weight.toFixed(1)),
        gross: parseFloat(gross.toFixed(0)),
        deductions: parseFloat(deductions.toFixed(0)),
        net: parseFloat(net.toFixed(0)),
        // Alias for Overview chart compatibility
        earnings: parseFloat(gross.toFixed(0)) 
      });
    }
    return data;
  }, [myRecords, routeConfig, settings]);

  const runAiQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setAssistantQuery(queryText);
    setIsAskingAssistant(true);
    
    const context = JSON.stringify({
      farmerName: farmer.name,
      location: farmer.location,
      totalAcreage: farmer.acreage,
      recentHarvest: stats.recentWeight,
      avgQuality: stats.avgQuality
    });
    
    const prompt = `You are an agronomy advisor speaking directly to a tea farmer. 
    Farmer Context: ${context}. 
    User Question: ${queryText}. 
    Provide a helpful, encouraging, and practical answer in simple English. Focus on improving yield and quality.`;
    
    const response = await askAiAssistant(prompt, context);
    setAssistantResponse(response);
    setIsAskingAssistant(false);
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAiQuery(assistantQuery);
  };

  const handleWithdrawalRequest = (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(withdrawAmount);
      const maxAvailable = Math.max(0, currentFinancials.net);

      if (isNaN(amount) || amount <= 0 || amount > maxAvailable) return;

      setIsProcessingPayment(true);
      
      // Simulate API call to M-Pesa B2C
      setTimeout(() => {
          setIsProcessingPayment(false);
          setPaymentSuccess(true);
          
          // Auto close after success
          setTimeout(() => {
              setShowPaymentModal(false);
              setPaymentSuccess(false);
              setWithdrawAmount('');
          }, 3000);
      }, 2500);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 md:pb-0 font-sans">
      {/* Mobile Header */}
      <div className="bg-emerald-800 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10">
            <Leaf size={120} />
         </div>
         <div className="relative z-10 flex justify-between items-start">
            <div>
               <p className="text-emerald-200 text-sm font-medium mb-1">Welcome back,</p>
               <h1 className="text-2xl font-bold">{farmer.name}</h1>
               <div className="flex items-center gap-2 mt-2 text-xs bg-emerald-900/50 px-3 py-1 rounded-full w-fit backdrop-blur-sm">
                  <MapPin size={12} /> {farmer.route} Route • {farmer.centre}
               </div>
            </div>
            <button onClick={() => setShowProfile(true)} className="bg-white/10 p-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors">
               <UserIcon size={24} />
            </button>
         </div>
         
         {/* Quick Stat Card */}
         <div className="mt-6 grid grid-cols-2 gap-4">
             <div className="bg-emerald-700/50 p-3 rounded-xl border border-emerald-600/50 backdrop-blur-md">
                <p className="text-emerald-200 text-xs mb-1">This Month</p>
                <p className="text-xl font-bold">{currentFinancials.weight.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
             </div>
             <div className="bg-emerald-700/50 p-3 rounded-xl border border-emerald-600/50 backdrop-blur-md">
                <p className="text-emerald-200 text-xs mb-1">Est. Earnings</p>
                <p className="text-xl font-bold">KES {Math.max(0, currentFinancials.net).toLocaleString()}</p>
             </div>
         </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="p-4">
         <div className="flex bg-white p-1 rounded-xl shadow-sm border border-stone-200 mb-6 sticky top-2 z-20">
            {[
              { id: 'overview', label: 'Home', icon: Sprout },
              { id: 'collections', label: 'Logbook', icon: ClipboardList },
              { id: 'financials', label: 'Money', icon: Wallet },
              { id: 'ai', label: 'Advisor', icon: MessageSquare },
            ].map((tab) => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all
                     ${activeTab === tab.id ? 'bg-emerald-100 text-emerald-800' : 'text-stone-400 hover:bg-stone-50'}
                  `}
               >
                  <tab.icon size={20} />
                  {tab.label}
               </button>
            ))}
         </div>

         {/* Content Area */}
         <div className="space-y-6">
            
            {activeTab === 'overview' && (
               <div className="animate-fade-in-up">
                  {/* Quality Card */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 mb-4 flex items-center justify-between">
                     <div>
                        <p className="text-stone-500 text-sm font-medium">Avg. Leaf Quality</p>
                        <p className={`text-2xl font-bold mt-1 ${stats.avgQuality >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                           {stats.avgQuality.toFixed(0)}%
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                           {stats.avgQuality >= 80 ? 'Great job! Keep it up.' : 'Try to pick 2 leaves & a bud.'}
                        </p>
                     </div>
                     <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stats.avgQuality >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        <Leaf size={24} />
                     </div>
                  </div>

                  {/* 7 Days Chart */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 mb-4">
                     <h3 className="text-stone-800 font-bold mb-4 text-sm">Last 7 Days Harvest</h3>
                     <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                              <Tooltip cursor={{fill: '#ecfdf5'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="weight" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* 6 Month History Chart */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 mb-4">
                     <h3 className="text-stone-800 font-bold mb-4 text-sm">6-Month Performance</h3>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <ComposedChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                              <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#10b981'}} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#f59e0b'}} />
                              <Tooltip cursor={{fill: '#ecfdf5'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend />
                              <Bar yAxisId="left" dataKey="weight" name="Weight (kg)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                              <Line yAxisId="right" type="monotone" dataKey="earnings" name="Gross (KES)" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} />
                           </ComposedChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Action Items */}
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => setActiveTab('collections')} className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-left hover:bg-emerald-100 transition-colors group">
                        <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                           <ClipboardList size={16} />
                        </div>
                        <p className="font-bold text-stone-800 text-sm">View Logbook</p>
                        <p className="text-xs text-stone-500">Check records</p>
                     </button>
                     <button onClick={() => setActiveTab('ai')} className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-left hover:bg-blue-100 transition-colors group">
                        <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-blue-600 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                           <MessageSquare size={16} />
                        </div>
                        <p className="font-bold text-stone-800 text-sm">Get Advice</p>
                        <p className="text-xs text-stone-500">Ask Agronomist</p>
                     </button>
                  </div>
               </div>
            )}

            {activeTab === 'collections' && (
               <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                     <h3 className="font-bold text-stone-700">Harvest Logbook</h3>
                     <span className="text-xs bg-white border border-stone-200 px-2 py-1 rounded text-stone-500">{myRecords.length} Records</span>
                  </div>
                  <div className="divide-y divide-stone-100 max-h-[70vh] overflow-y-auto">
                     {myRecords.length > 0 ? (
                        myRecords.map(record => (
                           <div key={record.id} className="p-4 hover:bg-stone-50 transition-colors flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                 <div className="bg-stone-100 p-2 rounded-lg text-stone-500 font-bold text-center min-w-[50px]">
                                    <span className="block text-xs uppercase">{new Date(record.timestamp).toLocaleDateString('en-KE', { month: 'short' })}</span>
                                    <span className="block text-lg text-stone-800">{new Date(record.timestamp).getDate()}</span>
                                 </div>
                                 <div>
                                    <p className="font-bold text-stone-800">{record.netWeight} kg <span className="text-xs font-normal text-stone-400">Net</span></p>
                                    <p className="text-xs text-stone-500">
                                       {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Quality: <span className={record.qualityScore >= 80 ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>{record.qualityScore}%</span>
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <span className="block text-xs text-stone-400 font-mono mb-1">{record.id.split('-')[1]}</span>
                                 <ChevronRight size={16} className="text-stone-300 ml-auto" />
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="p-8 text-center text-stone-400">
                           <Leaf size={48} className="mx-auto mb-2 opacity-20" />
                           <p>No collections recorded yet.</p>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {activeTab === 'financials' && (
               <div className="space-y-4 animate-fade-in-up">
                  <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                     <div className="relative z-10">
                        <p className="text-emerald-300 text-xs uppercase font-bold tracking-wider mb-1">{currentFinancials.monthName} Estimate</p>
                        <h2 className="text-3xl font-bold mb-4">KES {currentFinancials.net.toLocaleString()}</h2>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-emerald-800 pt-4">
                           <div>
                              <p className="text-emerald-400 text-xs">Gross Pay</p>
                              <p className="font-medium">KES {currentFinancials.gross.toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-emerald-400 text-xs">Total Deductions</p>
                              <p className="font-medium text-red-300">- {currentFinancials.totalDeductions.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                     <Coins className="absolute -bottom-4 -right-4 text-emerald-800 opacity-50" size={120} />
                  </div>

                  {/* Request Money Button */}
                  <button 
                      onClick={() => {
                          setWithdrawAmount(Math.max(0, currentFinancials.net).toString());
                          setShowPaymentModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all active:scale-95 flex items-center justify-between group"
                  >
                      <div className="flex items-center gap-4">
                          <div className="bg-white/20 p-3 rounded-full group-hover:bg-white/30 transition-colors">
                              <Smartphone size={24} className="text-white" />
                          </div>
                          <div className="text-left">
                              <p className="font-bold text-lg leading-tight">Request Money Now</p>
                              <p className="text-emerald-100 text-xs">Withdraw to M-Pesa instantly</p>
                          </div>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Zap size={12} className="fill-yellow-400 text-yellow-400" /> B2C Instant
                      </div>
                  </button>

                  {/* Monthly Trends Chart */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
                     <h3 className="font-bold text-stone-800 mb-4 text-sm">6-Month Financial Trend</h3>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={historyData} margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#a8a29e'}} />
                              <Tooltip 
                                cursor={{fill: '#ecfdf5'}} 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                formatter={(value: number) => [`KES ${value.toLocaleString()}`, ""]}
                              />
                              <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                              <Bar dataKey="net" name="Net Earnings" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={24} />
                              <Bar dataKey="deductions" name="Operational Deductions" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} barSize={24} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
                     <h3 className="font-bold text-stone-800 mb-4 text-sm flex items-center gap-2">
                        <Scale size={16} className="text-stone-400" /> Deduction Breakdown (Current)
                     </h3>
                     <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                           <span className="text-stone-500">Transport Levy</span>
                           <span className="text-stone-800">KES {currentFinancials.transportCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-stone-500">County Cess</span>
                           <span className="text-stone-800">KES {currentFinancials.cessCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-stone-500">Weighing Fees</span>
                           <span className="text-stone-800">KES {currentFinancials.txnCost.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-stone-100 my-2 pt-2"></div>
                         <div className="flex justify-between">
                           <span className="text-red-500">Input Loan Repayment</span>
                           <span className="text-stone-800 font-medium">{currentFinancials.inputDebt > 0 ? `KES ${currentFinancials.inputDebt.toLocaleString()}` : '-'}</span>
                        </div>
                         <div className="flex justify-between">
                           <span className="text-red-500">Cash Advance</span>
                           <span className="text-stone-800 font-medium">{currentFinancials.advanceDebt > 0 ? `KES ${currentFinancials.advanceDebt.toLocaleString()}` : '-'}</span>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'ai' && (
               <div className="flex flex-col h-[70vh] bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden animate-fade-in-up">
                  <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center gap-3">
                     <div className="bg-emerald-200 p-2 rounded-full">
                        <Sprout size={20} className="text-emerald-800" />
                     </div>
                     <div>
                        <h3 className="font-bold text-emerald-900 text-sm">Majani Agronomist</h3>
                        <p className="text-xs text-emerald-600">AI-Powered Assistant</p>
                     </div>
                  </div>
                  
                  <div className="flex-1 p-4 overflow-y-auto bg-stone-50">
                     {!assistantResponse ? (
                        <div className="text-center mt-10">
                           <p className="text-stone-400 text-sm mb-4">Hello {farmer.firstName}! How can I help your farm today?</p>
                           <div className="flex flex-wrap gap-2 justify-center">
                              {[
                                'How to improve quality?',
                                'Weather forecast?',
                                'Best fertilizer?',
                                'Pest control tips?'
                              ].map(q => (
                                 <button key={q} onClick={() => runAiQuery(q)} className="text-xs bg-white border border-stone-200 px-3 py-1.5 rounded-full text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors">
                                    {q}
                                 </button>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           <div className="flex justify-end">
                              <div className="bg-emerald-600 text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm max-w-[80%]">
                                 {assistantQuery}
                              </div>
                           </div>
                           <div className="flex justify-start">
                              <div className="bg-white border border-stone-200 text-stone-800 px-4 py-3 rounded-2xl rounded-tl-none text-sm max-w-[90%] shadow-sm">
                                 {assistantResponse}
                              </div>
                           </div>
                        </div>
                     )}
                  </div>

                  <form onSubmit={handleAskAssistant} className="p-3 border-t border-stone-100 bg-white flex gap-2">
                     <input 
                        value={assistantQuery}
                        onChange={(e) => setAssistantQuery(e.target.value)}
                        placeholder="Ask about crops..."
                        className="flex-1 bg-stone-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                     />
                     <button 
                        disabled={isAskingAssistant || !assistantQuery}
                        className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                     >
                        <ArrowUp size={20} />
                     </button>
                  </form>
               </div>
            )}

         </div>
      </div>

      <div className="text-center mt-8 mb-4">
          <button onClick={onExit} className="text-stone-400 text-sm flex items-center justify-center gap-2 hover:text-red-500 transition-colors">
              <LogOut size={16} /> Sign Out
          </button>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-fade-in">
           <div className="bg-white w-full md:w-[480px] h-[85vh] md:h-[600px] rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-emerald-800 text-white p-6 relative">
                 <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 p-2 bg-black/10 rounded-full hover:bg-black/20">
                    <X size={20} />
                 </button>
                 <div className="text-center mt-2">
                    <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-emerald-700 text-3xl font-bold mb-3 overflow-hidden">
                       {farmer.profilePicture ? (
                           <img src={farmer.profilePicture} alt={farmer.name} className="w-full h-full object-cover" />
                       ) : (
                           farmer.name.charAt(0)
                       )}
                    </div>
                    <h2 className="text-xl font-bold">{farmer.name}</h2>
                    <div className="flex flex-col items-center justify-center gap-1 mt-2 opacity-80">
                        <div className="flex items-center gap-2">
                            <span className="font-mono bg-emerald-900/40 px-2 py-0.5 rounded text-xs">{farmer.id}</span>
                            <span className="text-xs">•</span>
                            <span className="text-xs">{farmer.phone}</span>
                        </div>
                        {farmer.email && <div className="flex items-center gap-1 text-xs"><Mail size={10} /> {farmer.email}</div>}
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-stone-50 space-y-6">
                 {/* QR Code Section */}
                 <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col items-center">
                    <div className="bg-white p-2">
                        <QRCode value={farmer.id} size={100} />
                    </div>
                    <p className="text-xs text-stone-400 mt-2">Scan at collection center</p>
                 </div>

                 {/* Farm Details */}
                 <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                       <MapPin size={16} className="text-emerald-600" /> Farm Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                          <p className="text-xs text-stone-400">Cooperative ID</p>
                          <p className="font-medium text-stone-700">{farmer.cooperativeId}</p>
                       </div>
                       <div>
                          <p className="text-xs text-stone-400">Total Acreage</p>
                          <p className="font-medium text-stone-700">{farmer.acreage} Acres</p>
                       </div>
                       <div>
                          <p className="text-xs text-stone-400">Route</p>
                          <p className="font-medium text-stone-700">{farmer.route}</p>
                       </div>
                       <div>
                          <p className="text-xs text-stone-400">Collection Centre</p>
                          <p className="font-medium text-stone-700">{farmer.centre}</p>
                       </div>
                    </div>
                 </div>

                 {/* Banking Details */}
                 <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                       <Building size={16} className="text-blue-600" /> Banking Info
                    </h3>
                    <div className="space-y-3 text-sm">
                       <div className="flex justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-500">Bank Name</span>
                          <span className="font-medium text-stone-800">{farmer.bankName || 'Not Set'}</span>
                       </div>
                       <div className="flex justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-500">Branch</span>
                          <span className="font-medium text-stone-800">{farmer.bankBranch || 'Not Set'}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-stone-500">Account No.</span>
                          <span className="font-mono font-medium text-stone-800">{farmer.accountNumber || 'Not Set'}</span>
                       </div>
                    </div>
                 </div>
                 
                 {/* Next of Kin */}
                 <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                       <UserIcon size={16} className="text-purple-600" /> Next of Kin
                    </h3>
                    <div className="space-y-1 text-sm">
                       <p className="font-bold text-stone-800">{farmer.nextOfKin || 'Not Specified'}</p>
                       {farmer.nextOfKin && (
                           <div className="flex gap-3 text-stone-500 text-xs">
                              <span>{farmer.nextOfKinRelation}</span>
                              <span>•</span>
                              <span>{farmer.nextOfKinPhone}</span>
                           </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Payment Withdrawal Modal */}
      {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                  <div className="bg-green-600 p-6 text-white text-center relative">
                      <button 
                          onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
                          className="absolute top-4 right-4 text-white/80 hover:text-white"
                      >
                          <X size={20} />
                      </button>
                      <h3 className="text-lg font-bold mb-1">Instant Withdrawal</h3>
                      <p className="text-green-100 text-xs flex items-center justify-center gap-1">
                          <Zap size={10} className="fill-yellow-300 text-yellow-300" /> M-Pesa B2C
                      </p>
                  </div>
                  
                  {!paymentSuccess ? (
                      <form onSubmit={handleWithdrawalRequest} className="p-6">
                          <div className="mb-4 text-center">
                              <p className="text-xs text-stone-500 uppercase font-bold mb-1">Available for Withdrawal</p>
                              <p className="text-2xl font-bold text-stone-800">KES {Math.max(0, currentFinancials.net).toLocaleString()}</p>
                          </div>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-stone-500 mb-1">Amount (KES)</label>
                                  <input 
                                      type="number"
                                      autoFocus
                                      required
                                      max={Math.max(0, currentFinancials.net)}
                                      value={withdrawAmount}
                                      onChange={(e) => setWithdrawAmount(e.target.value)}
                                      placeholder="0"
                                      className="w-full p-3 border border-stone-300 rounded-xl text-lg font-bold text-center outline-none focus:ring-2 focus:ring-green-500"
                                  />
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-stone-500 mb-1">M-Pesa Number</label>
                                  <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-600">
                                      <Smartphone size={18} />
                                      <span className="font-mono font-medium">{farmer.phone}</span>
                                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Verified</span>
                                  </div>
                              </div>
                              
                              {withdrawAmount && (
                                  <div className="p-3 bg-stone-50 rounded-lg text-xs space-y-1">
                                      <div className="flex justify-between">
                                          <span className="text-stone-500">Withdrawal Amount</span>
                                          <span className="font-bold">KES {parseFloat(withdrawAmount).toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span className="text-stone-500">Transaction Fee</span>
                                          <span className="text-red-500 font-medium">KES 15.00</span>
                                      </div>
                                      <div className="border-t border-stone-200 my-1 pt-1 flex justify-between">
                                          <span className="text-stone-800 font-bold">Total Deduction</span>
                                          <span className="text-stone-800 font-bold">KES {(parseFloat(withdrawAmount) + 15).toLocaleString()}</span>
                                      </div>
                                  </div>
                              )}
                          </div>

                          <button 
                              type="submit" 
                              disabled={isProcessingPayment || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > Math.max(0, currentFinancials.net)}
                              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg mt-6 shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                              {isProcessingPayment ? (
                                  <><Loader2 size={20} className="animate-spin" /> Processing...</>
                              ) : (
                                  'Withdraw Now'
                              )}
                          </button>
                      </form>
                  ) : (
                      <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 animate-bounce">
                              <CheckCircle size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-stone-800 mb-2">Request Successful!</h3>
                          <p className="text-stone-500 text-sm mb-6">
                              KES {parseFloat(withdrawAmount).toLocaleString()} has been sent to your M-Pesa account ending in ...{farmer.phone.slice(-4)}.
                          </p>
                          <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-800 mb-4">
                              Wait for the M-Pesa SMS confirmation shortly.
                          </div>
                          <button onClick={() => setShowPaymentModal(false)} className="text-stone-400 hover:text-stone-600 font-medium text-sm">Close</button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
    