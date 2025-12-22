
import React, { useState, useEffect, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { SenderDashboard } from './components/SenderDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { FAQScreen } from './components/FAQScreen';
import { SupportScreen } from './components/SupportScreen';
import { User, Package, UserRole, PackageStatus, AppNotification, PaymentMethod, PricingConfig } from './types';
import { DatabaseService } from './services/database';
import { Home, User as UserIcon, Wifi, WifiOff, RefreshCw, Server } from 'lucide-react';

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
  
  const [lastGain, setLastGain] = useState<{amount: number, tracking: string} | null>(null);
  const [currentView, setCurrentView] = useState<'HOME' | 'PROFILE' | 'FAQ' | 'SUPPORT'>('HOME');

  const notifiedPackagesRef = useRef<Set<string>>(new Set());

  // 1. CHARGEMENT INITIAL DEPUIS LE "SERVEUR"
  useEffect(() => {
    const initData = async () => {
        const savedUser = sessionStorage.getItem('expedi_current_session');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        const dbUsers = await DatabaseService.getUsers();
        if (dbUsers.length === 0) {
            await DatabaseService.saveUser(DEFAULT_ADMIN);
            setAllUsers([DEFAULT_ADMIN]);
        } else {
            setAllUsers(dbUsers);
        }

        const dbPackages = await DatabaseService.getPackages();
        setPackages(dbPackages);
        dbPackages.forEach(p => notifiedPackagesRef.current.add(p.id));

        const savedPricing = localStorage.getItem('expedi_pricing');
        if (savedPricing) setPricingConfig(JSON.parse(savedPricing));
    };
    initData();
  }, []);

  // 2. BOUCLE DE SYNCHRONISATION "LIVE BACKEND"
  useEffect(() => {
    const syncInterval = setInterval(async () => {
        setIsSyncing(true);
        
        // Sync centralisée via le DatabaseService
        const storagePkgs = await DatabaseService.getPackages();
        
        // Logique de notification pour livreur
        if (currentUser?.role === UserRole.COURIER) {
            storagePkgs.forEach(pkg => {
                if (pkg.status === PackageStatus.PENDING && !notifiedPackagesRef.current.has(pkg.id)) {
                    handleAutoNotify(
                        currentUser.id, 
                        'Nouveau Colis Disponible ! 📦', 
                        `Une course de ${pkg.price} F à ${pkg.originCity}.`,
                        pkg.id
                    );
                    notifiedPackagesRef.current.add(pkg.id);
                }
            });
        }
        
        setPackages(storagePkgs);

        // Sync Notifications
        if (currentUser) {
            const myNotifs = await DatabaseService.getNotifications(currentUser.id);
            setNotifications(myNotifs);
        }

        // Sync Profil et Soldes
        const storageUsers = await DatabaseService.getUsers();
        setAllUsers(storageUsers);
        if (currentUser) {
            const updatedMe = storageUsers.find(u => u.id === currentUser.id);
            if (updatedMe && JSON.stringify(updatedMe) !== JSON.stringify(currentUser)) {
                setCurrentUser(updatedMe);
                sessionStorage.setItem('expedi_current_session', JSON.stringify(updatedMe));
            }
        }

        setTimeout(() => setIsSyncing(false), 800);
    }, 4000); 

    return () => clearInterval(syncInterval);
  }, [currentUser]);

  const handleAutoNotify = async (userId: string, title: string, message: string, packageId?: string) => {
      const newNotif: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          userId,
          title,
          message,
          isRead: false,
          timestamp: Date.now(),
          relatedPackageId: packageId
      };
      await DatabaseService.createNotification(newNotif);
  };

  const handleLogin = async (user: User) => {
    if (user.isBlocked) return alert("Compte bloqué.");
    const userWithWallet = { ...user, walletBalance: user.walletBalance || 0, earningsBalance: user.earningsBalance || 0 };
    setCurrentUser(userWithWallet);
    await DatabaseService.saveUser(userWithWallet);
    sessionStorage.setItem('expedi_current_session', JSON.stringify(userWithWallet));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('HOME');
    sessionStorage.removeItem('expedi_current_session');
  };

  const handleCreatePackage = async (pkg: Package) => {
    setIsSyncing(true);
    const saved = await DatabaseService.savePackage(pkg);
    setPackages(prev => [saved, ...prev]);
    notifiedPackagesRef.current.add(saved.id);
    setIsSyncing(false);
  };

  const handleAcceptPackage = async (pkgId: string, courierId: string) => {
    await DatabaseService.updatePackageStatus(pkgId, PackageStatus.ACCEPTED, courierId);
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
        await handleAutoNotify(pkg.senderId, 'Livreur en route ! 🛵', `Votre colis ${pkg.trackingNumber} a été accepté.`, pkg.id);
    }
  };

  const handleUpdateStatus = async (pkgId: string, status: PackageStatus) => {
    await DatabaseService.updatePackageStatus(pkgId, status);
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg && status === PackageStatus.DELIVERED) {
       const commission = Math.ceil(pkg.price * pricingConfig.commissionRate);
       const net = pkg.price - commission;
       await updateCourierWallets(pkg.courierId, pkg.price, commission, pkg.paymentMethod);
       if (currentUser?.id === pkg.courierId) setLastGain({ amount: net, tracking: pkg.trackingNumber });
       await handleAutoNotify(pkg.senderId, 'Colis Livré ! ✅', `Le colis ${pkg.trackingNumber} est livré.`, pkg.id);
    }
  };

  const updateCourierWallets = async (courierId: string | undefined, price: number, commission: number, method: PaymentMethod) => {
      if (!courierId) return;
      const courier = allUsers.find(u => u.id === courierId);
      if (courier) {
          let newCaution = (courier.walletBalance || 0);
          let newEarnings = (courier.earningsBalance || 0);
          if (price === 0 && commission < 0) newCaution += Math.abs(commission);
          else {
              newCaution -= commission; 
              if (method !== PaymentMethod.CASH) newEarnings += (price - commission);
          }
          await DatabaseService.updateUserBalances(courierId, newCaution, newEarnings);
      }
  };

  const handleMarkNotifAsRead = async (notifId: string) => {
      await DatabaseService.markNotificationRead(notifId);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} checkUserExists={(p) => allUsers.some(u => u.phone === p)} users={allUsers} packages={packages} />;
  }

  return (
    <div className="min-h-screen bg-midnight font-sans text-white pb-20">
      <header className="sticky top-0 z-50 bg-midnight/90 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-wide">EXPEDI<span className="text-pureOrange">-CARGO</span></h1>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-pureOrange animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Backend Live</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                <Server className={`w-3 h-3 ${isSyncing ? 'text-pureOrange' : 'text-green-500'}`} /> {isSyncing ? 'Sync...' : 'Online'}
            </div>
        </div>
      </header>

      <main>
        {currentView === 'PROFILE' ? (
            <ProfileScreen user={currentUser} onLogout={handleLogout} onDelete={() => {}} onNavigate={setCurrentView} onUpdateUser={async (u) => { await DatabaseService.saveUser(u); setCurrentUser(u); }} />
        ) : currentView === 'FAQ' ? (
            <FAQScreen onBack={() => setCurrentView('PROFILE')} />
        ) : (
            currentUser.role === UserRole.ADMIN ? (
                <AdminDashboard user={currentUser} allUsers={allUsers} packages={packages} pricingConfig={pricingConfig} onUpdatePricing={setPricingConfig} onUpdateUser={async (u) => { await DatabaseService.saveUser(u); }} onDeleteUser={() => {}} onLogout={handleLogout} />
            ) : currentUser.role === UserRole.SENDER ? (
                <SenderDashboard user={currentUser} packages={packages} allUsers={allUsers} notifications={notifications} pricingConfig={pricingConfig} onMarkNotifAsRead={handleMarkNotifAsRead} onCreatePackage={handleCreatePackage} />
            ) : (
                <CourierDashboard user={currentUser} packages={packages} notifications={notifications} lastGain={lastGain} onAcceptPackage={handleAcceptPackage} onUpdateStatus={handleUpdateStatus} onMarkNotifAsRead={handleMarkNotifAsRead} onClearNotifications={() => {}} onRecharge={(a) => updateCourierWallets(currentUser.id, 0, -a, PaymentMethod.CASH)} onCloseGainModal={() => setLastGain(null)} />
            )
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-midnight/95 backdrop-blur-lg border-t border-slate-800 p-3 px-8 flex justify-between items-center z-50">
        <div onClick={() => setCurrentView('HOME')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${currentView === 'HOME' ? 'text-pureOrange scale-110' : 'text-slate-500'}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">Accueil</span>
        </div>
        
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pureOrange p-4 rounded-full shadow-lg shadow-pureOrange/40 border-4 border-midnight cursor-pointer hover:scale-110 active:scale-95 transition-all" onClick={() => setCurrentView('HOME')}>
            <span className="text-white font-bold text-xl">{currentUser.role === UserRole.SENDER ? '+' : 'GO'}</span>
        </div>
        
        <div onClick={() => setCurrentView('PROFILE')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${['PROFILE', 'FAQ'].includes(currentView) ? 'text-pureOrange scale-110' : 'text-slate-500'}`}>
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Profil</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
