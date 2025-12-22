
import React, { useState, useEffect, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { SenderDashboard } from './components/SenderDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { FAQScreen } from './components/FAQScreen';
import { SupportScreen } from './components/SupportScreen';
import { User, Package, UserRole, PackageStatus, AppNotification, PaymentMethod, PricingConfig } from './types';
import { Home, User as UserIcon, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const INITIAL_PACKAGES: Package[] = [];

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
  const [packages, setPackages] = useState<Package[]>(INITIAL_PACKAGES);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [lastGain, setLastGain] = useState<{amount: number, tracking: string} | null>(null);
  const [currentView, setCurrentView] = useState<'HOME' | 'PROFILE' | 'FAQ' | 'SUPPORT'>('HOME');

  // Ref pour suivre les IDs de colis déjà notifiés localement
  const notifiedPackagesRef = useRef<Set<string>>(new Set());

  // Chargement initial
  useEffect(() => {
    const savedUser = sessionStorage.getItem('expedi_current_session');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    const savedAllUsers = localStorage.getItem('expedi_all_users');
    if (savedAllUsers) setAllUsers(JSON.parse(savedAllUsers));
    else setAllUsers([DEFAULT_ADMIN]);

    const savedNotifs = localStorage.getItem('expedi_notifications');
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
    
    const savedPackages = localStorage.getItem('expedi_packages');
    if (savedPackages) {
        const pkgs = JSON.parse(savedPackages);
        setPackages(pkgs);
        // On marque les colis existants comme déjà connus pour ne pas spammer au démarrage
        pkgs.forEach((p: Package) => notifiedPackagesRef.current.add(p.id));
    }

    const savedPricing = localStorage.getItem('expedi_pricing');
    if (savedPricing) setPricingConfig(JSON.parse(savedPricing));
  }, []);

  // BOUCLE DE SYNCHRONISATION "CLOUD SIMULÉE"
  // Cette boucle permet de détecter les changements faits sur d'autres fenêtres/onglets
  useEffect(() => {
    const syncInterval = setInterval(() => {
        setIsSyncing(true);
        
        // 1. Sync Colis
        const storagePkgsStr = localStorage.getItem('expedi_packages');
        if (storagePkgsStr) {
            const storagePkgs: Package[] = JSON.parse(storagePkgsStr);
            
            // Détection de nouveaux colis pour les notifications de livreur
            if (currentUser?.role === UserRole.COURIER) {
                storagePkgs.forEach(pkg => {
                    if (pkg.status === PackageStatus.PENDING && !notifiedPackagesRef.current.has(pkg.id)) {
                        // C'est un nouveau colis que ce livreur n'a pas encore "vu"
                        addNotification(
                            currentUser.id, 
                            'Nouveau Colis Disponible ! 📦', 
                            `Une course de ${pkg.price} F est disponible à ${pkg.originCity}.`,
                            pkg.id
                        );
                        notifiedPackagesRef.current.add(pkg.id);
                    }
                });
            }
            
            if (JSON.stringify(packages) !== storagePkgsStr) {
                setPackages(storagePkgs);
            }
        }

        // 2. Sync Notifications
        const storageNotifsStr = localStorage.getItem('expedi_notifications');
        if (storageNotifsStr && JSON.stringify(notifications) !== storageNotifsStr) {
            setNotifications(JSON.parse(storageNotifsStr));
        }

        // 3. Sync Users (Caution, Earnings)
        const storageUsersStr = localStorage.getItem('expedi_all_users');
        if (storageUsersStr) {
            const storageUsers = JSON.parse(storageUsersStr);
            if (JSON.stringify(allUsers) !== storageUsersStr) {
                setAllUsers(storageUsers);
            }
            if (currentUser) {
                const updatedMe = storageUsers.find((u: User) => u.id === currentUser.id);
                if (updatedMe && JSON.stringify(updatedMe) !== JSON.stringify(currentUser)) {
                    setCurrentUser(updatedMe);
                    sessionStorage.setItem('expedi_current_session', JSON.stringify(updatedMe));
                }
            }
        }

        setTimeout(() => setIsSyncing(false), 800);
    }, 3000); // Toutes les 3 secondes

    return () => clearInterval(syncInterval);
  }, [currentUser, packages, notifications, allUsers]);

  // Sauvegarde persistante lors des modifications locales
  useEffect(() => {
    localStorage.setItem('expedi_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('expedi_packages', JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
    localStorage.setItem('expedi_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  const addNotification = (userId: string, title: string, message: string, packageId?: string) => {
      const newNotif: AppNotification = {
          id: Math.random().toString(36).substr(2, 9),
          userId,
          title,
          message,
          isRead: false,
          timestamp: Date.now(),
          relatedPackageId: packageId
      };
      setNotifications(prev => [newNotif, ...prev]);
  };

  const handleLogin = (user: User) => {
    if (user.isBlocked) return alert("Compte bloqué.");
    const userWithWallet = { ...user, walletBalance: user.walletBalance || 0, earningsBalance: user.earningsBalance || 0 };
    setCurrentUser(userWithWallet);
    const exists = allUsers.find(u => u.id === user.id);
    if (!exists) setAllUsers(prev => [...prev, userWithWallet]);
    sessionStorage.setItem('expedi_current_session', JSON.stringify(userWithWallet));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('HOME');
    sessionStorage.removeItem('expedi_current_session');
  };

  const handleCreatePackage = (pkg: Package) => {
    setPackages(prev => [pkg, ...prev]);
    notifiedPackagesRef.current.add(pkg.id); // L'expéditeur n'a pas besoin de notif pour son propre colis
  };

  const handleAcceptPackage = (pkgId: string, courierId: string) => {
    const updated = packages.map(p => p.id === pkgId ? { ...p, status: PackageStatus.ACCEPTED, courierId } : p);
    setPackages(updated);
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) addNotification(pkg.senderId, 'Livreur en route ! 🛵', `Votre colis ${pkg.trackingNumber} a été accepté.`, pkg.id);
  };

  const handleUpdateStatus = (pkgId: string, status: PackageStatus) => {
    const updated = packages.map(p => {
        if (p.id === pkgId) {
            if (status === PackageStatus.DELIVERED && p.status !== PackageStatus.DELIVERED) {
               const commission = Math.ceil(p.price * pricingConfig.commissionRate);
               const net = p.price - commission;
               updateCourierWallets(p.courierId, p.price, commission, p.paymentMethod);
               if (currentUser?.id === p.courierId) setLastGain({ amount: net, tracking: p.trackingNumber });
               addNotification(p.senderId, 'Colis Livré ! ✅', `Le colis ${p.trackingNumber} a bien été remis au destinataire.`, p.id);
            }
            return { ...p, status };
        }
        return p;
    });
    setPackages(updated);
  };

  const updateCourierWallets = (courierId: string | undefined, price: number, commission: number, method: PaymentMethod) => {
      if (!courierId) return;
      const updatedUsers = allUsers.map(u => {
          if (u.id === courierId) {
              let newCaution = (u.walletBalance || 0);
              let newEarnings = (u.earningsBalance || 0);
              if (price === 0 && commission < 0) newCaution += Math.abs(commission);
              else {
                  newCaution -= commission; 
                  if (method !== PaymentMethod.CASH) newEarnings += (price - commission);
              }
              return { ...u, walletBalance: newCaution, earningsBalance: newEarnings };
          }
          return u;
      });
      setAllUsers(updatedUsers);
  };

  const handleMarkNotifAsRead = (notifId: string) => {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} checkUserExists={(p) => allUsers.some(u => u.phone === p)} users={allUsers} packages={packages} />;
  }

  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  return (
    <div className="min-h-screen bg-midnight font-sans text-white pb-20">
      <header className="sticky top-0 z-50 bg-midnight/90 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-wide">EXPEDI<span className="text-pureOrange">-CARGO</span></h1>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-pureOrange animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Live Sync</span>
            </div>
        </div>
        <div className="flex items-center gap-3">
            {isSyncing && <RefreshCw className="w-3 h-3 text-pureOrange animate-spin" />}
            <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <Wifi className="w-3 h-3" /> {currentUser.courierDetails?.operatingCity || 'Abidjan'}
            </div>
        </div>
      </header>

      <main>
        {currentView === 'PROFILE' ? (
            <ProfileScreen user={currentUser} onLogout={handleLogout} onDelete={() => {}} onNavigate={setCurrentView} onUpdateUser={(u) => setAllUsers(prev => prev.map(x => x.id === u.id ? u : x))} />
        ) : currentView === 'FAQ' ? (
            <FAQScreen onBack={() => setCurrentView('PROFILE')} />
        ) : currentView === 'SUPPORT' ? (
            <SupportScreen onBack={() => setCurrentView('PROFILE')} />
        ) : (
            currentUser.role === UserRole.ADMIN ? (
                <AdminDashboard user={currentUser} allUsers={allUsers} packages={packages} pricingConfig={pricingConfig} onUpdatePricing={setPricingConfig} onUpdateUser={(u) => setAllUsers(prev => prev.map(x => x.id === u.id ? u : x))} onDeleteUser={(id) => setAllUsers(prev => prev.filter(x => x.id !== id))} onLogout={handleLogout} />
            ) : currentUser.role === UserRole.SENDER ? (
                <SenderDashboard user={currentUser} packages={packages} allUsers={allUsers} notifications={userNotifications} pricingConfig={pricingConfig} onMarkNotifAsRead={handleMarkNotifAsRead} onCreatePackage={handleCreatePackage} />
            ) : (
                <CourierDashboard user={currentUser} packages={packages} notifications={userNotifications} lastGain={lastGain} onAcceptPackage={handleAcceptPackage} onUpdateStatus={handleUpdateStatus} onMarkNotifAsRead={handleMarkNotifAsRead} onClearNotifications={() => setNotifications([])} onRecharge={(a) => updateCourierWallets(currentUser.id, 0, -a, PaymentMethod.CASH)} onCloseGainModal={() => setLastGain(null)} />
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
        
        <div onClick={() => setCurrentView('PROFILE')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${['PROFILE', 'FAQ', 'SUPPORT'].includes(currentView) ? 'text-pureOrange scale-110' : 'text-slate-500'}`}>
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">Profil</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
