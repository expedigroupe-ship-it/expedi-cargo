
import React, { useState, useEffect, useRef } from 'react';
import { User, Package, PackageStatus, AppNotification } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { 
  CheckCircle2, Box, Bell, 
  PlusCircle, Radar, 
  Clock, UserCheck, ShieldCheck, AlertTriangle,
  Award, TrendingUp, Map as MapIcon, Navigation, X, MapPin
} from 'lucide-react';

declare const L: any;

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

const ABIDJAN_COMMUNES_COORDS: Record<string, {lat: number, lng: number}> = {
  'Abobo': { lat: 5.415, lng: -4.020 }, 'Adjamé': { lat: 5.355, lng: -4.030 },
  'Anyama': { lat: 5.495, lng: -4.055 }, 'Attécoubé': { lat: 5.330, lng: -4.040 },
  'Bingerville': { lat: 5.355, lng: -3.895 }, 'Cocody': { lat: 5.354, lng: -3.975 },
  'Koumassi': { lat: 5.300, lng: -3.950 }, 'Marcory': { lat: 5.305, lng: -3.980 },
  'Plateau': { lat: 5.325, lng: -4.020 }, 'Port-Bouët': { lat: 5.255, lng: -3.960 },
  'Yopougon': { lat: 5.340, lng: -4.080 }
};

