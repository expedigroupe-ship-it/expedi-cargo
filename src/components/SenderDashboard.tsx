
import React, { useState, useEffect, useRef } from 'react';
import { User, Package, PackageStatus, CITIES, PaymentMethod, PAYMENT_METHODS, ServiceLevel, AppNotification, PricingConfig } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { PaymentModal } from './PaymentModal';
import { sendTrackingSMS } from '../services/smsService';
import { Plus, History, Box, MapPin, Clock, Phone, Zap, Gauge, Leaf, Navigation, Ruler, Bell, Search, Truck, QrCode, X, User as UserIcon, Scale, Layers, Gem, CreditCard } from 'lucide-react';

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
  const [foundCourier, setFoundCourier] = useState<User | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ originMarker?: any, destMarker?: any, line?: any, originIcon?: any, destIcon?: any }>({});
  const trackingMapRef = useRef<HTMLDivElement>(null);
  const trackingMapInstance = useRef<any>(null);

  const [newPkg, setNewPkg] = useState({
    description: '',
    packageCount: 1,
    weightKg: 1,
    dimL: '', dimW: '', dimH: '',
    serviceLevel: ServiceLevel.STANDARD,
    originCity: 'Abidjan', 
    originCommune: '',
    originDetails: '', 
    senderName: user.name,
    senderPhone: user.phone,
    destinationCity: 'Abidjan',
    destinationCommune: '',
    destinationDetails: '', 
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
    if (view === 'CREATE' && mapContainerRef.current && !mapInstanceRef.current && newPkg.originCity === 'Abidjan') {
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
  }, [view, newPkg.originCity]);

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
        markers.originMarker = L.marker([origin.lat, origin.lng], { icon: markers.originIcon }).addTo(map).bindPopup("<b>Départ</b><br>" + newPkg.originCommune).openPopup();
        bounds.push([origin.lat, origin.lng]);
    }
    if (dest) {
        markers.destMarker = L.marker([dest.lat, dest.lng], { icon: markers.destIcon }).addTo(map).bindPopup("<b>Arrivée</b><br>" + newPkg.destinationCommune);
        bounds.push([dest.lat, dest.lng]);
    }
    if (origin && dest) {
        markers.line = L.polyline([[origin.lat, origin.lng], [dest.lat, dest.lng]], { color: '#ff6b00', weight: 3, dashArray: '5, 10' }).addTo(map);
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
    const l = parseFloat(newPkg.dimL) || 0;
    const w = parseFloat(newPkg.dimW) || 0;
    const h = parseFloat(newPkg.dimH) || 0;
    const volumetricWeight = (l * w * h) / 5000;
    const effectiveWeight = Math.max(newPkg.weightKg, volumetricWeight);
    let weightMultiplier = 1;
    if (effectiveWeight > 5 && effectiveWeight <= 20) { weightMultiplier = 1 + pricingConfig.weightSurchargeMedium; }
    else if (effectiveWeight > 20) { weightMultiplier = 1 + pricingConfig.weightSurchargeHeavy; }
    let pricePerUnit = basePrice * weightMultiplier;
    if (isHighValue && declaredValue) { pricePerUnit += Math.ceil((parseInt(declaredValue) || 0) * 0.05); }
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
    if (!isValidCIPhone(newPkg.senderPhone) || !isValidCIPhone(newPkg.recipientPhone)) return alert("Numéros invalides.");

    const trackingNumber = `EC-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullOrigin = `${newPkg.originCity}, ${newPkg.originCommune}, ${newPkg.originDetails}`;
    const fullDest = `${newPkg.destinationCity}, ${newPkg.destinationCommune}, ${newPkg.destinationDetails}`;

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
      createdAt: Date.now()
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
       {/* PAYMENT GATEWAY SIMULATION */}
       {showPayment && (
           <PaymentModal 
             amount={calculatedPrice} 
             phone={user.phone} 
             onSuccess={onPaymentSuccess} 
             onCancel={() => setShowPayment(false)} 
           />
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 border-b border-slate-700 pb-4">
               <h4 className="text-pureOrange text-xs font-bold uppercase flex items-center gap-2"><MapPin className="w-4 h-4" /> Trajet</h4>
               <div className="grid grid-cols-2 gap-4">
                  <Input label="Départ" as="select" options={[{label: 'Choisir...', value: ''}, ...COMMUNES_LIST.map(c => ({ label: c, value: c }))]} value={newPkg.originCommune} onChange={e => handleCommuneChange('ORIGIN', e.target.value)} />
                  <Input label="Arrivée" as="select" options={[{label: 'Choisir...', value: ''}, ...COMMUNES_LIST.map(c => ({ label: c, value: c }))]} value={newPkg.destinationCommune} onChange={e => handleCommuneChange('DEST', e.target.value)} />
               </div>
               <Input label="Adresse précise" placeholder="Quartier, porte..." value={newPkg.originDetails} onChange={e => setNewPkg({...newPkg, originDetails: e.target.value})} required />
            </div>

            <div className="space-y-4 border-b border-slate-700 pb-4">
               <h4 className="text-pureOrange text-xs font-bold uppercase flex items-center gap-2"><Box className="w-4 h-4" /> Détails</h4>
               <Input label="Description" value={newPkg.description} onChange={e => setNewPkg({...newPkg, description: e.target.value})} required />
               <div className="grid grid-cols-2 gap-4">
                   <Input label="Poids (kg)" type="number" value={newPkg.weightKg} onChange={e => setNewPkg({...newPkg, weightKg: parseFloat(e.target.value)})} />
                   <Input label="Type" as="select" options={[{label:'Autre', value:'OTHER'}, {label:'Doc', value:'DOCUMENT'}, {label:'Appareil', value:'DEVICE'}]} value={packageType} onChange={e => setPackageType(e.target.value as any)} />
               </div>
            </div>

            <div className="space-y-3">
               <Input label="Moyen de paiement" as="select" options={PAYMENT_METHODS} value={newPkg.paymentMethod} onChange={e => setNewPkg({...newPkg, paymentMethod: e.target.value as PaymentMethod})} />
               {newPkg.paymentMethod !== PaymentMethod.CASH && (
                   <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
                       <CreditCard className="text-blue-400 w-5 h-5" />
                       <p className="text-[10px] text-blue-300">Paiement sécurisé par passerelle Mobile Money.</p>
                   </div>
               )}
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between shadow-lg sticky bottom-20 z-10">
                <div>
                    <p className="text-xs text-slate-400 mb-1">Total</p>
                    <p className="text-2xl font-bold text-pureOrange">{calculatedPrice} FCFA</p>
                </div>
                <Button type="submit" className="px-8">Commander</Button>
            </div>
          </form>
        </div>
      )} 
      
      {view === 'LIST' && (
        <div className="space-y-4">
          {myPackages.map(pkg => (
              <div key={pkg.id} className="bg-midnightLight p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-white text-sm">{pkg.description}</span>
                      <span className="text-pureOrange font-bold text-sm">{pkg.price} F</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                       <p className="text-[10px] text-slate-500">{pkg.trackingNumber}</p>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pkg.status === PackageStatus.DELIVERED ? 'border-green-500 text-green-500' : 'border-blue-500 text-blue-500'}`}>{pkg.status}</span>
                  </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
};
