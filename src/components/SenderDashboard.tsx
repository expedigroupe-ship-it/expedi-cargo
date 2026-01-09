
import React, { useState, useEffect, useRef } from 'react';
import { User, Package, PackageStatus, ServiceLevel, PaymentMethod, AppNotification, PricingConfig } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { sendTrackingSMS } from '../services/smsService';
import { 
  Plus, Box, MapPin, Clock, Zap, 
  Navigation, Search, QrCode, X, 
  Smartphone, UserCircle2, Info,
  Bell, User as UserIcon,
  PackageCheck, Truck, ShieldCheck,
  Coins
} from 'lucide-react';

declare const L: any;

interface SenderDashboardProps {
  user: User;
  packages: Package[];
  allUsers: User[]; 
  notifications: AppNotification[]; 
  pricingConfig: PricingConfig;
  onMarkNotifAsRead: (id: string) => void; 
  onCreatePackage: (pkg: Package) => void;
}

const ABIDJAN_COMMUNES_COORDS: Record<string, {lat: number, lng: number}> = {
  'Abobo': { lat: 5.415, lng: -4.020 }, 'Adjamé': { lat: 5.355, lng: -4.030 },
  'Anyama': { lat: 5.495, lng: -4.055 }, 'Attécoubé': { lat: 5.330, lng: -4.040 },
  'Bingerville': { lat: 5.355, lng: -3.895 }, 'Cocody': { lat: 5.354, lng: -3.975 },
  'Koumassi': { lat: 5.300, lng: -3.950 }, 'Marcory': { lat: 5.305, lng: -3.980 },
  'Plateau': { lat: 5.325, lng: -4.020 }, 'Port-Bouët': { lat: 5.255, lng: -3.960 },
  'Yopougon': { lat: 5.340, lng: -4.080 }
};

const COMMUNES_LIST = Object.keys(ABIDJAN_COMMUNES_COORDS).sort();