export const CourierDashboard: React.FC<CourierDashboardProps> = ({ 
  user, packages, notifications, isSyncing, onAcceptPackage, onUpdateStatus, onRecharge
}) => {
  const [activeTab, setActiveTab] = useState<'MARKET' | 'MY_JOBS'>('MARKET');
  const [rechargeAmount] = useState<string>('5000');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  
  const [signingPackage, setSigningPackage] = useState<Package | null>(null);
  const [signerName, setSignerName] = useState('');
  
  const [mapPackageId, setMapPackageId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const availablePackages = packages.filter(p => p.status === PackageStatus.PENDING);
  const myJobs = packages.filter(p => p.courierId === user.id);

  // Helper pour extraire la commune de l'adresse
  const getCoordsFromAddress = (address: string) => {
    const commune = Object.keys(ABIDJAN_COMMUNES_COORDS).find(c => address.includes(c));
    return commune ? ABIDJAN_COMMUNES_COORDS[commune] : { lat: 5.34, lng: -4.02 };
  };

  useEffect(() => {
    if (mapPackageId && mapContainerRef.current && typeof L !== 'undefined') {
        const pkg = packages.find(p => p.id === mapPackageId);
        if (!pkg) return;

        const origin = getCoordsFromAddress(pkg.originAddress);
        const dest = getCoordsFromAddress(pkg.destinationAddress);

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
        }

        mapInstanceRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView([origin.lat, origin.lng], 12);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
            attribution: '&copy; Leaflet | &copy; CARTO' 
        }).addTo(mapInstanceRef.current);

        const originIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #3b82f6"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7]
        });

        const destIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #ff6b00; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #ff6b00"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7]
        });

        L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(mapInstanceRef.current);
        L.marker([dest.lat, dest.lng], { icon: destIcon }).addTo(mapInstanceRef.current);
        
        L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], { 
            color: '#ff6b00', weight: 2, dashArray: '5, 8', opacity: 0.6 
        }).addTo(mapInstanceRef.current);

        const bounds = L.latLngBounds([[origin.lat, origin.lng], [dest.lat, dest.lng]]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
    return () => {
        if (!mapPackageId && mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, [mapPackageId, packages]);

  const handleAcceptCourse = (pkgId: string) => {
    if ((user.walletBalance || 0) < 5000) {
        alert("Action refusée : Vous devez avoir une caution minimale de 5000 FCFA pour bénéficier d'une course.");
        return;
    }
    onAcceptPackage(pkgId, user.id);
  };

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
    <div className="p-4 max-w-3xl mx-auto pb-24 relative text-white">
       {signingPackage && (
           <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
               <div className="bg-midnightLight w-full max-w-sm rounded-3xl border border-slate-700 p-8 animate-bounce-in text-center">
                   <div className="w-16 h-16 bg-pureOrange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                       <UserCheck className="text-pureOrange w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">Preuve de Livraison</h3>
                   <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-bold">Colis: {signingPackage.trackingNumber}</p>
                   
                   <div className="space-y-4">
                       <Input label="Réceptionné par :" placeholder="Entrez le nom complet..." value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                       <div className="bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-2xl">
                           <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                           <p className="text-[10px] text-slate-500 uppercase font-black">Signature sécurisée requise</p>
                       </div>
                       <div className="flex gap-2 pt-4">
                           <Button variant="secondary" fullWidth onClick={() => setSigningPackage(null)}>Annuler</Button>
                           <Button fullWidth onClick={handleDeliverConfirm}>Confirmer Livraison</Button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {showPaymentGateway && (
           <PaymentModal amount={parseInt(rechargeAmount)} phone={user.phone} onSuccess={(data) => { onRecharge(parseInt(rechargeAmount)); setShowPaymentGateway(false); }} onCancel={() => setShowPaymentGateway(false)} />
       )}

       <div className="mb-8 animate-fade-in">
            <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl mb-6 inline-block">
                <p className="text-blue-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Award className="w-3 h-3"/> Session Livreur : {user.name} 🛵
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-midnightLight p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-pureOrange/5 rounded-bl-full pointer-events-none"></div>
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Ma Caution</p>
                    <p className={`text-2xl font-black ${(user.walletBalance || 0) < 5000 ? 'text-red-500' : 'text-pureOrange'}`}>
                        {(user.walletBalance || 0).toLocaleString()} F
                    </p>
                    {(user.walletBalance || 0) < 5000 && (
                        <div className="flex items-center gap-1 mt-1 text-red-500 text-[8px] font-bold uppercase animate-pulse">
                            <AlertTriangle className="w-3 h-3"/> {"Recharge requise (< 5000)"}
                        </div>
                    )}
                    <button onClick={() => setShowPaymentGateway(true)} className="mt-4 flex items-center gap-2 text-[10px] text-white font-black uppercase tracking-widest bg-pureOrange px-4 py-2 rounded-xl shadow-lg shadow-pureOrange/20 hover:scale-105 transition-transform">
                        <PlusCircle className="w-4 h-4"/> Recharger
                    </button>
                </div>
                <div className="bg-midnightLight p-5 rounded-2xl border border-slate-800 shadow-xl border-l-4 border-l-green-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Mes Gains</p>
                    <p className="text-2xl font-black text-green-500">{(user.earningsBalance || 0).toLocaleString()} F</p>
                    <div className="flex items-center gap-1 mt-2 text-[9px] text-slate-500 font-bold uppercase">
                        <TrendingUp className="w-3 h-3 text-green-500"/> Gain: 95% par course
                    </div>
                </div>
            </div>
       </div>

      <div className="flex p-1 bg-midnightLight rounded-2xl mb-8 border border-slate-800 shadow-lg">
          <button onClick={() => setActiveTab('MARKET')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MARKET' ? 'bg-pureOrange text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Marché Live</button>
          <button onClick={() => setActiveTab('MY_JOBS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'MY_JOBS' ? 'bg-pureOrange text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Mes Courses</button>
      </div>

      <div className="space-y-4">
          {(activeTab === 'MARKET' ? availablePackages : myJobs).length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-midnightLight/30 rounded-3xl border border-dashed border-slate-800 animate-fade-in">
                  <Radar className={`w-16 h-16 text-slate-700 mx-auto ${isSyncing ? 'animate-spin-slow' : 'opacity-20'}`} />
                  <div>
                    <h3 className="text-white font-bold">{isSyncing ? 'Recherche de colis...' : 'Aucun colis disponible'}</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Zone : Côte d'Ivoire</p>
                  </div>
              </div>
          ) : (
            (activeTab === 'MARKET' ? availablePackages : myJobs).map(pkg => (
                <div key={pkg.id} className="bg-midnightLight p-5 rounded-3xl border border-slate-800 shadow-xl group hover:border-pureOrange/50 transition-all animate-fade-in-up">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="font-black text-white text-lg block tracking-tight">{pkg.description}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest mt-1">Ref: {pkg.trackingNumber}</span>
                        </div>
                        <div className="text-right">
                             <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Votre Gain (95%)</p>
                             <span className="text-green-500 font-black text-2xl">{(pkg.price * 0.95).toLocaleString()} F</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 bg-midnight/30 p-4 rounded-2xl border border-slate-800/50">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                            <div className="w-px h-6 bg-slate-700"></div>
                            <div className="w-2 h-2 rounded-full bg-pureOrange shadow-[0_0_8px_#ff6b00]"></div>
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="truncate">
                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Départ</p>
                                <p className="text-xs text-white font-bold truncate">{pkg.originAddress}</p>
                            </div>
                            <div className="truncate">
                                <p className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Arrivée</p>
                                <p className="text-xs text-white font-bold truncate">{pkg.destinationAddress}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setMapPackageId(mapPackageId === pkg.id ? null : pkg.id)}
                            className={`p-3 rounded-xl transition-all ${mapPackageId === pkg.id ? 'bg-pureOrange text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <MapIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {mapPackageId === pkg.id && (
                        <div className="mb-4 animate-fade-in">
                            <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
                                <div ref={mapContainerRef} className="h-full w-full z-0"></div>
                                <div className="absolute top-2 right-2 z-10">
                                    <button onClick={() => setMapPackageId(null)} className="p-1 bg-midnight/80 rounded-full text-white backdrop-blur-md">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-2 left-2 z-10 bg-midnight/80 px-2 py-1 rounded-lg text-[8px] font-black uppercase text-slate-400 border border-slate-800 backdrop-blur-md">
                                    Aperçu trajet
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'MARKET' ? (
                        <Button fullWidth onClick={() => handleAcceptCourse(pkg.id)} className="shadow-lg shadow-pureOrange/10">Accepter la course</Button>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {pkg.status === PackageStatus.ACCEPTED && <Button fullWidth onClick={() => onUpdateStatus(pkg.id, PackageStatus.PICKED_UP, "Colis récupéré")}>Confirmer Récupération</Button>}
                            {pkg.status === PackageStatus.PICKED_UP && <Button fullWidth onClick={() => onUpdateStatus(pkg.id, PackageStatus.IN_TRANSIT, "En chemin")}>Démarrer Trajet</Button>}
                            {pkg.status === PackageStatus.IN_TRANSIT && <Button fullWidth variant="outline" onClick={() => setSigningPackage(pkg)}>Finaliser Livraison</Button>}
                            {pkg.status === PackageStatus.DELIVERED && (
                                <div className="w-full py-4 bg-green-500/10 text-green-500 text-center rounded-2xl font-black text-xs flex items-center justify-center gap-3 border border-green-500/20 uppercase tracking-widest">
                                    <CheckCircle2 className="w-5 h-5" /> Course Terminée
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
