
import React, { useState, useEffect, useRef } from 'react';
import { User, Package, PackageStatus, CITIES, PaymentMethod, PAYMENT_METHODS, ServiceLevel, AppNotification, PricingConfig } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { sendTrackingSMS } from '../services/smsService';
import { 
  Plus, History, Box, MapPin, Clock, Phone, Zap, Gauge, Leaf, 
  Navigation, Ruler, Bell, Search, Truck, QrCode, X, 
  User as UserIcon, Scale, Layers, Gem, CreditCard, Map as MapIcon,
  ShieldCheck, Banknote, Smartphone, Wallet
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

type PackageType = 'DOCUMENT' | 'DEVICE' | 'OTHER';

const ABIDJAN_COMMUNES_COORDS: Record<string, {lat: number, lng: number}> = {
  'Abobo': { lat: 5.415, lng: -4.020 },
  'Adjamé': { lat: 5.355, lng: -4.030 },
  'Anyama': { lat: 5.495, lng: -4.055 },
  'Attécoubé': { lat: 5.330, lng: -4.040 },
  'Bingerville': { lat: 5.355, lng: -3.895 },
  'Cocody': { lat: 5.354, lng: -3.975 },
  'Koumassi': { lat: 5.300, lng: -3.950 },
  'Marcory': { lat: 5.305, lng: -3.980 },
  'Plateau': { lat: 5.325, lng: -4.020 },
  'Port-Bouët': { lat: 5.255, lng: -3.960 },
  'Songon': { lat: 5.315, lng: -4.255 },
  'Treichville': { lat: 5.300, lng: -4.010 },
  'Yopougon': { lat: 5.340, lng: -4.080 },
};

const COMMUNES_LIST = Object.keys(ABIDJAN_COMMUNES_COORDS).sort();

export const SenderDashboard: React.FC<SenderDashboardProps> = ({ 
    user, packages, allUsers, notifications, pricingConfig, onMarkNotifAsRead, onCreatePackage 
}) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'TRACK'>('LIST'); 
  const [showNotifications, setShowNotifications] = useState(false);
  const [packageType, setPackageType] = useState<PackageType>('OTHER');
  const [isHighValue, setIsHighValue] = useState(false);
  const [declaredValue, setDeclaredValue] = useState<string>('');
  const [qrPackage, setQrPackage] = useState<Package | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<Package | null>(null);

  const [searchTrackingId, setSearchTrackingId] = useState('');
  const [foundPackage, setFoundPackage] = useState<Package | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ originMarker?: any, destMarker?: any, line?: any, originIcon?: any, destIcon?: any }>({});
  
  const [newPkg, setNewPkg] = useState({
    description: '',
    packageCount: 1,
    weightKg: 1,
    dimL: '', dimW: '', dimH: '',
    serviceLevel: ServiceLevel.STANDARD,
    
    // Origin Simplified
    originCity: 'Abidjan', 
    originCommune: '',
    originAddressDetails: '', 
    senderName: user.name,
    senderPhone: user.phone,

    // Destination Simplified
    destinationCity: 'Abidjan',
    destinationCommune: '',
    destAddressDetails: '', 
    recipientName: '',
    recipientPhone: '',

    paymentMethod: PaymentMethod.WAVE
  });
  
  const [coords, setCoords] = useState<{ origin: {lat: number, lng: number} | null, dest: {lat: number, lng: number} | null }>({ origin: null, dest: null });
  const [simulatedDistance, setSimulatedDistance] = useState<number>(0);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [deliveryTime, setDeliveryTime] = useState<string>('48H');

  const isValidCIPhone = (phone: string) => /^(01|05|07)\d{8}$/.test(phone.replace(/\s/g, ''));
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (view === 'CREATE' && mapContainerRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([5.34, -4.02], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(mapInstanceRef.current);
        
        const createIcon = (color: string) => L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);" class="marker-pulse"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        markersRef.current.originIcon = createIcon('#3b82f6'); 
        markersRef.current.destIcon = createIcon('#ff6b00');
    }
    return () => {
        if (view !== 'CREATE' && mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            markersRef.current = {};
        }
    };
  }, [view]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const { origin, dest } = coords;
    const markers = markersRef.current;

    if (markers.originMarker) map.removeLayer(markers.originMarker);
    if (markers.destMarker) map.removeLayer(markers.destMarker);
    if (markers.line) map.removeLayer(markers.line);

    const bounds = [];
    if (origin) {
        markers.originMarker = L.marker([origin.lat, origin.lng], { icon: markers.originIcon }).addTo(map)
            .bindPopup("<b>Récupération</b><br>" + newPkg.originCommune).openPopup();
        bounds.push([origin.lat, origin.lng]);
    }
    if (dest) {
        markers.destMarker = L.marker([dest.lat, dest.lng], { icon: markers.destIcon }).addTo(map)
            .bindPopup("<b>Livraison</b><br>" + newPkg.destinationCommune);
        bounds.push([dest.lat, dest.lng]);
    }

    if (origin && dest) {
        markers.line = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], { color: '#ff6b00', weight: 4, dashArray: '8, 12' }).addTo(map);
        map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
        
        const R = 6371; 
        const dLat = (dest.lat - origin.lat) * Math.PI / 180;
        const dLon = (dest.lng - origin.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(origin.lat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        setSimulatedDistance(Math.max(1, Math.ceil(R * c * 1.3))); 
    }
  }, [coords]);

  useEffect(() => {
    let basePrice = 0;
    let time = '48H';
    const isInterCity = newPkg.originCity !== newPkg.destinationCity;

    switch (newPkg.serviceLevel) {
        case ServiceLevel.EXPRESS: time = '24H'; break;
        case ServiceLevel.STANDARD: time = '48H'; break;
        case ServiceLevel.ECO: time = '72H'; break;
    }

    if (isInterCity) {
        basePrice = pricingConfig.basePriceInter;
        if (packageType === 'DOCUMENT') basePrice = pricingConfig.basePriceDoc;
        if (newPkg.serviceLevel === ServiceLevel.EXPRESS) basePrice += 2000;
    } else {
        if (simulatedDistance <= 5) { basePrice = 900; time = '1H - 2H'; }
        else {
            basePrice = pricingConfig.basePriceIntra;
            if (newPkg.serviceLevel === ServiceLevel.EXPRESS) basePrice += 1000;
            if (newPkg.serviceLevel === ServiceLevel.ECO) basePrice -= 500;
            const interval = pricingConfig.kmSurchargeInterval || 5;
            if (simulatedDistance > 15) { basePrice += (Math.ceil((simulatedDistance - 15) / interval) * pricingConfig.kmSurchargeAmount); }
        }
    }

    const volumetricWeight = ((parseFloat(newPkg.dimL) || 0) * (parseFloat(newPkg.dimW) || 0) * (parseFloat(newPkg.dimH) || 0)) / 5000;
    const effectiveWeight = Math.max(newPkg.weightKg, volumetricWeight);
    let weightMultiplier = 1;
    if (effectiveWeight > 5 && effectiveWeight <= 20) weightMultiplier = 1 + pricingConfig.weightSurchargeMedium;
    else if (effectiveWeight > 20) weightMultiplier = 1 + pricingConfig.weightSurchargeHeavy;
    let pricePerUnit = basePrice * weightMultiplier;
    if (isHighValue && declaredValue) pricePerUnit += Math.ceil((parseInt(declaredValue) || 0) * 0.05);
    pricePerUnit = Math.max(pricePerUnit, 500);
    let totalPrice = 0;
    const count = Math.max(1, newPkg.packageCount);
    for (let i = 1; i <= count; i++) {
        if (i === 1) totalPrice += pricePerUnit; 
        else if (i <= 3) totalPrice += pricePerUnit * 0.8;
        else totalPrice += pricePerUnit * 0.7;
    }
    setCalculatedPrice(Math.ceil(totalPrice));
    setDeliveryTime(time);
  }, [newPkg.serviceLevel, newPkg.originCity, newPkg.destinationCity, packageType, isHighValue, declaredValue, simulatedDistance, newPkg.weightKg, newPkg.dimL, newPkg.dimW, newPkg.dimH, newPkg.packageCount, pricingConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCIPhone(newPkg.senderPhone) || !isValidCIPhone(newPkg.recipientPhone)) return alert("Veuillez saisir des numéros de téléphone valides.");

    const trackingNumber = `EC-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullOrigin = `${newPkg.originCommune}: ${newPkg.originAddressDetails}`;
    const fullDest = `${newPkg.destinationCommune}: ${newPkg.destAddressDetails}`;

    // Fix: Added missing required properties 'statusHistory' and 'updatedAt' to satisfy the Package interface.
    const pkg: Package = {
      id: Math.random().toString(36).substr(2, 9),
      trackingNumber,
      senderId: user.id,
      description: `${newPkg.packageCount}x [${packageType}] ${newPkg.description}`,
      packageCount: newPkg.packageCount,
      weightKg: newPkg.weightKg,
      serviceLevel: newPkg.serviceLevel,
      distanceKm: simulatedDistance,
      originCity: newPkg.originCity,
      originAddress: fullOrigin,
      destinationCity: newPkg.destinationCity,
      destinationAddress: fullDest,
      senderName: newPkg.senderName,
      senderPhone: newPkg.senderPhone,
      recipientName: newPkg.recipientName,
      recipientPhone: newPkg.recipientPhone,
      price: calculatedPrice,
      estimatedDeliveryTime: deliveryTime,
      paymentMethod: newPkg.paymentMethod,
      status: PackageStatus.PENDING,
      statusHistory: [{
        status: PackageStatus.PENDING,
        timestamp: Date.now(),
        notes: "Colis enregistré sur la plateforme"
      }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (newPkg.paymentMethod !== PaymentMethod.CASH) {
        setPendingPackage(pkg);
        setShowPayment(true);
    } else {
        onCreatePackage(pkg);
        sendTrackingSMS(newPkg.senderPhone, newPkg.recipientPhone, trackingNumber);
        setView('LIST');
    }
  };

  const onPaymentSuccess = () => {
      if (pendingPackage) {
          onCreatePackage(pendingPackage);
          sendTrackingSMS(pendingPackage.senderPhone, pendingPackage.recipientPhone, pendingPackage.trackingNumber);
          setPendingPackage(null);
          setShowPayment(false);
          setView('LIST');
      }
  };

  const handleCommuneChange = (type: 'ORIGIN' | 'DEST', commune: string) => {
      const data = ABIDJAN_COMMUNES_COORDS[commune];
      if (!data) return;
      if (type === 'ORIGIN') {
          setNewPkg(prev => ({ ...prev, originCommune: commune }));
          setCoords(prev => ({ ...prev, origin: { lat: data.lat, lng: data.lng } }));
      } else {
          setNewPkg(prev => ({ ...prev, destinationCommune: commune }));
          setCoords(prev => ({ ...prev, dest: { lat: data.lat, lng: data.lng } }));
      }
  };

  const myPackages = packages.filter(p => p.senderId === user.id).sort((a,b) => b.createdAt - a.createdAt);

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 relative">
       {showPayment && (
           <PaymentModal amount={calculatedPrice} phone={user.phone} onSuccess={onPaymentSuccess} onCancel={() => setShowPayment(false)} />
       )}

       {qrPackage && (
           <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6 animate-fade-in">
               <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center relative">
                   <button onClick={() => setQrPackage(null)} className="absolute top-2 right-2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-800"><X className="w-5 h-5" /></button>
                   <h3 className="text-lg font-bold text-midnight mb-2">QR Code Colis</h3>
                   <p className="text-pureOrange font-bold text-lg mb-4">{qrPackage.trackingNumber}</p>
                   <div className="flex justify-center mb-4"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrPackage.trackingNumber}`} alt="QR Code" className="w-48 h-48 border-4 border-midnight rounded-xl" /></div>
               </div>
           </div>
       )}

      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-xl font-bold text-white">Bonjour, {user.name}</h2><p className="text-slate-400 text-sm">Expéditeur</p></div>
        <div className="flex items-center gap-3">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 bg-midnightLight rounded-full border border-slate-700">
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-pureOrange' : 'text-slate-400'}`} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">{unreadCount}</span>}
            </button>
            <button onClick={() => setView('CREATE')} className="bg-pureOrange p-3 rounded-full shadow-lg hover:scale-105 transition-transform"><Plus className="text-white" /></button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
          <button onClick={() => setView('LIST')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${view === 'LIST' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-500'}`}>Mes Colis</button>
          <button onClick={() => setView('TRACK')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${view === 'TRACK' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-500'}`}>Suivre un colis</button>
      </div>

      {view === 'CREATE' && (
        <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-white">Nouvelle Expédition</h3>
             <button onClick={() => setView('LIST')} className="text-slate-400 text-sm">Annuler</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Point de Retrait (Expéditeur) */}
            <div className="space-y-4 border-b border-slate-700 pb-6">
               <h4 className="text-pureOrange text-xs font-bold uppercase tracking-wider flex items-center gap-2"><MapPin className="w-4 h-4" /> 1. Point de Retrait</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nom de l'Expéditeur" value={newPkg.senderName} readOnly className="opacity-70 bg-slate-900" />
                  <Input label="Numéro de Téléphone" value={newPkg.senderPhone} onChange={e => setNewPkg({...newPkg, senderPhone: e.target.value})} required />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Commune" as="select" options={[{label: 'Choisir...', value: ''}, ...COMMUNES_LIST.map(c => ({ label: c, value: c }))]} value={newPkg.originCommune} onChange={e => handleCommuneChange('ORIGIN', e.target.value)} required />
                  <Input label="Quartier, Rue et Porte" placeholder="Ex: Riviera 2, Rue I45, Porte 12..." value={newPkg.originAddressDetails} onChange={e => setNewPkg({...newPkg, originAddressDetails: e.target.value})} required />
               </div>
            </div>

            {/* 2. Point de Livraison (Destinataire) */}
            <div className="space-y-4 border-b border-slate-700 pb-6">
               <h4 className="text-pureOrange text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Navigation className="w-4 h-4" /> 2. Point de Livraison</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nom Prénoms Destinataire" placeholder="Nom du destinataire..." value={newPkg.recipientName} onChange={e => setNewPkg({...newPkg, recipientName: e.target.value})} required />
                  <Input label="Numéro Destinataire" placeholder="07xxxxxxxx" value={newPkg.recipientPhone} onChange={e => setNewPkg({...newPkg, recipientPhone: e.target.value})} required />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Commune" as="select" options={[{label: 'Choisir...', value: ''}, ...COMMUNES_LIST.map(c => ({ label: c, value: c }))]} value={newPkg.destinationCommune} onChange={e => handleCommuneChange('DEST', e.target.value)} required />
                  <Input label="Quartier, Rue et Porte" placeholder="Ex: Cocody Centre, Rue des jardins, Villa 4..." value={newPkg.destAddressDetails} onChange={e => setNewPkg({...newPkg, destAddressDetails: e.target.value})} required />
               </div>
            </div>

            {/* 3. Carte de Géolocalisation */}
            <div className="space-y-3">
               <h4 className="text-pureOrange text-xs font-bold uppercase tracking-wider flex items-center gap-2"><MapIcon className="w-4 h-4" /> 3. Visualisation du Trajet</h4>
               <div ref={mapContainerRef} className="w-full h-64 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-inner z-0"></div>
               {simulatedDistance > 0 && (
                   <p className="text-xs text-slate-400 italic text-right">Distance estimée : <b>{simulatedDistance} km</b></p>
               )}
            </div>

            {/* 4. Détails du Colis */}
            <div className="space-y-4 border-b border-slate-700 pb-6">
               <h4 className="text-pureOrange text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Box className="w-4 h-4" /> 4. Informations Colis</h4>
               <Input label="Description précise" placeholder="Ex: Carton de vêtements, TV, documents..." as="textarea" value={newPkg.description} onChange={e => setNewPkg({...newPkg, description: e.target.value})} required className="h-20" />
               <div className="grid grid-cols-2 gap-4">
                   <Input label="Poids (kg)" type="number" step="0.5" value={newPkg.weightKg} onChange={e => setNewPkg({...newPkg, weightKg: parseFloat(e.target.value) || 0})} />
                   <Input label="Catégorie" as="select" options={[{label:'Autre Colis', value:'OTHER'}, {label:'Documents', value:'DOCUMENT'}, {label:'Appareil Électronique', value:'DEVICE'}]} value={packageType} onChange={e => setPackageType(e.target.value as any)} />
               </div>
            </div>

            {/* 5. Niveau d'Urgence */}
            <div className="space-y-4 border-b border-slate-700 pb-6">
               <h4 className="text-pureOrange text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Clock className="w-4 h-4" /> 5. Niveau d'Urgence</h4>
               <div className="grid grid-cols-3 gap-3">
                   <div 
                        onClick={() => setNewPkg({...newPkg, serviceLevel: ServiceLevel.EXPRESS})} 
                        className={`cursor-pointer rounded-2xl p-4 border-2 text-center transition-all ${newPkg.serviceLevel === ServiceLevel.EXPRESS ? 'bg-pureOrange/10 border-pureOrange shadow-lg shadow-pureOrange/10' : 'border-slate-800 hover:border-slate-700 text-slate-500'}`}
                   >
                       <Zap className={`mx-auto mb-2 ${newPkg.serviceLevel === ServiceLevel.EXPRESS ? 'text-pureOrange' : ''}`} />
                       <p className={`text-xs font-black uppercase ${newPkg.serviceLevel === ServiceLevel.EXPRESS ? 'text-white' : ''}`}>Express</p>
                       <p className="text-[10px] opacity-60">24H</p>
                   </div>
                   <div 
                        onClick={() => setNewPkg({...newPkg, serviceLevel: ServiceLevel.STANDARD})} 
                        className={`cursor-pointer rounded-2xl p-4 border-2 text-center transition-all ${newPkg.serviceLevel === ServiceLevel.STANDARD ? 'bg-blue-600/10 border-blue-600 shadow-lg shadow-blue-600/10' : 'border-slate-800 hover:border-slate-700 text-slate-500'}`}
                   >
                       <Gauge className={`mx-auto mb-2 ${newPkg.serviceLevel === ServiceLevel.STANDARD ? 'text-blue-500' : ''}`} />
                       <p className={`text-xs font-black uppercase ${newPkg.serviceLevel === ServiceLevel.STANDARD ? 'text-white' : ''}`}>Standard</p>
                       <p className="text-[10px] opacity-60">48H</p>
                   </div>
                   <div 
                        onClick={() => setNewPkg({...newPkg, serviceLevel: ServiceLevel.ECO})} 
                        className={`cursor-pointer rounded-2xl p-4 border-2 text-center transition-all ${newPkg.serviceLevel === ServiceLevel.ECO ? 'bg-green-600/10 border-green-600 shadow-lg shadow-green-600/10' : 'border-slate-800 hover:border-slate-700 text-slate-500'}`}
                   >
                       <Leaf className={`mx-auto mb-2 ${newPkg.serviceLevel === ServiceLevel.ECO ? 'text-green-500' : ''}`} />
                       <p className={`text-xs font-black uppercase ${newPkg.serviceLevel === ServiceLevel.ECO ? 'text-white' : ''}`}>Éco</p>
                       <p className="text-[10px] opacity-60">72H</p>
                   </div>
               </div>
            </div>

            {/* 6. Moyen de Paiement (Rendu en cartes pour inclure Espèces explicitement) */}
            <div className="space-y-4 border-b border-slate-700 pb-6">
               <h4 className="text-pureOrange text-xs font-bold uppercase tracking-wider flex items-center gap-2"><CreditCard className="w-4 h-4" /> 6. Mode de Paiement</h4>
               <div className="grid grid-cols-1 gap-3">
                   <div 
                        onClick={() => setNewPkg({...newPkg, paymentMethod: PaymentMethod.WAVE})} 
                        className={`cursor-pointer rounded-2xl p-4 border-2 flex items-center gap-4 transition-all ${newPkg.paymentMethod === PaymentMethod.WAVE ? 'bg-cyan-500/10 border-cyan-500' : 'border-slate-800 hover:border-slate-700'}`}
                   >
                       <div className={`p-2 rounded-lg ${newPkg.paymentMethod === PaymentMethod.WAVE ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                           <Smartphone className="w-5 h-5" />
                       </div>
                       <div className="flex-1 text-left">
                           <p className="text-sm font-bold text-white">Wave Mobile Money</p>
                           <p className="text-[10px] text-slate-500">Paiement instantané sécurisé</p>
                       </div>
                       {newPkg.paymentMethod === PaymentMethod.WAVE && <ShieldCheck className="w-5 h-5 text-cyan-500" />}
                   </div>

                   <div 
                        onClick={() => setNewPkg({...newPkg, paymentMethod: PaymentMethod.MOMO})} 
                        className={`cursor-pointer rounded-2xl p-4 border-2 flex items-center gap-4 transition-all ${newPkg.paymentMethod === PaymentMethod.MOMO ? 'bg-yellow-500/10 border-yellow-500' : 'border-slate-800 hover:border-slate-700'}`}
                   >
                       <div className={`p-2 rounded-lg ${newPkg.paymentMethod === PaymentMethod.MOMO ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                           <Wallet className="w-5 h-5" />
                       </div>
                       <div className="flex-1 text-left">
                           <p className="text-sm font-bold text-white">Mobile Money (Orange/MTN/Moov)</p>
                           <p className="text-[10px] text-slate-500">Paiement via USSD ou Application</p>
                       </div>
                       {newPkg.paymentMethod === PaymentMethod.MOMO && <ShieldCheck className="w-5 h-5 text-yellow-500" />}
                   </div>

                   <div 
                        onClick={() => setNewPkg({...newPkg, paymentMethod: PaymentMethod.CASH})} 
                        className={`cursor-pointer rounded-2xl p-4 border-2 flex items-center gap-4 transition-all ${newPkg.paymentMethod === PaymentMethod.CASH ? 'bg-green-500/10 border-green-500' : 'border-slate-800 hover:border-slate-700'}`}
                   >
                       <div className={`p-2 rounded-lg ${newPkg.paymentMethod === PaymentMethod.CASH ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                           <Banknote className="w-5 h-5" />
                       </div>
                       <div className="flex-1 text-left">
                           <p className="text-sm font-bold text-white">Espèces à la livraison</p>
                           <p className="text-[10px] text-slate-500">Réglez directement auprès du livreur</p>
                       </div>
                       {newPkg.paymentMethod === PaymentMethod.CASH && <ShieldCheck className="w-5 h-5 text-green-500" />}
                   </div>
               </div>
            </div>

            {/* Total et Confirmation */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl sticky bottom-20 z-10">
                <div className="text-center md:text-left">
                    <p className="text-xs text-slate-400 mb-1">Montant à régler</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-black text-pureOrange">{calculatedPrice.toLocaleString()}</p>
                        <p className="text-sm font-bold text-slate-400">FCFA</p>
                    </div>
                </div>
                <Button type="submit" className="w-full md:w-auto px-12 py-4 text-lg">Confirmer l'Expédition</Button>
            </div>
          </form>
        </div>
      )} 
      
      {view === 'LIST' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-white font-bold flex items-center gap-2 mb-4"><History className="w-5 h-5 text-pureOrange" /> Mes Colis Récents</h3>
          {myPackages.length === 0 ? (
              <div className="text-center py-20 bg-midnightLight/50 rounded-2xl border border-dashed border-slate-800">
                  <Box className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">Aucun colis enregistré.</p>
              </div>
          ) : myPackages.map(pkg => (
              <div key={pkg.id} className="bg-midnightLight p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-bold text-white text-base group-hover:text-pureOrange transition-colors">{pkg.description}</span>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">N° {pkg.trackingNumber}</p>
                      </div>
                      <span className="text-pureOrange font-black text-lg">{pkg.price.toLocaleString()} F</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 bg-slate-900/50 p-2 rounded-lg">
                      <div className="flex flex-col items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div className="w-px h-3 bg-slate-700"></div>
                          <div className="w-2 h-2 rounded-full bg-pureOrange"></div>
                      </div>
                      <div className="flex-1 space-y-1">
                          <p className="truncate"><span className="text-slate-600">De:</span> {pkg.originAddress}</p>
                          <p className="truncate"><span className="text-slate-600">À:</span> {pkg.destinationAddress}</p>
                      </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                       <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${pkg.status === PackageStatus.DELIVERED ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-blue-500 text-blue-500 bg-blue-500/10'}`}>
                           {pkg.status}
                       </span>
                       <button onClick={() => setQrPackage(pkg)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <QrCode className="w-4 h-4 text-slate-400" />
                       </button>
                  </div>
              </div>
          ))}
        </div>
      )}

      {view === 'TRACK' && (
          <div className="animate-fade-in space-y-4">
              <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-pureOrange"/> Suivi Colis</h3>
                  <div className="flex gap-2">
                      <input 
                        className="flex-1 bg-midnight border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-pureOrange focus:outline-none" 
                        placeholder="N° de suivi (Ex: EC-123456)" 
                        value={searchTrackingId} 
                        onChange={e => setSearchTrackingId(e.target.value)} 
                      />
                      <Button onClick={() => {
                          const pkg = packages.find(p => p.trackingNumber.trim() === searchTrackingId.trim());
                          if (pkg) setFoundPackage(pkg);
                          else alert("Colis non trouvé.");
                      }}>Suivre</Button>
                  </div>
              </div>

              {foundPackage && (
                  <div className="bg-midnightLight p-5 rounded-2xl border border-slate-700 animate-fade-in-up">
                      <div className="flex justify-between items-center mb-6">
                          <div>
                              <p className="text-xs text-slate-500 mb-1">Status</p>
                              <h4 className="text-xl font-black text-pureOrange">{foundPackage.status}</h4>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-slate-500">Référence</p>
                              <p className="font-bold text-white">{foundPackage.trackingNumber}</p>
                          </div>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full bg-pureOrange transition-all duration-1000 ${foundPackage.status === PackageStatus.DELIVERED ? 'w-full' : 'w-1/2'}`}></div>
                      </div>
                      <p className="text-xs text-slate-400 mt-4 text-center">Estimation : {foundPackage.estimatedDeliveryTime}</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
