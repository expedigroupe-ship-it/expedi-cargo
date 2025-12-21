
import React, { useState, useEffect } from 'react';
import { User, Package, PackageStatus, CITIES, AppNotification, PAYMENT_METHODS, PaymentMethod } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { MapPin, Package as PackageIcon, CheckCircle2, Truck, XCircle, Box, Bell, Trash2, Wallet, PlusCircle, Coins, Navigation, X, ScanBarcode, QrCode } from 'lucide-react';

interface CourierDashboardProps {
  user: User;
  packages: Package[];
  notifications: AppNotification[];
  lastGain: { amount: number, tracking: string } | null;
  onAcceptPackage: (packageId: string, courierId: string) => void;
  onUpdateStatus: (packageId: string, status: PackageStatus) => void;
  onMarkNotifAsRead: (notifId: string) => void;
  onClearNotifications: () => void;
  onRecharge: (amount: number) => void;
  onCloseGainModal: () => void;
}

export const CourierDashboard: React.FC<CourierDashboardProps> = ({ 
  user, packages, notifications, lastGain, onAcceptPackage, onUpdateStatus, onMarkNotifAsRead, onClearNotifications, onRecharge, onCloseGainModal
}) => {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'MY_JOBS'>('MARKET');
  const [filterCity, setFilterCity] = useState<string>(user.courierDetails?.operatingCity || 'Abidjan');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<string>('5000');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  const availablePackages = packages.filter(p => p.status === PackageStatus.PENDING && p.originCity === filterCity);
  const myJobs = packages.filter(p => p.courierId === user.id);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleInitiateRecharge = (e: React.FormEvent) => {
      e.preventDefault();
      if (parseInt(rechargeAmount) < 5000) return alert("Minimum 5000 FCFA.");
      setShowRecharge(false);
      setShowPaymentGateway(true);
  };

  const onRechargeSuccess = (data: any) => {
      onRecharge(parseInt(rechargeAmount));
      setShowPaymentGateway(false);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 relative">
       {/* PAYMENT GATEWAY FOR RECHARGE */}
       {showPaymentGateway && (
           <PaymentModal 
             amount={parseInt(rechargeAmount)} 
             phone={user.phone} 
             onSuccess={onRechargeSuccess} 
             onCancel={() => setShowPaymentGateway(false)} 
           />
       )}

       {/* RECHARGE MODAL */}
       {showRecharge && (
           <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-midnightLight w-full max-w-sm rounded-2xl border border-slate-700 p-6 animate-fade-in-up">
                   <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Wallet className="text-pureOrange" /> Recharger ma Caution</h3>
                   <form onSubmit={handleInitiateRecharge} className="space-y-4">
                       <Input label="Montant (FCFA)" type="number" min="5000" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} required />
                       <div className="flex gap-2 pt-2">
                           <Button type="button" variant="secondary" fullWidth onClick={() => setShowRecharge(false)}>Annuler</Button>
                           <Button type="submit" fullWidth>Payer via Mobile Money</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}

       {/* GAIN MODAL */}
       {lastGain && (
           <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-slate-900 w-full max-w-sm rounded-3xl border-2 border-green-500 p-8 text-center shadow-lg animate-bounce-in">
                   <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><Coins className="w-10 h-10 text-white" /></div>
                   <h2 className="text-2xl font-bold text-white mb-1">Gain Encaissé !</h2>
                   <p className="text-green-400 text-4xl font-black my-4">{lastGain.amount.toLocaleString()} F</p>
                   <Button fullWidth onClick={onCloseGainModal}>Fermer</Button>
               </div>
           </div>
       )}

      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-xl font-bold text-white">Livreur {user.name}</h2></div>
        <div className="flex items-center gap-2">
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Caution</p>
                <p className="text-sm font-bold text-pureOrange">{(user.walletBalance || 0).toLocaleString()} F</p>
            </div>
            <button onClick={() => setShowRecharge(true)} className="p-2 bg-pureOrange text-white rounded-xl shadow-lg"><PlusCircle className="w-6 h-6"/></button>
        </div>
      </div>

      <div className="flex p-1 bg-midnightLight rounded-xl mb-6">
          <button onClick={() => setActiveTab('MARKET')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${activeTab === 'MARKET' ? 'bg-pureOrange text-white' : 'text-slate-400'}`}>Marché</button>
          <button onClick={() => setActiveTab('MY_JOBS')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${activeTab === 'MY_JOBS' ? 'bg-pureOrange text-white' : 'text-slate-400'}`}>Mes Courses</button>
      </div>

      <div className="space-y-4">
          {(activeTab === 'MARKET' ? availablePackages : myJobs).map(pkg => (
              <div key={pkg.id} className="bg-midnightLight p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-white text-sm">{pkg.description}</span>
                      <span className="text-pureOrange font-bold">{pkg.price} F</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-3">{pkg.originAddress} → {pkg.destinationAddress}</div>
                  
                  {activeTab === 'MARKET' ? (
                      <Button fullWidth onClick={() => onAcceptPackage(pkg.id, user.id)}>Accepter Course</Button>
                  ) : (
                      <div className="flex gap-2">
                          {pkg.status === PackageStatus.ACCEPTED && <Button className="flex-1" onClick={() => onUpdateStatus(pkg.id, PackageStatus.IN_TRANSIT)}>Récupérer</Button>}
                          {pkg.status === PackageStatus.IN_TRANSIT && <Button className="flex-1" onClick={() => onUpdateStatus(pkg.id, PackageStatus.DELIVERED)}>Livrer</Button>}
                      </div>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
};
