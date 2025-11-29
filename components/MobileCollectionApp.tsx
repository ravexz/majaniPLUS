
import React, { useState, useEffect } from 'react';
import { Farmer, CollectionRecord, GlobalSettings, User } from '../types';
import { Scale, Users, CheckCircle, MapPin, AlertCircle, Cloud, Loader2, ScanLine, X, LogOut, ShieldAlert, Play, StopCircle, Clock, History, Calendar, Truck } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface Props {
  farmers: Farmer[];
  onAddRecord: (record: CollectionRecord) => void;
  onExit: () => void;
  globalSettings: GlobalSettings;
  currentUser: User;
}

export const MobileCollectionApp: React.FC<Props> = ({ farmers, onAddRecord, onExit, globalSettings, currentUser }) => {
  // Session State with Persistence
  const [isSessionActive, setIsSessionActive] = useState(() => {
    return localStorage.getItem('majani_session_active') === 'true';
  });

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(() => {
    const stored = localStorage.getItem('majani_session_start');
    return stored ? new Date(stored) : null;
  });

  const [sessionStats, setSessionStats] = useState(() => ({
    count: parseInt(localStorage.getItem('majani_session_count') || '0'),
    weight: parseFloat(localStorage.getItem('majani_session_weight') || '0')
  }));

  const [showSessionSummary, setShowSessionSummary] = useState(false);

  // Form State
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [quality, setQuality] = useState<number>(90);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastRecord, setLastRecord] = useState<CollectionRecord | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Persist Session Data
  useEffect(() => {
    localStorage.setItem('majani_session_active', String(isSessionActive));
    if (sessionStartTime) {
      localStorage.setItem('majani_session_start', sessionStartTime.toISOString());
    } else {
      localStorage.removeItem('majani_session_start');
    }
    localStorage.setItem('majani_session_count', String(sessionStats.count));
    localStorage.setItem('majani_session_weight', String(sessionStats.weight));
  }, [isSessionActive, sessionStartTime, sessionStats]);

  // Check for stale session (previous day) on mount
  useEffect(() => {
    if (isSessionActive && sessionStartTime) {
      const now = new Date();
      const sessionDate = new Date(sessionStartTime);
      // If session is not from today, close it automatically
      if (sessionDate.toDateString() !== now.toDateString()) {
        setIsSessionActive(false);
        setSessionStartTime(null);
        setSessionStats({ count: 0, weight: 0 });
        localStorage.removeItem('majani_session_active');
        localStorage.removeItem('majani_session_start');
        localStorage.removeItem('majani_session_count');
        localStorage.removeItem('majani_session_weight');
        alert("Previous session expired. Starting a fresh day.");
      }
    }
  }, []);

  // Use watchPosition to keep location fresh as clerk moves
  useEffect(() => {
    if (navigator.geolocation) {
      const geoId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.log('Location permission denied or unavailable', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(geoId);
    }
  }, []);

  // Simulate background sync for the last record
  useEffect(() => {
    if (lastRecord && !lastRecord.synced) {
      const timer = setTimeout(() => {
        setLastRecord(prev => prev ? { ...prev, synced: true } : null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [lastRecord]);

  // QR Scanner Effect
  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          false
        );

        scanner.render((decodedText) => {
          const farmer = farmers.find(f => f.id === decodedText);
          if (farmer) {
            setSelectedFarmerId(farmer.id);
            setShowScanner(false);
            scanner.clear().catch(console.error);
          } else {
            setScannerError(`ID "${decodedText}" not found.`);
          }
        }, (errorMessage) => {
          // ignore scan errors
        });

        return () => {
             scanner.clear().catch(err => console.error("Failed to clear scanner", err));
        };
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showScanner, farmers]);

  const calculateNetWeight = (grossWeight: number): number => {
      const afterTare = Math.max(0, grossWeight - globalSettings.tareWeight);
      const moistureLoss = (grossWeight * globalSettings.moistureDeduction) / 100;
      return Math.max(0, parseFloat((afterTare - moistureLoss).toFixed(2)));
  };

  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(new Date());
    setSessionStats({ count: 0, weight: 0 });
    setLastRecord(null);
  };

  const handleEndSession = () => {
    setShowSessionSummary(true);
  };

  const confirmEndSession = () => {
    setIsSessionActive(false);
    setSessionStartTime(null);
    setShowSessionSummary(false);
    setLastRecord(null);
    // Clear persist explicitly to be safe
    localStorage.removeItem('majani_session_active');
    localStorage.removeItem('majani_session_start');
    localStorage.removeItem('majani_session_count');
    localStorage.removeItem('majani_session_weight');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmerId || !weight) return;

    const weightVal = parseFloat(weight);
    if (isNaN(weightVal) || weightVal <= 0) {
      setError("Weight must be greater than 0 kg");
      return;
    }
    if (weightVal > 200) {
      setError("Weight exceeds maximum limit (200kg). Please verify.");
      return;
    }
    if (quality < 1 || quality > 100) {
      setError("Quality score must be between 1 and 100");
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      const netWeight = calculateNetWeight(weightVal);
      
      const newRecord: CollectionRecord = {
        id: `REC-${Date.now()}`,
        farmerId: selectedFarmerId,
        weight: weightVal,
        netWeight: netWeight,
        qualityScore: quality,
        timestamp: new Date().toISOString(),
        clerkId: currentUser.username,
        synced: false,
        location: location, // Attach the latest watched location
        status: quality < 80 ? 'pending' : 'approved'
      };

      onAddRecord(newRecord);
      setLastRecord(newRecord);
      setSessionStats(prev => ({
        count: prev.count + 1,
        weight: prev.weight + netWeight
      }));
      
      setWeight('');
      setQuality(90);
      setSelectedFarmerId('');
      setError(null);
      setIsSubmitting(false);
    }, 800);
  };

  // --- RENDER: INACTIVE SESSION (START SCREEN) ---
  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-emerald-800 rounded-b-[3rem]"></div>
        
        <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
           <div className="p-8 text-center border-b border-stone-100">
              <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                 <Truck size={40} className="text-emerald-700" />
              </div>
              <h1 className="text-2xl font-bold text-stone-800">Start Daily Batch</h1>
              <p className="text-stone-500 mt-2">Open a new truck load for today</p>
           </div>
           
           <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm p-3 bg-stone-50 rounded-lg">
                 <span className="text-stone-500 flex items-center gap-2"><Users size={16} /> Clerk</span>
                 <span className="font-bold text-stone-800">{currentUser.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-stone-50 rounded-lg">
                 <span className="text-stone-500 flex items-center gap-2"><MapPin size={16} /> Zone</span>
                 <span className="font-bold text-stone-800">Kericho-East</span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-stone-50 rounded-lg">
                 <span className="text-stone-500 flex items-center gap-2"><Calendar size={16} /> Date</span>
                 <span className="font-bold text-stone-800">{new Date().toLocaleDateString()}</span>
              </div>

              <button 
                onClick={handleStartSession}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                <Play size={20} fill="currentColor" /> Open Batch
              </button>
           </div>
           
           <div className="bg-stone-50 p-4 text-center">
              <button onClick={onExit} className="text-stone-400 hover:text-stone-600 text-sm flex items-center justify-center gap-2 mx-auto">
                 <LogOut size={14} /> Log Out
              </button>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDER: ACTIVE SESSION ---
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative pb-20">
      {/* Header */}
      <div className="bg-emerald-700 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
               Daily Batch Active
            </h1>
            <div className="flex gap-3 text-xs text-emerald-100 items-center mt-1">
               <span className="flex items-center gap-1 opacity-80">
                 <Clock size={12} /> Started: {sessionStartTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
               <span className="bg-emerald-800/50 px-2 py-0.5 rounded font-mono">
                 {sessionStats.count} Bags
               </span>
            </div>
          </div>
          <button 
            onClick={handleEndSession} 
            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-100 px-3 py-1.5 rounded border border-red-400/30 flex items-center gap-1 transition-colors backdrop-blur-sm"
          >
            <StopCircle size={14} /> Close Batch
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {lastRecord && (
          <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3 animate-fade-in-down transition-all duration-300">
            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-bold text-green-800">
                {lastRecord.status === 'pending' ? 'Sent for Approval' : 'Collection Recorded!'}
              </p>
              <p className="text-sm text-green-700">
                Gross: {lastRecord.weight}kg • Net: <strong>{lastRecord.netWeight}kg</strong>
              </p>
              <div className="flex items-center gap-3 mt-2">
                 {lastRecord.synced ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                      <Cloud size={12} className="fill-emerald-700/50" /> Synced
                    </span>
                 ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
                       <Loader2 size={12} className="animate-spin" /> Syncing...
                    </span>
                 )}
                 {lastRecord.status === 'pending' && (
                   <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                     <ShieldAlert size={12} /> Pending Approval
                   </span>
                 )}
                 <span className="text-xs text-green-600">{new Date(lastRecord.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <button onClick={() => setLastRecord(null)} className="ml-auto text-green-600 text-sm hover:text-green-800">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Farmer Selection */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
            <label className="block text-sm font-medium text-stone-600 mb-2 flex items-center gap-2">
              <Users size={18} /> Select Farmer
            </label>
            <div className="flex gap-2">
                <select
                  required
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg"
                >
                  <option value="">-- Choose Farmer --</option>
                  {farmers.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => {
                      setShowScanner(true);
                      setScannerError(null);
                  }}
                  className="bg-emerald-100 text-emerald-700 p-3 rounded-lg border border-emerald-200 hover:bg-emerald-200 active:bg-emerald-300"
                >
                  <ScanLine size={24} />
                </button>
            </div>
          </div>

          {/* Weight Input */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
            <label className="block text-sm font-medium text-stone-600 mb-2 flex items-center gap-2">
              <Scale size={18} /> Gross Weight (kg)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setError(null);
                }}
                placeholder="0.0"
                className={`w-full p-4 pl-4 pr-12 text-4xl font-bold text-stone-800 bg-stone-50 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-stone-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xl">KG</span>
            </div>
            {weight && !isNaN(parseFloat(weight)) && (
               <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-100 text-sm">
                  <div className="flex justify-between text-stone-500 mb-1">
                     <span>Less Tare ({globalSettings.tareWeight}kg):</span>
                     <span>-{(Math.min(parseFloat(weight), globalSettings.tareWeight)).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500 mb-2">
                     <span>Less Moisture ({globalSettings.moistureDeduction}%):</span>
                     <span>-{((parseFloat(weight) * globalSettings.moistureDeduction) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800 border-t border-stone-200 pt-1">
                     <span>Net Weight:</span>
                     <span>{calculateNetWeight(parseFloat(weight))} kg</span>
                  </div>
               </div>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse">
                <AlertCircle size={14} /> {error}
              </p>
            )}
          </div>

          {/* Quality Assessment */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-stone-600">Leaf Quality Score</label>
              <div className="flex items-center gap-1">
                <input
                    type="number"
                    min="1"
                    max="100"
                    value={quality || ''}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setQuality(val);
                        else setQuality(0);
                    }}
                    className={`w-16 text-right font-bold text-lg bg-stone-50 border-b-2 outline-none focus:border-emerald-500 rounded px-1 ${quality < 80 ? 'text-red-500 border-red-200' : 'text-emerald-600 border-emerald-200'}`}
                />
                <span className={`text-sm font-bold ${quality < 80 ? 'text-red-500' : 'text-emerald-600'}`}>%</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className={`w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer ${quality < 80 ? 'accent-red-500' : 'accent-emerald-600'}`}
            />
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>Poor (1)</span>
              <span>Excellent (100)</span>
            </div>
            {quality < 80 && (
              <div className="mt-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded animate-pulse">
                <AlertCircle size={14} /> Low quality requires supervisor approval.
              </div>
            )}
          </div>

          {/* Location Indicator */}
          <div className="flex items-center gap-2 text-xs text-stone-500 justify-center">
             <MapPin size={14} className={location ? "text-emerald-500" : "text-stone-300"} />
             {location ? "GPS Location Locked" : "Acquiring GPS..."}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
              ${isSubmitting 
                  ? 'bg-stone-400 cursor-not-allowed' 
                  : quality < 80 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
               }
            `}
          >
            {isSubmitting 
              ? 'Saving...' 
              : quality < 80 
                  ? <><ShieldAlert size={20} /> Submit for Approval</> 
                  : 'Submit Collection'
            }
          </button>

        </form>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setShowScanner(false)} 
            className="absolute top-4 right-4 text-white bg-white/20 p-2 rounded-full backdrop-blur-sm z-50"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden relative">
            <div className="p-4 bg-emerald-900 text-white text-center font-bold">
               Scan Farmer ID
            </div>
            <div id="qr-reader" className="w-full bg-stone-900"></div>
            {scannerError && (
              <div className="p-4 bg-red-100 text-red-700 text-center text-sm font-medium">
                {scannerError}
              </div>
            )}
            <div className="p-4 text-center text-xs text-stone-500">
               Point camera at the QR code on the farmer's card
            </div>
          </div>
        </div>
      )}

      {/* Session Summary Modal */}
      {showSessionSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="bg-emerald-800 p-6 text-white text-center">
                 <h2 className="text-xl font-bold mb-1">Batch Summary</h2>
                 <p className="text-emerald-200 text-sm">{new Date().toLocaleDateString()}</p>
              </div>
              <div className="p-6">
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-stone-50 p-3 rounded-lg text-center border border-stone-100">
                       <p className="text-stone-500 text-xs uppercase font-bold mb-1">Total Weight</p>
                       <p className="text-2xl font-bold text-emerald-700">{sessionStats.weight.toFixed(1)} <span className="text-sm text-stone-400">kg</span></p>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-lg text-center border border-stone-100">
                       <p className="text-stone-500 text-xs uppercase font-bold mb-1">Collections</p>
                       <p className="text-2xl font-bold text-stone-700">{sessionStats.count}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    <button 
                       onClick={confirmEndSession}
                       className="w-full bg-stone-800 text-white py-3 rounded-xl font-bold hover:bg-stone-900"
                    >
                       Close Batch & Exit
                    </button>
                    <button 
                       onClick={() => setShowSessionSummary(false)}
                       className="w-full bg-white text-stone-500 py-3 rounded-xl font-medium border border-stone-200 hover:bg-stone-50"
                    >
                       Continue Weighing
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
