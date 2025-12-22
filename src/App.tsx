import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { SenderDashboard } from './components/SenderDashboard';
import { CourierDashboard } from './components/CourierDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { FAQScreen } from './components/FAQScreen';
import { SupportScreen } from './components/SupportScreen';
import { User, Package, UserRole, PackageStatus, AppNotification, PaymentMethod, PricingConfig } from './types';
import { Home, User as UserIcon } from 'lucide-react';

const INITIAL_PACKAGES: Package[] = [];

// Default Pricing Config
const DEFAULT_PRICING: PricingConfig = {
  basePriceIntra: 1500,
  basePriceInter: 3000,
  basePriceDoc: 2000,
  kmSurchargeInterval: 5,
  kmSurchargeAmount: 500,
  weightSurchargeMedium: 0.10, // 10%
  weightSurchargeHeavy: 0.30, // 30%
  commissionRate: 0.05 // 5%
};

// Default Admin
const DEFAULT_ADMIN: User = {
    id: 'admin-001',
    name: 'Super Admin',
    phone: 'admin', // Simple login for demo
    password: 'admin',
    role: UserRole.ADMIN,
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>(INITIAL_PACKAGES);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING);
  
  // State for showing Gain Modal to Courier
  const [lastGain, setLastGain] = useState<{amount: number, tracking: string} | null>(null);

  const [currentView, setCurrentView] = useState<'HOME' | 'PROFILE' | 'FAQ' | 'SUPPORT'>('HOME');

  // Load data
  useEffect(() => {
    const loadData = () => {
        const savedUser = sessionStorage.getItem('expedi_current_session');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        const savedAllUsers = localStorage.getItem('expedi_all_users');
        if (savedAllUsers) {
             let users = JSON.parse(savedAllUsers);
             // Ensure admin exists
             if (!users.find((u: User) => u.role === UserRole.ADMIN)) {
                 users.push(DEFAULT_ADMIN);
             }
             setAllUsers(users);
        } else {
             setAllUsers([DEFAULT_ADMIN]);
        }

        const savedNotifs = localStorage.getItem('expedi_notifications');
        if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
        
        const savedPackages = localStorage.getItem('expedi_packages');
        if (savedPackages) setPackages(JSON.parse(savedPackages));

        const savedPricing = localStorage.getItem('expedi_pricing');
        if (savedPricing) setPricingConfig(JSON.parse(savedPricing));
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'expedi_packages' && e.newValue) setPackages(JSON.parse(e.newValue));
        if (e.key === 'expedi_notifications' && e.newValue) setNotifications(JSON.parse(e.newValue));
        if (e.key === 'expedi_all_users' && e.newValue) setAllUsers(JSON.parse(e.newValue));
        if (e.key === 'expedi_pricing' && e.newValue) setPricingConfig(JSON.parse(e.newValue));
    };

    window.addEventListener('storage', handleStorageChange);

    const intervalId = setInterval(() => {
        const currentPkgStr = localStorage.getItem('expedi_packages');
        if (currentPkgStr) {
            const currentPkgs = JSON.parse(currentPkgStr);
            setPackages(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(currentPkgs)) return currentPkgs;
                return prev;
            });
        }
        
        const currentUsersStr = localStorage.getItem('expedi_all_users');
        if (currentUsersStr) {
             const currentUsers = JSON.parse(currentUsersStr);
             setAllUsers(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(currentUsers)) return currentUsers;
                return prev;
             });
             
             if (currentUser) {
                 const updatedMe = currentUsers.find((u: User) => u.id === currentUser.id);
                 if (updatedMe && JSON.stringify(updatedMe) !== JSON.stringify(currentUser)) {
                     setCurrentUser(updatedMe);
                     sessionStorage.setItem('expedi_current_session', JSON.stringify(updatedMe));
                 }
             }
        }
    }, 2000);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(intervalId);
    };
  }, [currentUser]);

  // Persist State Changes
  useEffect(() => {
    if (notifications.length > 0) localStorage.setItem('expedi_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
      if (packages.length > 0) localStorage.setItem('expedi_packages', JSON.stringify(packages));
  }, [packages]);

  useEffect(() => {
      if (allUsers.length > 0) localStorage.setItem('expedi_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
      localStorage.setItem('expedi_pricing', JSON.stringify(pricingConfig));
  }, [pricingConfig]);


  const handleLogin = (user: User) => {
    if (user.isBlocked) {
        alert("Ce compte a été bloqué par l'administrateur.");
        return;
    }

    const userWithWallet = { 
        ...user, 
        walletBalance: user.walletBalance || 0,
        earningsBalance: user.earningsBalance || 0 
    };
    setCurrentUser(userWithWallet);

    const existingUserIndex = allUsers.findIndex(u => u.id === user.id);
    let newAllUsers = [...allUsers];
    
    if (existingUserIndex === -1) {
        newAllUsers = [...allUsers, userWithWallet];
    } else {
        newAllUsers[existingUserIndex] = userWithWallet;
    }
    
    setAllUsers(newAllUsers);
    
    sessionStorage.setItem('expedi_current_session', JSON.stringify(userWithWallet));
    localStorage.setItem('expedi_all_users', JSON.stringify(newAllUsers));
  };

  const checkUserExists = (phone: string, email?: string): boolean => {
      return allUsers.some(u => 
          u.phone.trim() === phone.trim() || (email && u.email && u.email.trim() === email.trim() && email.trim() !== '')
      );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('HOME');
    sessionStorage.removeItem('expedi_current_session');
  };

  const handleDeleteAccount = () => {
      if (!currentUser) return;
      const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.");
      if (confirmDelete) {
          const updatedUsers = allUsers.filter(u => u.id !== currentUser.id);
          setAllUsers(updatedUsers);
          handleLogout();
          alert("Votre compte a été supprimé.");
      }
  };

  const handleUpdateUser = (updatedUser: User) => {
      // If we are updating ourselves
      if (currentUser && updatedUser.id === currentUser.id) {
          setCurrentUser(updatedUser);
          sessionStorage.setItem('expedi_current_session', JSON.stringify(updatedUser));
      }
      
      const updatedUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      setAllUsers(updatedUsers);
      localStorage.setItem('expedi_all_users', JSON.stringify(updatedUsers));
  };

  const handleDeleteUser = (userId: string) => {
      if (window.confirm("Supprimer cet utilisateur ?")) {
          const updatedUsers = allUsers.filter(u => u.id !== userId);
          setAllUsers(updatedUsers);
      }
  };

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
      const currentNotifs = JSON.parse(localStorage.getItem('expedi_notifications') || '[]');
      const updatedNotifs = [newNotif, ...currentNotifs];
      setNotifications(updatedNotifs);
      localStorage.setItem('expedi_notifications', JSON.stringify(updatedNotifs));
  };

  const handleCreatePackage = (pkg: Package) => {
    const newPackages = [pkg, ...packages];
    setPackages(newPackages);
    localStorage.setItem('expedi_packages', JSON.stringify(newPackages));

    const couriers = allUsers.filter(u => u.role === UserRole.COURIER && !u.isBlocked);
    couriers.forEach(courier => {
        addNotification(courier.id, 'Nouvelle Expédition !', `Course disponible (${pkg.originCity}): ${pkg.serviceLevel}`, pkg.id);
    });
  };

  const handleAcceptPackage = (pkgId: string, courierId: string) => {
    const updatedPackages = packages.map(p => 
      p.id === pkgId 
        ? { ...p, status: PackageStatus.ACCEPTED, courierId } 
        : p
    );
    setPackages(updatedPackages);
    localStorage.setItem('expedi_packages', JSON.stringify(updatedPackages));

    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
        addNotification(pkg.senderId, 'Colis Accepté', `Votre colis ${pkg.trackingNumber} a été accepté par un livreur.`, pkg.id);
    }
  };

  const handleUpdateStatus = (pkgId: string, status: PackageStatus) => {
    let updatedPackages = packages.map(p => {
        if (p.id === pkgId) {
            
            // --- GESTION FINANCIERE & GAINS ---
            if (status === PackageStatus.DELIVERED && p.status !== PackageStatus.DELIVERED) {
               
               const commissionAmount = Math.ceil(p.price * pricingConfig.commissionRate);
               const netEarnings = Math.floor(p.price - commissionAmount);
               
               updateCourierWallets(p.courierId, p.price, commissionAmount, p.paymentMethod);

               if(p.courierId) {
                  // Trigger explicit Gain Modal for Courier
                  if (currentUser?.id === p.courierId) {
                      setLastGain({ amount: netEarnings, tracking: p.trackingNumber });
                  }
                  addNotification(p.courierId, "Gain Reçu 💰", `Vous avez gagné ${netEarnings} F pour la course ${p.trackingNumber}.`, p.id);
               }
            }

            if (status === PackageStatus.IN_TRANSIT) {
                addNotification(p.senderId, 'En Transit', `Votre colis ${p.trackingNumber} est en route vers le destinataire.`, p.id);
            }
            if (status === PackageStatus.DELIVERED) {
                addNotification(p.senderId, 'Colis Livré', `Votre colis ${p.trackingNumber} a été livré avec succès !`, p.id);
            }
            if (status === PackageStatus.CANCELLED) {
                addNotification(p.senderId, 'Colis Annulé', `La course ${p.trackingNumber} a été annulée.`, p.id);
            }

            return { ...p, status };
        }
        return p;
    });
    setPackages(updatedPackages);
    localStorage.setItem('expedi_packages', JSON.stringify(updatedPackages));
  };

  const handleRechargeWallet = (amount: number) => {
      if (!currentUser) return;
      updateCourierWallets(currentUser.id, 0, -amount, PaymentMethod.CASH); 
  };

  const updateCourierWallets = (courierId: string | undefined, price: number, commission: number, method: PaymentMethod) => {
      if (!courierId) return;

      const updatedUsers = allUsers.map(u => {
          if (u.id === courierId) {
              let newCaution = (u.walletBalance || 0);
              let newEarnings = (u.earningsBalance || 0);

              if (price === 0 && commission < 0) {
                  newCaution += Math.abs(commission);
              } 
              else {
                  newCaution -= commission; 
                  if (method !== PaymentMethod.CASH) {
                      const netEarnings = Math.floor(price - commission); 
                      newEarnings += netEarnings; 
                  }
              }
              return { ...u, walletBalance: newCaution, earningsBalance: newEarnings };
          }
          return u;
      });

      setAllUsers([...updatedUsers]); 
      localStorage.setItem('expedi_all_users', JSON.stringify(updatedUsers));

      if (currentUser && currentUser.id === courierId) {
          const u = updatedUsers.find(user => user.id === courierId);
          if (u) {
            setCurrentUser(u);
            sessionStorage.setItem('expedi_current_session', JSON.stringify(u));
          }
      }
  };

  const handleMarkNotifAsRead = (notifId: string) => {
      const updatedNotifs = notifications.map(n => 
          n.id === notifId ? { ...n, isRead: true } : n
      );
      setNotifications(updatedNotifs);
      localStorage.setItem('expedi_notifications', JSON.stringify(updatedNotifs));
  };

  const handleClearAllNotifs = () => {
      if (currentUser) {
          const updatedNotifs = notifications.filter(n => n.userId !== currentUser.id);
          setNotifications(updatedNotifs);
          localStorage.setItem('expedi_notifications', JSON.stringify(updatedNotifs));
      }
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} checkUserExists={checkUserExists} users={allUsers} packages={packages} />;
  }

  // --- ADMIN VIEW ---
  if (currentUser.role === UserRole.ADMIN) {
      return (
          <AdminDashboard 
            user={currentUser}
            allUsers={allUsers}
            packages={packages}
            pricingConfig={pricingConfig}
            onUpdatePricing={setPricingConfig}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onLogout={handleLogout}
          />
      );
  }

  // --- STANDARD USER VIEWS ---
  const userNotifications = notifications.filter(n => n.userId === currentUser.id);

  const renderContent = () => {
    switch(currentView) {
      case 'PROFILE':
        return <ProfileScreen 
                  user={currentUser} 
                  onLogout={handleLogout} 
                  onDelete={handleDeleteAccount}
                  onNavigate={(view) => setCurrentView(view)} 
                  onUpdateUser={handleUpdateUser}
               />;
      case 'FAQ':
        return <FAQScreen onBack={() => setCurrentView('PROFILE')} />;
      case 'SUPPORT':
        return <SupportScreen onBack={() => setCurrentView('PROFILE')} />;
      case 'HOME':
      default:
        return currentUser.role === UserRole.SENDER ? (
          <SenderDashboard 
            user={currentUser} 
            packages={packages} 
            allUsers={allUsers}
            notifications={userNotifications} 
            pricingConfig={pricingConfig}
            onMarkNotifAsRead={handleMarkNotifAsRead}
            onCreatePackage={handleCreatePackage} 
          />
        ) : (
          <CourierDashboard 
            user={currentUser} 
            packages={packages} 
            notifications={userNotifications}
            lastGain={lastGain}
            onAcceptPackage={handleAcceptPackage}
            onUpdateStatus={handleUpdateStatus}
            onMarkNotifAsRead={handleMarkNotifAsRead}
            onClearNotifications={handleClearAllNotifs}
            onRecharge={handleRechargeWallet}
            onCloseGainModal={() => setLastGain(null)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-midnight font-sans text-white pb-20">
      <header className="sticky top-0 z-50 bg-midnight/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
        <h1 className="font-bold text-lg tracking-wide">
          EXPEDI<span className="text-pureOrange">-CARGO</span>
        </h1>
        {currentView !== 'HOME' ? (
           <h2 className="text-sm font-bold text-slate-300">
             {currentView === 'PROFILE' ? 'Mon Profil' : currentView === 'FAQ' ? 'Aide' : 'Support'}
           </h2>
        ) : (
            <div className="w-5"></div>
        )}
      </header>

      <main>
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-midnight border-t border-slate-800 p-3 px-6 flex justify-between items-center z-50">
        <div 
          onClick={() => setCurrentView('HOME')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${currentView === 'HOME' ? 'text-pureOrange' : 'text-slate-500'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold">Accueil</span>
        </div>
        
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-pureOrange p-4 rounded-full shadow-lg shadow-pureOrange/30 border-4 border-midnight cursor-pointer hover:scale-105 transition-transform" onClick={() => setCurrentView('HOME')}>
          {currentUser.role === UserRole.SENDER ? (
             <span className="text-white font-bold text-xl leading-none">+</span>
          ) : (
             <span className="text-white font-bold text-lg leading-none">GO</span>
          )}
        </div>
        
        <div 
           onClick={() => setCurrentView('PROFILE')}
           className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${['PROFILE', 'FAQ', 'SUPPORT'].includes(currentView) ? 'text-pureOrange' : 'text-slate-500'}`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profil</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
