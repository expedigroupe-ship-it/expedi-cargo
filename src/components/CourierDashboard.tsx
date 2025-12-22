
import React, { useState, useEffect } from 'react';
import { User, Package, PackageStatus, CITIES, AppNotification, PAYMENT_METHODS, PaymentMethod } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { MapPin, Package as PackageIcon, CheckCircle2, Truck, XCircle, Box, Bell, Trash2, Wallet, PlusCircle, Coins, Navigation, X, ScanBarcode, QrCode, Search, Radar } from 'lucide-react';

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
       {showPaymentGateway && (
           <PaymentModal amount={parseInt(rechargeAmount)} phone={user.phone} onSuccess={onRechargeSuccess} onCancel={() => setShowPaymentGateway(false)} />
       )}

       {showRecharge && (
           <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-midnightLight w-full max-w-sm rounded-2xl border border-slate-700 p-6 animate-fade-in-up">
                   <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Wallet className="text-pureOrange" /> Recharger ma Caution</h3>
                   <form onSubmit={handleInitiateRecharge} className="space-y-4">
                       <Input label="Montant (FCFA)" type="number" min="5000" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} required />
                       <div className="flex gap-2 pt-2">
                           <Button type="button" variant="secondary" fullWidth onClick={() => setShowRecharge(false)}>Annuler</Button>
                           <Button type="submit" fullWidth>Payer maintenant</Button>
                       </div>
                   </form>
               </div>
           </div>
       )}

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
        <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Livreur Connecté</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-center shadow-inner">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Caution</p>
                <p className="text-sm font-bold text-pureOrange">{(user.walletBalance || 0).toLocaleString()} F</p>
            </div>
            <button onClick={() => setShowRecharge(true)} className="p-2 bg-pureOrange text-white rounded-xl shadow-lg hover:scale-105 transition-transform"><PlusCircle className="w-6 h-6"/></button>
        </div>
      </div>

      <div className="flex p-1 bg-midnightLight rounded-xl mb-6 border border-slate-800 shadow-lg">
          <button onClick={() => setActiveTab('MARKET')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'MARKET' ? 'bg-pureOrange text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Marché</button>
          <button onClick={() => setActiveTab('MY_JOBS')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'MY_JOBS' ? 'bg-pureOrange text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Mes Courses</button>
      </div>

      <div className="space-y-4">
          {(activeTab === 'MARKET' ? availablePackages : myJobs).length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-midnightLight/30 rounded-3xl border border-dashed border-slate-800 animate-fade-in">
                  <div className="relative inline-block">
                    <Radar className="w-16 h-16 text-slate-700 mx-auto animate-spin-slow" />
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-pureOrange" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Recherche de colis en cours...</h3>
                    <p className="text-xs text-slate-500 mt-1">Le système vérifie les nouvelles courses toutes les 3s.</p>
                  </div>
                  {activeTab === 'MARKET' && (
                      <div className="px-8">
                          <p className="text-[10px] text-slate-600 italic bg-slate-900/50 py-2 rounded-lg">Conseil : Restez sur cet écran pour recevoir les notifications en temps réel.</p>
                      </div>
                  )}
              </div>
          ) : (
            (activeTab === 'MARKET' ? availablePackages : myJobs).map(pkg => (
                <div key={pkg.id} className="bg-midnightLight p-5 rounded-2xl border border-slate-700 shadow-xl animate-fade-in-up group hover:border-pureOrange/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="font-bold text-white text-base block">{pkg.description}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Ref: {pkg.trackingNumber}</span>
                        </div>
                        <span className="text-pureOrange font-black text-xl">{pkg.price.toLocaleString()} F</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-5 bg-midnight/50 p-3 rounded-xl">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <div className="w-px h-3 bg-slate-700"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-pureOrange"></div>
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="truncate"><span className="text-slate-600">De:</span> {pkg.originAddress}</p>
                            <p className="truncate"><span className="text-slate-600">À:</span> {pkg.destinationAddress}</p>
                        </div>
                    </div>
                    
                    {activeTab === 'MARKET' ? (
                        <Button fullWidth onClick={() => onAcceptPackage(pkg.id, user.id)} className="shadow-lg shadow-pureOrange/20">Accepter cette course</Button>
                    ) : (
                        <div className="flex gap-2">
                            {pkg.status === PackageStatus.ACCEPTED && <Button className="flex-1" onClick={() => onUpdateStatus(pkg.id, PackageStatus.IN_TRANSIT)}>Récupérer le colis</Button>}
                            {pkg.status === PackageStatus.IN_TRANSIT && <Button className="flex-1" variant="outline" onClick={() => onUpdateStatus(pkg.id, PackageStatus.DELIVERED)}>Confirmer la Livraison</Button>}
                            {pkg.status === PackageStatus.DELIVERED && (
                                <div className="w-full py-2 bg-green-500/10 text-green-500 text-center rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Course Terminée
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))
          )}
      </div>

      {/* HISTORIQUE NOTIFICATIONS RAPIDE */}
      <div className="mt-8 border-t border-slate-800 pt-6">
          <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Bell className="w-3 h-3" /> Notifications Récentes
              </h4>
              {notifications.length > 0 && <span className="text-[10px] text-pureOrange font-bold">{unreadCount} non lues</span>}
          </div>
          <div className="space-y-2">
              {notifications.slice(0, 3).map(n => (
                  <div key={n.id} onClick={() => onMarkNotifAsRead(n.id)} className={`p-3 rounded-xl border transition-all ${!n.isRead ? 'bg-pureOrange/5 border-pureOrange/20' : 'bg-midnight/30 border-slate-800 opacity-60'}`}>
                      <p className="text-xs font-bold text-white mb-1">{n.title}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{n.message}</p>
                  </div>
              ))}
              {notifications.length === 0 && <p className="text-[10px] text-slate-600 text-center">Aucune notification.</p>}
          </div>
      </div>
    </div>
  );
};
