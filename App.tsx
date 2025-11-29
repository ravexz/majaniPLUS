
import React, { useState } from 'react';
import { ViewMode, CollectionRecord, Farmer, RouteConfig, GlobalSettings, UserRole, User, ActivityLog, PayrollRun, InspectionRecord } from './types';
import { MOCK_FARMERS, INITIAL_RECORDS, DEFAULT_ROUTES, DEFAULT_SETTINGS, MOCK_USERS, MOCK_LOGS, MOCK_PAYROLL_RUNS, MOCK_INSPECTIONS } from './constants';
import { MobileCollectionApp } from './components/MobileCollectionApp';
import { AdminDashboard } from './components/AdminDashboard';
import { FarmerDashboard } from './components/FarmerDashboard';
import { Smartphone, LayoutDashboard, Leaf, UserCircle, Key, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Data State
  const [records, setRecords] = useState<CollectionRecord[]>(INITIAL_RECORDS);
  const [farmers, setFarmers] = useState<Farmer[]>(MOCK_FARMERS);
  const [routes, setRoutes] = useState<RouteConfig[]>(DEFAULT_ROUTES);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(MOCK_LOGS);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(MOCK_PAYROLL_RUNS);
  const [inspections, setInspections] = useState<InspectionRecord[]>(MOCK_INSPECTIONS);

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Logging Helper
  const logUserAction = (user: User | null, action: string, details: string) => {
    if (!user) return;
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}`,
      userId: user.username,
      userName: user.name,
      userRole: user.role,
      action: action,
      details: details,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    // Simulate Backend Authentication & Role Lookup
    const lowerUser = username.toLowerCase();
    
    // Check against mock users first
    const foundUser = users.find(u => u.username.toLowerCase() === lowerUser);

    if (foundUser) {
        setCurrentUser(foundUser);
        logUserAction(foundUser, 'LOGIN', 'User logged in successfully');
        setLoginError(null);
        return;
    }

    // Fallback logic for demo purposes
    let role: UserRole = UserRole.CLERK; // Default role
    let displayName = username;

    // Check if login is a Farmer ID or generic farmer
    const foundFarmer = farmers.find(f => f.id.toLowerCase() === lowerUser);
    
    if (foundFarmer) {
        role = UserRole.FARMER;
        displayName = foundFarmer.name;
    } else if (lowerUser.includes('admin')) {
      role = UserRole.ADMIN;
      displayName = "System Administrator";
    } else if (lowerUser.includes('farmer')) {
      role = UserRole.FARMER;
      // Demo farmer account
      const demoFarmer = farmers[0];
      displayName = demoFarmer ? demoFarmer.name : "Jomo Kenyatta"; 
    } else if (lowerUser.includes('manager')) {
      role = UserRole.MANAGER;
      displayName = "Operations Manager";
    } else if (lowerUser.includes('pay')) {
      role = UserRole.PAYROLL_ADMIN;
      displayName = "Payroll Admin";
    } else if (lowerUser.includes('ext')) {
      role = UserRole.EXTENSION_OFFICER;
      displayName = "Extension Officer";
    } else {
      // Default to Clerk for standard logins
      role = UserRole.CLERK;
      displayName = `Clerk ${username}`;
    }

    const user: User = {
      username: username,
      name: displayName,
      role: role
    };
    setCurrentUser(user);
    logUserAction(user, 'LOGIN', 'User logged in successfully (Demo)');
    setLoginError(null);
  };

  const handleLogout = () => {
    logUserAction(currentUser, 'LOGOUT', 'User logged out');
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setLoginError(null);
  };

  const handleAddRecord = (record: CollectionRecord) => {
    setRecords(prev => [...prev, record]);
    if (currentUser) {
        logUserAction(currentUser, 'COLLECTION', `Recorded ${record.weight}kg from ${record.farmerId} (Quality: ${record.qualityScore}%)`);
    }
  };

  const handleAddFarmer = (farmer: Farmer) => {
    setFarmers(prev => [...prev, farmer]);
    if (currentUser) {
      logUserAction(currentUser, 'CREATE_FARMER', `Registered new farmer: ${farmer.name} (${farmer.id})`);
    }
  };

  const handleUpdateFarmer = (updatedFarmer: Farmer) => {
    setFarmers(prev => prev.map(f => f.id === updatedFarmer.id ? updatedFarmer : f));
    if (currentUser) {
      logUserAction(currentUser, 'UPDATE_FARMER', `Updated details for farmer: ${updatedFarmer.name} (${updatedFarmer.id})`);
    }
  };

  const handleUpdateRoutes = (updatedRoutes: RouteConfig[]) => {
    setRoutes(updatedRoutes);
    if (currentUser) {
      logUserAction(currentUser, 'UPDATE_ROUTES', 'Modified route configurations and pricing');
    }
  };

  const handleUpdateSettings = (updatedSettings: GlobalSettings) => {
    setSettings(updatedSettings);
    if (currentUser) {
      logUserAction(currentUser, 'UPDATE_SETTINGS', 'Modified global weighment settings');
    }
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    if (currentUser) {
      logUserAction(currentUser, 'CREATE_USER', `Created new user: ${newUser.username} (${newUser.role})`);
    }
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
    if (currentUser) {
      logUserAction(currentUser, 'UPDATE_USER', `Updated user details: ${updatedUser.username}`);
    }
  };

  const handleAddInspection = (inspection: InspectionRecord) => {
      setInspections(prev => [inspection, ...prev]);
      if (currentUser) {
          logUserAction(currentUser, 'INSPECTION', `Conducted RA audit for ${inspection.farmerId}. Score: ${inspection.score}%`);
      }
  };

  const handleSettlePayroll = (
      periodStart: string, 
      periodEnd: string, 
      eligibleRecords: CollectionRecord[],
      calculatedDeductions: Record<string, { inputs: number, advances: number }>,
      totalPayout: number
  ) => {
      if (eligibleRecords.length === 0) return;

      const payrollRunId = `PAY-${Date.now()}`;
      const totalWeight = eligibleRecords.reduce((sum, r) => sum + (r.netWeight || 0), 0);
      
      // Create a Set of IDs for O(1) lookup during record update
      const settledRecordIds = new Set(eligibleRecords.map(r => r.id));

      // 1. Create Payroll Run
      const newRun: PayrollRun = {
          id: payrollRunId,
          periodStart,
          periodEnd,
          totalWeight,
          totalPayout: totalPayout,
          totalFarmers: new Set(eligibleRecords.map(r => r.farmerId)).size,
          processedBy: currentUser?.username || 'system',
          timestamp: new Date().toISOString(),
          status: 'completed'
      };

      // 2. Update Records to link to this run using optimized lookup
      const updatedRecords = records.map(r => {
          if (settledRecordIds.has(r.id)) {
              return { ...r, payrollRunId, status: 'approved' as const }; // Ensure approved when paid
          }
          return r;
      });
      setRecords(updatedRecords);

      // 3. Update Farmer Debts (Recover Inputs/Advances)
      const updatedFarmers = farmers.map(f => {
          const deduction = calculatedDeductions[f.id];
          if (deduction) {
              return {
                  ...f,
                  balanceInputs: Math.max(0, f.balanceInputs - deduction.inputs),
                  balanceAdvances: Math.max(0, f.balanceAdvances - deduction.advances)
              };
          }
          return f;
      });
      setFarmers(updatedFarmers);
      
      setPayrollRuns(prev => [newRun, ...prev]);

      if (currentUser) {
          logUserAction(currentUser, 'PAYROLL_SETTLE', `Settled payroll for period ${periodStart} to ${periodEnd}. Run ID: ${payrollRunId}`);
      }
  };


  // Rendering Logic based on Role
  if (currentUser) {
    if (currentUser.role === UserRole.CLERK) {
      return (
        <MobileCollectionApp 
          farmers={farmers} 
          onAddRecord={handleAddRecord}
          onExit={handleLogout} 
          globalSettings={settings}
          currentUser={currentUser}
        />
      );
    }
    
    if (currentUser.role === UserRole.FARMER) {
      // Find the specific farmer object
      let activeFarmer = farmers.find(f => f.id.toLowerCase() === currentUser.username.toLowerCase());
      
      // Fallback for demo 'farmer' login -> F001
      if (!activeFarmer && currentUser.username.toLowerCase() === 'farmer') {
          activeFarmer = farmers[0];
      }

      if (activeFarmer) {
          return (
             <FarmerDashboard 
                farmer={activeFarmer}
                records={records}
                settings={settings}
                routeConfig={routes.find(r => r.name === activeFarmer?.route)}
                currentUser={currentUser}
                onExit={handleLogout}
             />
          );
      } else {
          return (
              <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
                  <div className="bg-white p-6 rounded-lg shadow text-center">
                      <p className="text-red-500 mb-4">Error: Farmer profile not found.</p>
                      <button onClick={handleLogout} className="bg-stone-200 px-4 py-2 rounded">Logout</button>
                  </div>
              </div>
          );
      }
    }

    // Default to Admin Dashboard for Admin, Manager, Payroll, Extension Officer
    return (
      <AdminDashboard 
        records={records} 
        farmers={farmers} 
        routes={routes}
        settings={settings}
        users={users}
        activityLogs={activityLogs}
        payrollRuns={payrollRuns}
        inspections={inspections}
        onAddFarmer={handleAddFarmer}
        onUpdateFarmer={handleUpdateFarmer}
        onUpdateRoutes={handleUpdateRoutes}
        onUpdateSettings={handleUpdateSettings}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onSettlePayroll={handleSettlePayroll}
        onAddInspection={handleAddInspection}
        onExit={handleLogout}
        currentUser={currentUser}
      />
    );
  }

  // Login Screen
  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1597916829826-0a0d161e6d4c?auto=format&fit=crop&q=80&w=2835')] bg-cover bg-center flex items-center justify-center relative">
      <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-sm"></div>
      
      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-100 p-4 rounded-full">
            <Leaf className="text-emerald-600 w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-stone-800 mb-2">Majani Gold</h1>
        <p className="text-center text-stone-500 mb-8">Secure System Access</p>

        <form onSubmit={handleLogin} className="space-y-4">
          
          <div>
             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Username / ID</label>
             <div className="relative">
                <UserCircle className="absolute left-3 top-3 text-stone-400" size={20} />
                <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Username"
                    className="w-full p-3 pl-10 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
             </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Password</label>
             <div className="relative">
               <Key className="absolute left-3 top-3 text-stone-400" size={20} />
               <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 pl-10 border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
               />
             </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-700 text-white p-4 rounded-xl font-bold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            Login <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-6 p-3 bg-stone-50 rounded text-xs text-stone-500 border border-stone-100 text-center">
            <p className="font-bold mb-1">Demo Credentials:</p>
            <p>Admin: <span className="font-mono text-emerald-600">admin</span></p>
            <p>Clerk: <span className="font-mono text-emerald-600">clerk1</span></p>
            <p>Farmer: <span className="font-mono text-emerald-600">farmer</span> (or use ID e.g. F001)</p>
        </div>

        <p className="mt-8 text-center text-xs text-stone-400">
          Powered by Gemini AI • Version 1.2.0
        </p>
      </div>
    </div>
  );
};

export default App;