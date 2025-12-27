
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { SenderDashboard } from './components/SenderDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { FAQScreen } from './components/FAQScreen';
import { SupportScreen } from './components/SupportScreen';
import { User, Package, UserRole, PackageStatus, AppNotification, PaymentMethod, PricingConfig } from './types';
import { DatabaseService } from './services/database';
import { Home, User as UserIcon, RefreshCw, CloudLightning, Loader2 } from 'lucide-react';

const DEFAULT_PRICING: PricingConfig = {
  basePriceIntra: 1500,
  basePriceInter: 3000,
  basePriceDoc: 2000,
  kmSurchargeInterval: 5,
  kmSurchargeAmount: 500,
  weightSurchargeMedium: 0.10,
  weightSurchargeHeavy: 0.30,
  commissionRate: 0.05
};

const DEFAULT_ADMIN: User = {
    id: 'admin-001',
    name: 'Super Admin',
    phone: 'admin',
    password: 'admin',
    role: UserRole.ADMIN,
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  
  const [lastGain, setLastGain] = useState<{amount: number, tracking: string} | null>(null);
  const [currentView, setCurrentView] = useState<'HOME' | 'PROFILE' | 'FAQ' | 'SUPPORT'>('HOME');

  const notifiedPackagesRef = useRef<Set<string>>(new Set());

  const syncWithBackend = useCallback(async (isManual = false) => {
    if (isSyncing && !isManual) return;
    setIsSyncing(true);
    setError(null);
    
    try {
        const dbPackages = await DatabaseService.getPackages();
        if (currentUser?.role === UserRole.COURIER) {
            dbPackages.forEach(pkg => {
                if (pkg.status === PackageStatus.PENDING && !notifiedPackagesRef.current.has(pkg.id)) {
                    handleAutoNotify(currentUser.id, 'Nouveau Colis ! 📦', `${pkg.price} F - ${pkg.originCity}`, pkg.id);
                    notifiedPackagesRef.current.add(pkg.id);
                }
            });
        }
        setPackages(dbPackages || []);

        if (currentUser) {
            const myNotifs = await DatabaseService.getNotifications(currentUser.id);
            setNotifications(myNotifs || []);
        }

        const dbUsers = await DatabaseService.getUsers();
        const finalUsers = dbUsers && dbUsers.length > 0 ? dbUsers : [DEFAULT_ADMIN];
        setAllUsers(finalUsers);
        
        if (currentUser) {
            const updatedMe = finalUsers.find(u => u.id === currentUser.id || u.phone === currentUser.phone);
            if (updatedMe) {
                setCurrentUser(updatedMe);
                sessionStorage.setItem('expedi_current_session', JSON.stringify(updatedMe));
            }
        }
        setLastSync(Date.now());
    } catch (e) {
        console.error("Sync Error:", e);
        setError("Erreur de synchronisation avec la base de données.");
    } finally {
        setTimeout(() => setIsSyncing(false), 600);
    }
  }, [currentUser, isSyncing]);

  useEffect(() => {
    syncWithBackend();
    DatabaseService.onMessage(() => syncWithBackend(true));
    
    // Tentative de récupération de session
    const saved = sessionStorage.getItem('expedi_current_session');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch(e) {
        sessionStorage.removeItem('expedi_current_session');
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => syncWithBackend(), 15000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  const handleAutoNotify = async (userId: string, title: string, message: string, packageId?: string) => {
      const newNotif: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          userId, title, message, isRead: false, timestamp: Date.now(), relatedPackageId: packageId
      };
      await DatabaseService.createNotification(newNotif);
  };

  const handleLogin = async (user: User) => {
    if (user.isBlocked) return alert("Compte bloqué.");
    setCurrentUser(user);
    await DatabaseService.saveUser(user);
    sessionStorage.setItem('expedi_current_session', JSON.stringify(user));
    syncWithBackend(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('HOME');
    sessionStorage.removeItem('expedi_current_session');
  };

  const handleCreatePackage = async (pkg: Package) => {
    await DatabaseService.savePackage(pkg);
    notifiedPackagesRef.current.add(pkg.id);
    syncWithBackend(true);
  };

  const handleAcceptPackage = async (pkgId: string, courierId: string) => {
    await DatabaseService.updatePackageStatus(pkgId, PackageStatus.ACCEPTED, courierId);
    syncWithBackend(true);
  };

  const handleUpdateStatus = async (pkgId: string, status: PackageStatus, notes?: string, signature?: any) => {
    await DatabaseService.updatePackageStatus(pkgId, status, undefined, notes, signature);
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg && status === PackageStatus.DELIVERED) {
       const commission = Math.ceil(pkg.price * pricingConfig.commissionRate);
       const net = pkg.price - commission;
       await updateCourierWallets(pkg.courierId, pkg.price, commission, pkg.paymentMethod);
       if (currentUser?.id === pkg.courierId) setLastGain({ amount: net, tracking: pkg.trackingNumber });
    }
    syncWithBackend(true);
  };

  const updateCourierWallets = async (courierId: string | undefined, price: number, commission: number, method: PaymentMethod) => {
      if (!courierId) return;
      const courier = allUsers.find(u => u.id === courierId);
      if (courier) {
          let newCaution = (courier.walletBalance || 0) - commission;
          let newEarnings = (courier.earningsBalance || 0);
          if (method !== PaymentMethod.CASH) newEarnings += (price - commission);
          await DatabaseService.updateUserBalances(courierId, newCaution, newEarnings);
      }
  };

  const handleMarkNotifAsRead = async (notifId: string) => {
      await DatabaseService.markNotificationRead(notifId);
      syncWithBackend(true);
  };

  const onUpdatePricing = (config: PricingConfig) => {
    setPricingConfig(config);
  };

  if (!currentUser) {
    return (
      <AuthScreen 
        onLogin={handleLogin} 
        checkUserExists={(p) => allUsers.some(u => u.phone === p)} 
        users={allUsers} 
        packages={packages} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-midnight font-sans text-white pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-midnight/90 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-wide">EXPEDI<span className="text-pureOrange">-CARGO</span></h1>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-pureOrange animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Live DB</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => syncWithBackend(true)} 
              className={`p-2 rounded-lg bg-slate-800 border border-slate-700 transition-all ${isSyncing ? 'rotate-180 text-pureOrange' : 'text-slate-400'}`}
              title="Actualiser"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex text-[10px] font-bold text-slate-500 items-center gap-1 uppercase bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-700">
                <CloudLightning className={`w-3 h-3 ${isSyncing ? 'text-pureOrange animate-bounce' : 'text-green-500'}`} /> 
                {isSyncing ? 'Sync...' : 'Online'}
            </div>
        </div>
      </header>

      {error && (
        <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs text-center animate-fade-in">
          {error}
        </div>
      )}

      <main className="relative z-10">
        <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-pureOrange" /></div>}>
          {currentView === 'PROFILE' ? (
              <ProfileScreen 
                user={currentUser} 
                onLogout={handleLogout} 
                onDelete={() => {}} 
                onNavigate={setCurrentView} 
                onUpdateUser={async (u) => { await DatabaseService.saveUser(u); setCurrentUser(u); syncWithBackend(true); }} 
              />
          ) : currentView === 'FAQ' ? (
              <FAQScreen onBack={() => setCurrentView('PROFILE')} />
          ) : (
              currentUser.role === UserRole.ADMIN ? (
                  <AdminDashboard 
                    user={currentUser} 
                    allUsers={allUsers} 
                    packages={packages} 
                    pricingConfig={pricingConfig} 
                    onUpdatePricing={onUpdatePricing} 
                    onUpdateUser={async (u) => { await DatabaseService.saveUser(u); syncWithBackend(true); }} 
                    onDeleteUser={(id) => {}} 
                    onLogout={handleLogout} 
                  />
              ) : currentUser.role === UserRole.SENDER ? (
                  <SenderDashboard 
                    user={currentUser} 
                    packages={packages} 
                    allUsers={allUsers} 
                    notifications={notifications} 
                    pricingConfig={pricingConfig} 
                    onMarkNotifAsRead={handleMarkNotifAsRead} 
                    onCreatePackage={handleCreatePackage} 
                  />
              ) : (
                  <CourierDashboard 
                    user={currentUser} 
                    packages={packages} 
                    notifications={notifications} 
                    lastGain={lastGain} 
                    lastSync={lastSync} 
                    isSyncing={isSyncing} 
                    onAcceptPackage={handleAcceptPackage} 
                    onUpdateStatus={handleUpdateStatus} 
                    onMarkNotifAsRead={handleMarkNotifAsRead} 
                    onClearNotifications={() => {}} 
                    onRecharge={(a) => updateCourierWallets(currentUser.id, 0, -a, PaymentMethod.CASH)} 
                    onCloseGainModal={() => setLastGain(null)} 
                  />
              )
          )}
        </Suspense>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-midnight/95 backdrop-blur-lg border-t border-slate-800 p-3 px-8 flex justify-between items-center z-50">
        <div 
          onClick={() => setCurrentView('HOME')} 
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${currentView === 'HOME' ? 'text-pureOrange scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">Accueil</span>
        </div>
        <div 
          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pureOrange p-4 rounded-full shadow-lg shadow-pureOrange/40 border-4 border-midnight cursor-pointer hover:scale-110 active:scale-95 transition-all" 
          onClick={() => { setCurrentView('HOME'); syncWithBackend(true); }}
        >
            <span className="text-white font-bold text-xl">{currentUser.role === UserRole.SENDER ? '+' : <CloudLightning className="w-6 h-6"/>}</span>
        </div>
        <div 
          onClick={() => setCurrentView('PROFILE')} 
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${['PROFILE', 'FAQ'].includes(currentView) ? 'text-pureOrange scale-110' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Profil</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