export const SenderDashboard: React.FC<SenderDashboardProps> = ({ 
    user, packages, allUsers, notifications, pricingConfig, onMarkNotifAsRead, onCreatePackage 
}) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'TRACK' | 'NOTIFS'>('LIST'); 
  const [qrPackage, setQrPackage] = useState<Package | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<Package | null>(null);

  const [searchTrackingId, setSearchTrackingId] = useState('');
  const [foundPackage, setFoundPackage] = useState<Package | null>(null);
  const [foundCourier, setFoundCourier] = useState<User | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any>({});
  
  const [newPkg, setNewPkg] = useState({
    description: 'Documents', 
    packageDetails: '',
    packageCount: 1, 
    weightKg: 1, 
    dimL: '', dimW: '', dimH: '',
    serviceLevel: ServiceLevel.STANDARD, 
    
    senderFullName: user.name, senderPhone: user.phone,
    originCity: 'Abidjan', originCommune: 'Cocody',
    originQuartier: '', originRue: '', originPorte: '',
    
    recipientFullName: '', recipientPhone: '',
    destinationCity: 'Abidjan', destinationCommune: 'Plateau',
    destQuartier: '', destRue: '', destPorte: '',
    
    paymentMethod: PaymentMethod.CASH
  });
  
  const [coords, setCoords] = useState<{ origin: any, dest: any }>({ origin: ABIDJAN_COMMUNES_COORDS['Cocody'], dest: ABIDJAN_COMMUNES_COORDS['Plateau'] });
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (view === 'CREATE' && mapContainerRef.current && !mapInstanceRef.current && typeof L !== 'undefined') {
        mapInstanceRef.current = L.map(mapContainerRef.current, { zoomControl: false }).setView([5.34, -4.02], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
            attribution: '&copy; Leaflet | &copy; CARTO' 
        }).addTo(mapInstanceRef.current);
        
        const createIcon = (color: string) => L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7]
        });
        markersRef.current.originIcon = createIcon('#3b82f6'); 
        markersRef.current.destIcon = createIcon('#ff6b00');
    }
    return () => { if (view !== 'CREATE' && mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [view]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const { origin, dest } = coords;
    if (markersRef.current.originMarker) map.removeLayer(markersRef.current.originMarker);
    if (markersRef.current.destMarker) map.removeLayer(markersRef.current.destMarker);
    if (markersRef.current.line) map.removeLayer(markersRef.current.line);
    const bounds = [];
    if (origin) {
        markersRef.current.originMarker = L.marker([origin.lat, origin.lng], { icon: markersRef.current.originIcon }).addTo(map);
        bounds.push([origin.lat, origin.lng]);
    }
    if (dest) {
        markersRef.current.destMarker = L.marker([dest.lat, dest.lng], { icon: markersRef.current.destIcon }).addTo(map);
        bounds.push([dest.lat, dest.lng]);
    }
    if (origin && dest) {
        markersRef.current.line = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], { color: '#ff6b00', weight: 3, dashArray: '5, 8' }).addTo(map);
        map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [coords, view]);

  useEffect(() => {
    let base = newPkg.originCity === newPkg.destinationCity ? pricingConfig.basePriceIntra : pricingConfig.basePriceInter;
    if (newPkg.serviceLevel === ServiceLevel.EXPRESS) base += 1500;
    if (newPkg.serviceLevel === ServiceLevel.ECO) base -= 500;
    const weightFee = newPkg.weightKg > 5 ? (newPkg.weightKg - 5) * 200 : 0;
    setCalculatedPrice(base + weightFee);
  }, [newPkg, pricingConfig]);

  const findPackage = () => {
    const pkg = packages.find(p => p.trackingNumber.trim().toUpperCase() === searchTrackingId.trim().toUpperCase());
    if (pkg) {
        setFoundPackage(pkg);
        if (pkg.courierId) {
            const courier = allUsers.find(u => u.id === pkg.courierId);
            setFoundCourier(courier || null);
        } else {
            setFoundCourier(null);
        }
    } else {
        alert("Colis non trouvé.");
        setFoundPackage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trackingNumber = `EC-${Math.floor(100000 + Math.random() * 900000)}`;
    
    const fullOrigin = `${newPkg.originCommune}, ${newPkg.originQuartier}${newPkg.originRue ? ', Rue ' + newPkg.originRue : ''}${newPkg.originPorte ? ', Porte ' + newPkg.originPorte : ''}`;
    const fullDest = `${newPkg.destinationCommune}, ${newPkg.destQuartier}${newPkg.destRue ? ', Rue ' + newPkg.destRue : ''}${newPkg.destPorte ? ', Porte ' + newPkg.destPorte : ''}`;

    const pkg: Package = {
      id: Math.random().toString(36).substr(2, 9),
      trackingNumber, senderId: user.id,
      description: `${newPkg.description}${newPkg.packageDetails ? ' (' + newPkg.packageDetails + ')' : ''}`,
      packageCount: newPkg.packageCount, weightKg: newPkg.weightKg,
      dimensions: newPkg.dimL || newPkg.dimW || newPkg.dimH ? { length: Number(newPkg.dimL) || 0, width: Number(newPkg.dimW) || 0, height: Number(newPkg.dimH) || 0 } : undefined,
      serviceLevel: newPkg.serviceLevel, originCity: newPkg.originCity,
      originAddress: fullOrigin,
      destinationCity: newPkg.destinationCity,
      destinationAddress: fullDest,
      senderName: newPkg.senderFullName, 
      senderPhone: newPkg.senderPhone,
      recipientName: newPkg.recipientFullName, 
      recipientPhone: newPkg.recipientPhone,
      price: calculatedPrice, paymentMethod: newPkg.paymentMethod,
      status: PackageStatus.PENDING,
      statusHistory: [{ status: PackageStatus.PENDING, timestamp: Date.now(), notes: "Colis en attente de prise en charge" }],
      createdAt: Date.now(), updatedAt: Date.now()
    };

    if (newPkg.paymentMethod !== PaymentMethod.CASH) { setPendingPackage(pkg); setShowPayment(true); }
    else { onCreatePackage(pkg); sendTrackingSMS(newPkg.senderPhone, newPkg.recipientPhone, trackingNumber); setView('LIST'); }
  };

  const myPackages = packages.filter(p => p.senderId === user.id).sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 relative text-white">
       {showPayment && (
           <PaymentModal amount={calculatedPrice} phone={user.phone} onSuccess={() => { if(pendingPackage){ onCreatePackage(pendingPackage); setView('LIST'); setShowPayment(false); } }} onCancel={() => setShowPayment(false)} />
       )}

       {qrPackage && (
           <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6" onClick={() => setQrPackage(null)}>
               <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
                   <button onClick={() => setQrPackage(null)} className="absolute top-4 right-4 p-1 text-slate-400"><X /></button>
                   <div className="w-16 h-16 bg-pureOrange rounded-full flex items-center justify-center mx-auto mb-4"><QrCode className="text-white w-8 h-8"/></div>
                   <h3 className="text-lg font-bold text-midnight mb-2">Code Colis</h3>
                   <p className="text-sm text-slate-500 font-mono mb-6 uppercase tracking-widest">{qrPackage.trackingNumber}</p>
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrPackage.trackingNumber}`} className="mx-auto rounded-xl border-4 border-slate-50 shadow-inner" />
               </div>
           </div>
       )}

      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
            <div className="bg-pureOrange/10 border border-pureOrange/20 px-4 py-2 rounded-2xl mb-2 inline-block">
                <p className="text-pureOrange text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3"/> Bonne arrivée, {user.name} 👋
                </p>
            </div>
            <h2 className="text-2xl font-black">EXPEDI<span className="text-pureOrange">-CARGO</span></h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setView('NOTIFS')} className="relative p-3 bg-midnightLight border border-slate-800 rounded-2xl">
                <Bell className="w-5 h-5 text-slate-400" />
                {unreadNotifs > 0 && <span className="absolute -top-1 -right-1 bg-pureOrange text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-midnight">{unreadNotifs}</span>}
            </button>
            <button onClick={() => setView('CREATE')} className="bg-pureOrange p-3 rounded-2xl shadow-lg shadow-pureOrange/20 animate-bounce-in"><Plus className="text-white w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex gap-2 mb-8 p-1.5 bg-midnightLight rounded-2xl border border-slate-800 shadow-xl">
          <button onClick={() => setView('LIST')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'LIST' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>Mes Colis</button>
          <button onClick={() => setView('TRACK')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'TRACK' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}>Suivre</button>
      </div>

      {view === 'CREATE' && (
        <form onSubmit={handleSubmit} className="space-y-10 bg-midnightLight p-6 rounded-3xl border border-slate-800 animate-fade-in-up shadow-2xl pb-10">
           <div className="flex justify-between items-center">
               <h3 className="text-xl font-bold flex items-center gap-2 text-pureOrange"><Box className="w-5 h-5"/> Nouvelle Expédition</h3>
               <button type="button" onClick={() => setView('LIST')} className="p-2 hover:bg-slate-800 rounded-full"><X className="w-5 h-5"/></button>
           </div>
           
           {/* COORDONNÉES EXPÉDITEUR */}
           <div className="space-y-6">
               <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2"><UserIcon className="w-3 h-3"/> Coordonnées Expéditeur</h4>
               <Input label="Nom et prénoms (expéditeur)" value={newPkg.senderFullName} onChange={e => setNewPkg({...newPkg, senderFullName: e.target.value})} required />
               <Input label="Numéro de tél" value={newPkg.senderPhone} onChange={e => setNewPkg({...newPkg, senderPhone: e.target.value})} required />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Commune / Ville" as="select" options={COMMUNES_LIST.map(c => ({label: c, value: c}))} value={newPkg.originCommune} onChange={e => {setNewPkg({...newPkg, originCommune: e.target.value}); setCoords({...coords, origin: ABIDJAN_COMMUNES_COORDS[e.target.value]})}} />
                   <div className="grid grid-cols-3 gap-2">
                        <Input label="Quartier" placeholder="Quartier" value={newPkg.originQuartier} onChange={e => setNewPkg({...newPkg, originQuartier: e.target.value})} required />
                        <Input label="Rue" placeholder="Rue" value={newPkg.originRue} onChange={e => setNewPkg({...newPkg, originRue: e.target.value})} />
                        <Input label="Porte" placeholder="Porte" value={newPkg.originPorte} onChange={e => setNewPkg({...newPkg, originPorte: e.target.value})} />
                   </div>
               </div>
           </div>

           {/* COORDONNÉES DESTINATAIRE */}
           <div className="space-y-6">
               <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2 text-blue-500"><Navigation className="w-3 h-3"/> COORDONNEES DESTINATAIRE</h4>
               <Input label="Nom et prénoms" value={newPkg.recipientFullName} onChange={e => setNewPkg({...newPkg, recipientFullName: e.target.value})} required />
               <Input label="Numéro de tél" value={newPkg.recipientPhone} onChange={e => setNewPkg({...newPkg, recipientPhone: e.target.value})} required />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input label="Commune / Ville" as="select" options={COMMUNES_LIST.map(c => ({label: c, value: c}))} value={newPkg.destinationCommune} onChange={e => {setNewPkg({...newPkg, destinationCommune: e.target.value}); setCoords({...coords, dest: ABIDJAN_COMMUNES_COORDS[e.target.value]})}} />
                   <div className="grid grid-cols-3 gap-2">
                        <Input label="Quartier" placeholder="Quartier" value={newPkg.destQuartier} onChange={e => setNewPkg({...newPkg, destQuartier: e.target.value})} required />
                        <Input label="Rue" placeholder="Rue" value={newPkg.destRue} onChange={e => setNewPkg({...newPkg, destRue: e.target.value})} />
                        <Input label="Porte" placeholder="Porte" value={newPkg.destPorte} onChange={e => setNewPkg({...newPkg, destPorte: e.target.value})} />
                   </div>
               </div>
           </div>

           {/* DÉTAILS DU COLIS */}
           <div className="space-y-6">
               <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2 text-green-500"><PackageCheck className="w-3 h-3"/> Détails du colis</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Type de colis" as="select" options={[
                        {label: 'Documents', value: 'Documents'},
                        {label: 'Appareils', value: 'Appareils'},
                        {label: 'Autres', value: 'Autres'}
                    ]} value={newPkg.description} onChange={e => setNewPkg({...newPkg, description: e.target.value})} />
                    <Input label="Précisions sur le contenu" placeholder="Ex: iPhone 14, Factures..." value={newPkg.packageDetails} onChange={e => setNewPkg({...newPkg, packageDetails: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <Input label="Poids (kg)" type="number" value={newPkg.weightKg} onChange={e => setNewPkg({...newPkg, weightKg: Number(e.target.value)})} />
                   <Input label="Nombre" type="number" value={newPkg.packageCount} onChange={e => setNewPkg({...newPkg, packageCount: Number(e.target.value)})} />
               </div>
           </div>

           {/* URGENCE D'ENVOI */}
           <div className="space-y-4">
               <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2 text-pureOrange"><Zap className="w-3 h-3"/> Urgence D'envoi</h4>
               <div className="grid grid-cols-3 gap-2">
                   {[
                       {id: ServiceLevel.EXPRESS, label: 'Express', icon: Zap},
                       {id: ServiceLevel.STANDARD, label: 'Standard', icon: Truck},
                       {id: ServiceLevel.ECO, label: 'Economique', icon: Clock}
                   ].map(lvl => (
                       <button key={lvl.id} type="button" onClick={() => setNewPkg({...newPkg, serviceLevel: lvl.id})} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPkg.serviceLevel === lvl.id ? 'border-pureOrange bg-pureOrange/10' : 'border-slate-800 bg-slate-900'}`}>
                           <lvl.icon className={`w-5 h-5 ${newPkg.serviceLevel === lvl.id ? 'text-pureOrange' : 'text-slate-600'}`} />
                           <span className="text-[10px] font-bold uppercase">{lvl.label}</span>
                       </button>
                   ))}
               </div>
               <div className="relative group mt-6">
                    <div ref={mapContainerRef} className="w-full h-44 bg-slate-900 rounded-2xl border border-slate-800 z-0 overflow-hidden shadow-inner"></div>
                    <p className="absolute bottom-2 right-2 text-[8px] text-slate-500/50 font-bold bg-midnight/80 px-2 py-0.5 rounded pointer-events-none">Leaflet | &copy; CARTO</p>
               </div>
           </div>

           <div className="space-y-4">
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2 text-slate-400"><Coins className="w-3 h-3"/> Mode de paiement</h4>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        {id: PaymentMethod.CASH, label: 'En espèces', logo: '💵'},
                        {id: PaymentMethod.WAVE, label: 'Wave', logo: '🌊'},
                        {id: PaymentMethod.MOMO, label: 'Momo', logo: '📱'}
                    ].map(pm => (
                        <button key={pm.id} type="button" onClick={() => setNewPkg({...newPkg, paymentMethod: pm.id})} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${newPkg.paymentMethod === pm.id ? 'border-pureOrange bg-pureOrange/10' : 'border-slate-800 bg-slate-900'}`}>
                            <span className="text-xl">{pm.logo}</span>
                            <span className="text-[10px] font-bold uppercase">{pm.label}</span>
                        </button>
                    ))}
                </div>
           </div>

           <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="text-center md:text-left">
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Prix total estimé</p>
                   <p className="text-3xl font-black text-pureOrange">{calculatedPrice.toLocaleString()} F <span className="text-sm font-bold text-slate-600">CFA</span></p>
               </div>
               <Button type="submit" size="lg" fullWidth className="md:w-auto shadow-2xl">Lancer l'expédition</Button>
           </div>
        </form>
      )}

      {view === 'LIST' && (
          <div className="space-y-6 animate-fade-in">
              {myPackages.length === 0 ? (
                  <div className="py-20 text-center space-y-4 bg-midnightLight/20 rounded-3xl border-2 border-dashed border-slate-800 animate-fade-in">
                      <Box className="w-16 h-16 text-slate-800 mx-auto" />
                      <p className="text-slate-500 font-bold">Vous n'avez aucun colis actif</p>
                      <Button onClick={() => setView('CREATE')}>Créer mon premier envoi</Button>
                  </div>
              ) : (
                  myPackages.map(pkg => {
                    const courier = pkg.courierId ? allUsers.find(u => u.id === pkg.courierId) : null;
                    return (
                        <div key={pkg.id} className="bg-midnightLight p-5 rounded-3xl border border-slate-800 shadow-xl group hover:border-pureOrange/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-lg text-white group-hover:text-pureOrange transition-colors">{pkg.description}</h4>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Ref: {pkg.trackingNumber}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter bg-pureOrange/10 text-pureOrange border border-pureOrange/20">{pkg.status}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mb-6 border-l-2 border-slate-800 pl-4 py-1">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-blue-500" /> <span className="truncate max-w-[200px]">{pkg.originAddress}</span></div>
                                    <div className="flex items-center gap-2"><Navigation className="w-3 h-3 text-pureOrange" /> <span className="truncate max-w-[200px]">{pkg.destinationAddress}</span></div>
                                </div>
                            </div>

                            {courier && (
                                <div className="mb-6 p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-3 animate-fade-in">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-blue-500/20 overflow-hidden shrink-0">
                                        {courier.courierDetails?.photoUrl ? (
                                            <img src={courier.courierDetails.photoUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-5 h-5 text-blue-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Livreur assigné</p>
                                        <p className="text-xs font-bold text-white truncate">{courier.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{courier.courierDetails?.vehiclePlate || 'Immatriculation N/A'}</p>
                                    </div>
                                    <a href={`tel:${courier.phone}`} className="p-2.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                                        <Smartphone className="w-4 h-4" />
                                    </a>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <button onClick={() => setQrPackage(pkg)} className="p-3 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"><QrCode className="w-5 h-5"/></button>
                                <div className="text-right">
                                    <p className="text-[8px] text-slate-500 uppercase font-black">Coût total</p>
                                    <p className="font-black text-white text-lg">{pkg.price.toLocaleString()} F</p>
                                </div>
                            </div>
                        </div>
                    );
                  })
              )}
          </div>
      )}

      {view === 'TRACK' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-midnightLight p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row gap-4 shadow-2xl">
                  <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input className="w-full bg-midnight border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white uppercase text-sm font-bold focus:outline-none focus:border-pureOrange transition-all" placeholder="Entrez le N° de suivi (ex: EC-123456)" value={searchTrackingId} onChange={e => setSearchTrackingId(e.target.value)} />
                  </div>
                  <Button onClick={findPackage} className="py-4">Rechercher</Button>
              </div>

              {foundPackage && (
                  <div className="bg-midnightLight p-8 rounded-3xl border border-slate-800 animate-fade-in-up shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-pureOrange/5 rounded-bl-full -z-0"></div>
                      <div className="relative z-10">
                          <div className="flex justify-between items-center mb-6">
                              <div>
                                <h4 className="text-2xl font-black text-pureOrange uppercase tracking-tighter">{foundPackage.status}</h4>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Colis {foundPackage.trackingNumber}</p>
                              </div>
                              <div className="p-4 bg-slate-900 rounded-2xl"><Box className="w-8 h-8 text-slate-600" /></div>
                          </div>
                          
                          {foundCourier && (
                              <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 bg-slate-800 overflow-hidden shadow-inner">
                                      {foundCourier.courierDetails?.photoUrl ? <img src={foundCourier.courierDetails.photoUrl} className="w-full h-full object-cover" /> : <UserCircle2 className="w-full h-full text-slate-600"/>}
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Livreur en charge</p>
                                      <p className="font-black text-white text-base">{foundCourier.name}</p>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase">{foundCourier.courierDetails?.vehicleType} • {foundCourier.courierDetails?.vehiclePlate}</p>
                                  </div>
                                  <a href={`tel:${foundCourier.phone}`} className="p-3 bg-blue-500 text-white rounded-full shadow-lg shadow-blue-500/20"><Smartphone className="w-5 h-5"/></a>
                              </div>
                          )}

                          <div className="relative pl-8 border-l-2 border-slate-800 space-y-8">
                              {foundPackage.statusHistory.slice().reverse().map((h, i) => (
                                  <div key={i} className="relative group">
                                      <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full border-4 border-midnight transition-transform group-hover:scale-125 ${i === 0 ? 'bg-pureOrange shadow-[0_0_10px_#FF6B00]' : 'bg-slate-700'}`}></div>
                                      <p className={`text-sm font-black uppercase tracking-wide ${i === 0 ? 'text-white' : 'text-slate-500'}`}>{h.status}</p>
                                      <p className="text-[10px] text-slate-600 font-bold mt-1">{new Date(h.timestamp).toLocaleString()}</p>
                                      {h.notes && <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/50 p-2 rounded-lg italic border border-slate-800">"{h.notes}"</p>}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {view === 'NOTIFS' && (
          <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2 text-pureOrange"><Bell className="w-5 h-5"/> Notifications</h3>
                <button onClick={() => setView('LIST')} className="text-xs text-slate-500 font-bold uppercase hover:text-white">Retour</button>
              </div>
              {notifications.length === 0 ? (
                  <div className="py-20 text-center bg-midnightLight/30 rounded-3xl border border-dashed border-slate-800">
                      <Bell className="w-12 h-12 text-slate-800 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs">Aucune notification pour le moment.</p>
                  </div>
              ) : (
                notifications.map(n => (
                    <div key={n.id} onClick={() => onMarkNotifAsRead(n.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${n.isRead ? 'bg-midnightLight border-slate-800 opacity-60' : 'bg-slate-800 border-pureOrange/50 shadow-lg'}`}>
                        <div className="flex gap-4">
                            <div className={`p-2 rounded-xl h-fit ${n.isRead ? 'bg-slate-900' : 'bg-pureOrange/20'}`}>
                                <Info className={`w-5 h-5 ${n.isRead ? 'text-slate-500' : 'text-pureOrange'}`} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm mb-1">{n.title}</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                                <p className="text-[9px] text-slate-600 font-bold mt-2 uppercase tracking-tighter">{new Date(n.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                ))
              )}
          </div>
      )}
    </div>
  );
};
