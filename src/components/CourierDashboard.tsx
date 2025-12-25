
import React, { useState } from 'react';
import { User, Package, PackageStatus, AppNotification, PaymentMethod } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { MapPin, CheckCircle2, Truck, Box, Bell, Wallet, PlusCircle, Coins, Radar, Search, RefreshCw, Clock, UserCheck, ShieldCheck } from 'lucide-react';

interface CourierDashboardProps {
  user: User;
  packages: Package[];
  notifications: AppNotification[];
  lastGain: { amount: number, tracking: string } | null;
  lastSync: number;
  isSyncing: boolean;
  onAcceptPackage: (packageId: string, courierId: string) => void;
  onUpdateStatus: (packageId: string, status: PackageStatus, notes?: string, signature?: any) => void;
  onMarkNotifAsRead: (notifId: string) => void;
  onClearNotifications: () => void;
  onRecharge: (amount: number) => void;
  onCloseGainModal: () => void;
}

export const CourierDashboard: React.FC<CourierDashboardProps> = ({ 
  user, packages, notifications, lastGain, lastSync, isSyncing, onAcceptPackage, onUpdateStatus, onMarkNotifAsRead, onClearNotifications, onRecharge, onCloseGainModal
}) => {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'MY_JOBS'>('MARKET');
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<string>('5000');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  
  const [signingPackage, setSigningPackage] = useState<Package | null>(null);
  const [signerName, setSignerName] = useState('');

  const availablePackages = packages.filter(p => p.status === PackageStatus.PENDING);
  const myJobs = packages.filter(p => p.courierId === user.id);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleDeliverConfirm = () => {
    if (!signerName.trim()) return alert("Nom du réceptionnaire requis.");
    if (signingPackage) {
        onUpdateStatus(
            signingPackage.id, 
            PackageStatus.DELIVERED, 
            `Colis livré à ${signerName}`,
            { signerName, signedAt: Date.now() }
        );
        setSigningPackage(null);
        setSignerName('');
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 relative">
       {/* Modal de Signature / Preuve */}
       {signingPackage && (
           <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
               <div className="bg-midnightLight w-full max-w-sm rounded-3xl border border-slate-700 p-8 animate-bounce-in text-center">
                   <div className="w-16 h-16 bg-pureOrange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                       <UserCheck className="text-pureOrange w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">Preuve de Livraison</h3>
                   <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-bold">Colis: {signingPackage.trackingNumber}</p>
                   
                   <div className="space-y-4">
                       <Input 
                        label="Nom de celui qui reçoit" 
                        placeholder="Ex: Mme Koné" 
                        value={signerName} 
                        onChange={(e) => setSignerName(e.target.value)} 
                       />
                       
                       <div className="bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-2xl">
                           <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                           <p className="text-[10px] text-slate-500 uppercase font-black">Signature numérique activée</p>
                       </div>

                       <div className="flex gap-2 pt-4">
                           <Button variant="secondary" fullWidth onClick={() => setSigningPackage(null)}>Annuler</Button>
                           <Button fullWidth onClick={handleDeliverConfirm}>Confirmer</Button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {showPaymentGateway && (
           <PaymentModal amount={parseInt(rechargeAmount)} phone={user.phone} onSuccess={() => { onRecharge(parseInt(rechargeAmount)); setShowPaymentGateway(false); }} onCancel={() => setShowPaymentGateway(false)} />
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
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-pureOrange animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Livreur Connecté</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-center shadow-inner">
                <p className="text-[8px] text-slate-500 uppercase font-bold">Caution</p>
                <p className="text-sm font-bold text-pureOrange">{(user.walletBalance || 0).toLocaleString()} F</p>
            </div>
            <button onClick={() => setShowRecharge(true)} className="p-2 bg-pureOrange text-white rounded-xl shadow-lg"><PlusCircle className="w-6 h-6"/></button>
        </div>
      </div>

      <div className="flex p-1 bg-midnightLight rounded-xl mb-6 border border-slate-800 shadow-lg">
          <button onClick={() => setActiveTab('MARKET')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'MARKET' ? 'bg-pureOrange text-white shadow-md' : 'text-slate-500'}`}>Marché</button>
          <button onClick={() => setActiveTab('MY_JOBS')} className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'MY_JOBS' ? 'bg-pureOrange text-white shadow-md' : 'text-slate-500'}`}>Mes Courses</button>
      </div>

      <div className="space-y-4">
          {(activeTab === 'MARKET' ? availablePackages : myJobs).length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-midnightLight/30 rounded-3xl border border-dashed border-slate-800 animate-fade-in">
                  <Radar className={`w-16 h-16 text-slate-700 mx-auto ${isSyncing ? 'animate-spin-slow' : ''}`} />
                  <div>
                    <h3 className="text-white font-bold">{isSyncing ? 'Synchronisation...' : 'Aucune course'}</h3>
                    <p className="text-xs text-slate-500 mt-1">Nouveaux colis disponibles en temps réel.</p>
                  </div>
              </div>
          ) : (
            (activeTab === 'MARKET' ? availablePackages : myJobs).map(pkg => (
                <div key={pkg.id} className="bg-midnightLight p-5 rounded-2xl border border-slate-700 shadow-xl group hover:border-pureOrange/50 transition-all">
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
                        <Button fullWidth isLoading={isSyncing} onClick={() => onAcceptPackage(pkg.id, user.id)}>Accepter la course</Button>
                    ) : (
                        <div className="flex gap-2">
                            {pkg.status === PackageStatus.ACCEPTED && <Button className="flex-1" onClick={() => onUpdateStatus(pkg.id, PackageStatus.PICKED_UP, "Colis récupéré au point de départ")}>Récupérer le colis</Button>}
                            {pkg.status === PackageStatus.PICKED_UP && <Button className="flex-1" onClick={() => onUpdateStatus(pkg.id, PackageStatus.IN_TRANSIT, "Colis en route vers la destination")}>Démarrer le trajet</Button>}
                            {pkg.status === PackageStatus.IN_TRANSIT && <Button className="flex-1" variant="outline" onClick={() => setSigningPackage(pkg)}>Livrer le colis</Button>}
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
    </div>
  );
};
