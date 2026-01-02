
import React, { useState, useEffect, useCallback } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { SenderDashboard } from './components/SenderDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { FAQScreen } from './components/FAQScreen';
import { SupportScreen } from './components/SupportScreen';
import { User, Package, UserRole, PricingConfig, AppNotification, PackageStatus } from './types';
import { DatabaseService } from './services/database';
import { RefreshCw, Home, User as UserIcon } from 'lucide-react';

const DEFAULT_PRICING: PricingConfig = {
  basePriceIntra: 1500,
  basePriceInter: 3500,
  basePriceDoc: 2000,
  kmSurchargeInterval: 5,
  kmSurchargeAmount: 500,
  weightSurchargeMedium: 0.10,
  weightSurchargeHeavy: 0.30,
  commissionRate: 0.05 // Mis à jour à 5%
};

const DEFAULT_ADMIN: User = {
    id: 'admin-001',
    name: 'Admin ExpediCargo',
    phone: '0700000000',
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
  const [currentView, setCurrentView] = useState<'HOME' | 'PROFILE' | 'FAQ' | 'SUPPORT'>('HOME');

  const syncData = useCallback(async () => {
    setIsSyncing(true);
    try {
        const [dbPackages, dbUsers] = await Promise.all([
            DatabaseService.getPackages(),
            DatabaseService.getUsers()
        ]);
        
        setPackages(dbPackages);
        
        // S'assure que l'admin par défaut est toujours dans la liste si aucun autre admin n'existe
        const hasAdmin = dbUsers.some(u => u.role === UserRole.ADMIN || u.phone === DEFAULT_ADMIN.phone);
        const usersList = hasAdmin ? dbUsers : [DEFAULT_ADMIN, ...dbUsers];
        setAllUsers(usersList);

        if (currentUser) {
            const updatedMe = usersList.find(u => u.id === currentUser.id);
            if (updatedMe) setCurrentUser(updatedMe);
            const myNotifs = await DatabaseService.getNotifications(currentUser.id);
            setNotifications(myNotifs);
        }
    } catch (e) {
        console.error("Sync Error:", e);
    } finally {
        setTimeout(() => setIsSyncing(false), 500);
    }
  }, [currentUser]);

  useEffect(() => {
    const saved = localStorage.getItem('expedi_session') || sessionStorage.getItem('expedi_session');
    if (saved) {
        try {
            setCurrentUser(JSON.parse(saved));
        } catch(e) {
            localStorage.removeItem('expedi_session');
            sessionStorage.removeItem('expedi_session');
        }
    }
    syncData();
    DatabaseService.onMessage(() => syncData());
  }, []);

  const handleLogin = (user: User, remember: boolean) => {
    setCurrentUser(user);
    if (remember) {
        localStorage.setItem('expedi_session', JSON.stringify(user));
    } else {
        sessionStorage.setItem('expedi_session', JSON.stringify(user));
    }
    syncData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('HOME');
    localStorage.removeItem('expedi_session');
    sessionStorage.removeItem('expedi_session');
  };

  const handleRecharge = async (amount: number) => {
      if (!currentUser) return;
      const updatedUser = { 
          ...currentUser, 
          walletBalance: (currentUser.walletBalance || 0) + amount 
      };
      await DatabaseService.saveUser(updatedUser);
      setCurrentUser(updatedUser);
      syncData();
  };

  const renderView = () => {
    if (!currentUser) {
        return <AuthScreen onLogin={handleLogin} users={allUsers} packages={packages} />;
    }

    if (currentView === 'PROFILE') return <ProfileScreen user={currentUser} onLogout={handleLogout} onDelete={() => {}} onNavigate={setCurrentView} onUpdateUser={async (u) => { await DatabaseService.saveUser(u); setCurrentUser(u); }} />;
    if (currentView === 'FAQ') return <FAQScreen onBack={() => setCurrentView('PROFILE')} />;
    if (currentView === 'SUPPORT') return <SupportScreen onBack={() => setCurrentView('PROFILE')} />;

    switch(currentUser.role) {
        case UserRole.ADMIN: return <AdminDashboard user={currentUser} allUsers={allUsers} packages={packages} pricingConfig={pricingConfig} onUpdatePricing={setPricingConfig} onUpdateUser={DatabaseService.saveUser} onDeleteUser={() => {}} onLogout={handleLogout} />;
        case UserRole.SENDER: return <SenderDashboard user={currentUser} packages={packages} allUsers={allUsers} notifications={notifications} pricingConfig={pricingConfig} onMarkNotifAsRead={DatabaseService.markNotificationRead} onCreatePackage={async (p) => { await DatabaseService.savePackage(p); syncData(); }} />;
        case UserRole.COURIER: return <CourierDashboard user={currentUser} packages={packages} notifications={notifications} lastGain={null} lastSync={Date.now()} isSyncing={isSyncing} onAcceptPackage={async (id, cid) => { await DatabaseService.updatePackageStatus(id, PackageStatus.ACCEPTED, cid); syncData(); }} onUpdateStatus={async (id, s, n, sig) => { await DatabaseService.updatePackageStatus(id, s, currentUser.id, n, sig); syncData(); }} onMarkNotifAsRead={DatabaseService.markNotificationRead} onClearNotifications={() => {}} onRecharge={handleRecharge} onCloseGainModal={() => {}} />;
        default: return <div className="p-10 text-center">Rôle non reconnu</div>;
    }
  };

  return (
    <div className="min-h-screen bg-midnight font-sans text-white">
      {currentUser && (
          <header className="sticky top-0 z-50 bg-midnight/90 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
            <h1 className="font-bold text-lg">EXPEDI<span className="text-pureOrange">-CARGO</span></h1>
            <button onClick={() => syncData()} className={`p-2 rounded-lg bg-slate-800 transition-all ${isSyncing ? 'animate-spin text-pureOrange' : 'text-slate-400'}`}>
                <RefreshCw className="w-4 h-4" />
            </button>
          </header>
      )}

      <main>{renderView()}</main>

      {currentUser && (
        <nav className="fixed bottom-0 left-0 right-0 bg-midnight/95 backdrop-blur-lg border-t border-slate-800 p-3 px-8 flex justify-between items-center z-50">
            <div onClick={() => setCurrentView('HOME')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${currentView === 'HOME' ? 'text-pureOrange' : 'text-slate-500'}`}>
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-bold">Accueil</span>
            </div>
            <div onClick={() => setCurrentView('PROFILE')} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${['PROFILE', 'FAQ', 'SUPPORT'].includes(currentView) ? 'text-pureOrange' : 'text-slate-500'}`}>
                <UserIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">Profil</span>
            </div>
        </nav>
      )}
    </div>
  );
};

export default App;

function App() {
  return (
    <div className="min-h-screen bg-midnight text-white flex items-center justify-center">
      <h1 className="text-3xl font-bold">EXPEDI-CARGO</h1>
    </div>
  );
}

export default App;
