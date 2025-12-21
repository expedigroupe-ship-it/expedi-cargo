import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { Button } from './Button';
import { Input } from './Input';
import { User, UserRole, VEHICLE_TYPES, CITIES, Package } from '../types';
import { UserCircle2, Truck, ArrowRight, Search, ChevronLeft, Zap, Box, Percent, MapPin, KeyRound, Shield, FileText, HelpCircle, ScanBarcode, QrCode, Phone, User as UserIcon, X } from 'lucide-react';

declare const L: any;

interface AuthScreenProps {
  onLogin: (user: User) => void;
  checkUserExists: (phone: string, email?: string) => boolean;
  users: User[]; 
  packages?: Package[]; // Passage des colis pour le suivi public
}

type InfoPage = 'NONE' | 'TERMS' | 'PRIVACY' | 'HELP' | 'FAQ';
type AuthMode = 'LOGIN' | 'REGISTER' | 'RECOVERY';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, checkUserExists, users, packages = [] }) => {
  const [view, setView] = useState<'AUTH' | 'TRACKING'>('AUTH');
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [role, setRole] = useState<UserRole>(UserRole.SENDER);
  const [rememberMe, setRememberMe] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Scanner Login State
  const [showLoginScanner, setShowLoginScanner] = useState(false);
  const [scanInput, setScanInput] = useState('');
  
  // Tracking State
  const [trackingId, setTrackingId] = useState('');
  const [foundPackage, setFoundPackage] = useState<Package | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  
  // Map Refs
  const trackMapRef = useRef<HTMLDivElement>(null);
  const trackMapInstance = useRef<any>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [infoPage, setInfoPage] = useState<InfoPage>('NONE');
  
  const [formData, setFormData] = useState({
    identifier: '', phone: '', password: '', name: '', email: '',
    courierType: 'INDEPENDENT', operatingCity: 'Abidjan',
    idCardNumber: '', licenseNumber: '', vehiclePlate: '', vehicleType: 'MOTO', address: '', photoFile: null as File | null,
  });

  const isValidCIPhone = (phone: string) => /^(01|05|07)\d{8}$/.test(phone.replace(/\s/g, ''));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrorMsg(null); setSuccessMsg(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFormData({ ...formData, photoFile: e.target.files[0] });
  };

  // --- MAP LOGIC FOR TRACKING ---
  useEffect(() => {
      if (view === 'TRACKING' && foundPackage && trackMapRef.current && !trackMapInstance.current) {
          trackMapInstance.current = L.map(trackMapRef.current).setView([5.34, -4.02], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(trackMapInstance.current);
          
          // Simulation coords si non stockées précises (pour démo)
          const startLat = 5.34 + (Math.random() * 0.04);
          const startLng = -4.02 + (Math.random() * 0.04);
          const endLat = 5.34 - (Math.random() * 0.04);
          const endLng = -4.02 - (Math.random() * 0.04);

          L.marker([startLat, startLng]).addTo(trackMapInstance.current).bindPopup("<b>Départ</b><br/>" + foundPackage.originAddress).openPopup();
          L.marker([endLat, endLng]).addTo(trackMapInstance.current).bindPopup("<b>Arrivée</b><br/>" + foundPackage.destinationAddress);
          L.polyline([[startLat, startLng], [endLat, endLng]], { color: '#ff6b00', dashArray: '5, 10' }).addTo(trackMapInstance.current);
          trackMapInstance.current.fitBounds([[startLat, startLng], [endLat, endLng]], { padding: [50, 50] });
      }
      return () => {
          if (view !== 'TRACKING' && trackMapInstance.current) {
              trackMapInstance.current.remove();
              trackMapInstance.current = null;
          }
      };
  }, [view, foundPackage]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setFoundPackage(null);

    const pkg = packages.find(p => p.trackingNumber.trim() === trackingId.trim());
    if (pkg) {
        setFoundPackage(pkg);
    } else {
        setTrackError("Numéro de suivi introuvable. Vérifiez le format EC-xxxxxx.");
    }
  };

  const handleQrLogin = (jsonString: string) => {
      try {
          const data = JSON.parse(jsonString);
          if (data.action === 'LOGIN' && data.phone && data.password) {
              const foundUser = users.find(u => u.phone === data.phone && u.password === data.password);
              if (foundUser) {
                  onLogin(foundUser);
                  setShowLoginScanner(false);
              } else {
                  alert("Code QR invalide ou utilisateur introuvable.");
              }
          } else {
              alert("Format du QR Code incorrect.");
          }
      } catch (e) {
          alert("Erreur de lecture du code.");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null); setSuccessMsg(null);

    if (mode === 'RECOVERY') {
        if (!formData.identifier) return setErrorMsg("Numéro requis.");
        setSuccessMsg(`Code envoyé à ${formData.identifier}.`);
        setTimeout(() => { setMode('LOGIN'); setSuccessMsg(null); }, 3000);
        return;
    }

    if (mode === 'LOGIN') {
        const foundUser = users.find(u => {
            const id = formData.identifier.trim();
            return (u.phone.trim() === id || (u.email && u.email === id)) && u.password === formData.password;
        });
        if (foundUser) onLogin(foundUser);
        else setErrorMsg("Identifiants incorrects.");
    }

    if (mode === 'REGISTER') {
        if (!termsAccepted) return setErrorMsg("Acceptez les conditions.");
        if (!isValidCIPhone(formData.phone)) return setErrorMsg("Numéro invalide.");
        if (checkUserExists(formData.phone, formData.email)) return setErrorMsg("Compte existant.");

        const newUser: User = {
            id: Math.random().toString(36).substr(2, 9),
            name: formData.name.trim() || 'Utilisateur',
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            password: formData.password,
            role: role,
            walletBalance: 0,
            courierDetails: role === UserRole.COURIER ? {
                courierType: formData.courierType as 'STANDARD' | 'INDEPENDENT',
                operatingCity: formData.operatingCity,
                idCardNumber: formData.idCardNumber, licenseNumber: formData.licenseNumber,
                vehiclePlate: formData.vehiclePlate, vehicleType: formData.vehicleType as any,
                address: formData.address, photoUrl: formData.photoFile ? URL.createObjectURL(formData.photoFile) : 'https://picsum.photos/200',
                isAvailable: true
            } : undefined
        };
        onLogin(newUser);
    }
  };

  const renderCourierInfo = (courierId?: string) => {
      if (!courierId) return null;
      const courier = users.find(u => u.id === courierId);
      if (!courier) return null;
      
      return (
          <div className="mt-3 bg-slate-800 p-3 rounded-lg border border-slate-600 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-500">
                   {courier.courierDetails?.photoUrl ? (
                       <img src={courier.courierDetails.photoUrl} alt="Livreur" className="w-full h-full object-cover" />
                   ) : (
                       <UserIcon className="w-full h-full p-2 text-slate-400" />
                   )}
               </div>
               <div className="flex-1">
                   <p className="text-sm font-bold text-white">{courier.name}</p>
                   <p className="text-xs text-pureOrange flex items-center gap-1">
                       <Truck className="w-3 h-3" /> 
                       {courier.courierDetails?.vehicleType} - {courier.courierDetails?.vehiclePlate}
                   </p>
               </div>
               <a href={`tel:${courier.phone}`} className="p-2 bg-green-600 rounded-full text-white">
                   <Phone className="w-4 h-4" />
               </a>
          </div>
      );
  };

  const getInfoTitle = () => {
      switch(infoPage) {
          case 'TERMS': return "Conditions d'Utilisation";
          case 'PRIVACY': return "Politique de Confidentialité";
          case 'FAQ': return "Foire Aux Questions";
          case 'HELP': return "Aide & Support";
          default: return "Informations";
      }
  };

  const renderInfoContent = () => {
    if (infoPage === 'TERMS') {
        return (
            <div className="space-y-4 text-sm text-slate-300">
                <p>Bienvenue sur EXPEDI-CARGO. En utilisant notre application, vous acceptez les conditions suivantes :</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Objets Interdits :</strong> Il est strictement interdit d'expédier des produits illicites, armes, drogues, ou matières dangereuses. EXPEDI-CARGO se réserve le droit d'inspecter les colis suspects.</li>
                    <li><strong>Responsabilité :</strong> Les livreurs indépendants sont responsables de la sécurité des colis durant le trajet. En cas de perte ou de dommage avéré, l'assurance (si souscrite) s'applique.</li>
                    <li><strong>Paiements :</strong> Les paiements doivent être effectués via les canaux officiels ou en espèces à la livraison. Une commission de 5% est prélevée sur chaque course effectuée par les livreurs.</li>
                    <li><strong>Annulation :</strong> Toute annulation abusive après prise en charge peut entraîner des pénalités sur le compte de l'utilisateur.</li>
                </ul>
            </div>
        );
    }
    if (infoPage === 'PRIVACY') {
        return (
            <div className="space-y-4 text-sm text-slate-300">
                <p>La protection de vos données est notre priorité. Voici comment nous traitons vos informations :</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Collecte :</strong> Nous collectons votre nom, téléphone, et localisation pour permettre le service de livraison. Pour les livreurs, nous collectons également les documents d'identité et de véhicule.</li>
                    <li><strong>Utilisation :</strong> Vos données ne sont utilisées que pour connecter expéditeurs et livreurs. Nous ne vendons pas vos données à des tiers.</li>
                    <li><strong>Sécurité :</strong> Vos informations sont stockées de manière sécurisée. Les mots de passe sont cryptés.</li>
                    <li><strong>Géolocalisation :</strong> L'accès à la localisation est requis pour le suivi des colis en temps réel.</li>
                </ul>
            </div>
        );
    }
    // Default for FAQ/HELP (handled nicely via other components if needed, or text here)
    return (
        <div className="text-sm text-slate-300 space-y-3">
           <p>Pour toute question ou assistance, veuillez contacter notre support client directement via l'application une fois connecté, ou par email à support@expedi-cargo.ci.</p>
        </div>
    );
  };

  if (infoPage !== 'NONE') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-start pt-10 p-6 bg-midnight text-white animate-fade-in">
             <button onClick={() => setInfoPage('NONE')} className="self-start flex items-center gap-2 text-slate-400 mb-6 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5"/> Retour</button>
             <div className="w-full max-w-lg bg-midnightLight p-8 rounded-2xl border border-slate-700 shadow-2xl overflow-y-auto max-h-[80vh]">
                 <div className="flex justify-center pb-4 border-b border-slate-700 mb-6"><Logo size="sm" /></div>
                 <h3 className="text-2xl font-bold text-pureOrange mb-6">{getInfoTitle()}</h3>
                 {renderInfoContent()}
                 <div className="mt-8 pt-4 border-t border-slate-700 text-center">
                    <Button onClick={() => setInfoPage('NONE')} fullWidth variant="secondary">J'ai compris</Button>
                 </div>
             </div>
        </div>
      );
  }

  if (view === 'TRACKING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-midnight text-white">
         <div className="mb-8 cursor-pointer" onClick={() => setView('AUTH')}><Logo /></div>
        <div className="w-full max-w-md bg-midnightLight/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-2xl animate-fade-in-up">
           <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Search className="text-pureOrange" /> Suivre un colis</h2>
           <form onSubmit={handleTrack} className="flex gap-2 mb-4">
              <input className="flex-1 bg-midnight border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-pureOrange" placeholder="Numéro EC-..." value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
              <Button type="submit">Rechercher</Button>
           </form>
           
           {trackError && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-sm mb-4">{trackError}</div>}

           {foundPackage && (
               <div className="space-y-4 animate-fade-in">
                   <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-pureOrange flex justify-between items-center">
                       <div>
                           <p className="font-bold text-white">{foundPackage.trackingNumber}</p>
                           <p className="text-xs text-slate-400">{foundPackage.description}</p>
                       </div>
                       <span className="bg-blue-600 px-2 py-1 rounded text-xs font-bold">{foundPackage.status}</span>
                   </div>
                   
                   {renderCourierInfo(foundPackage.courierId)}

                   <div className="h-48 bg-slate-900 rounded-lg overflow-hidden relative" ref={trackMapRef}></div>

                   <div className="text-sm space-y-2">
                       <div className="flex gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"/><div><p className="text-xs text-slate-500">Départ</p><p>{foundPackage.originAddress}</p></div></div>
                       <div className="flex gap-2"><div className="w-2 h-2 rounded-full bg-pureOrange mt-1.5"/><div><p className="text-xs text-slate-500">Arrivée</p><p>{foundPackage.destinationAddress}</p></div></div>
                   </div>
               </div>
           )}

           <button onClick={() => setView('AUTH')} className="mt-6 text-sm text-slate-400 hover:text-white w-full text-center">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-midnight text-white relative">
      
      {/* SCANNER OVERLAY FOR LOGIN */}
       {showLoginScanner && (
           <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
               <button onClick={() => setShowLoginScanner(false)} className="absolute top-4 right-4 text-white p-2">
                   <X className="w-8 h-8" />
               </button>
               
               <div className="text-white text-center mb-8">
                   <h2 className="text-2xl font-bold mb-2">Scanner QR Connexion</h2>
                   <p className="text-sm text-slate-400">Placez le QR Code de votre profil dans le cadre</p>
               </div>

               {/* Scanner Frame */}
               <div className="relative w-64 h-64 border-2 border-pureOrange rounded-3xl overflow-hidden mb-8 shadow-[0_0_50px_rgba(255,107,0,0.3)]">
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pureOrange/20 to-transparent animate-pulse z-10"></div>
                   <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                       <QrCode className="w-32 h-32 text-slate-700 opacity-50" />
                   </div>
                   <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-pureOrange"></div>
                   <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-pureOrange"></div>
                   <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-pureOrange"></div>
                   <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-pureOrange"></div>
               </div>

               {/* Manual Entry Simulation for Demo */}
               <div className="w-full max-w-xs space-y-4 px-4">
                   <p className="text-center text-xs text-slate-500 mb-2">Simulation (Copiez le JSON du profil)</p>
                   <div className="flex gap-2">
                       <input 
                         className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-pureOrange focus:outline-none text-xs"
                         placeholder='{"action":"LOGIN" ...}'
                         value={scanInput}
                         onChange={(e) => setScanInput(e.target.value)}
                       />
                       <button onClick={() => handleQrLogin(scanInput)} className="bg-pureOrange p-2 rounded-lg text-white font-bold text-xs">OK</button>
                   </div>
               </div>
           </div>
       )}

      <div className="flex-1 w-full flex flex-col items-center justify-center max-w-md">
          <div className="mb-6 animate-fade-in-down"><Logo /></div>

          <div className="w-full bg-midnightLight/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-2xl mb-8">
            {mode !== 'RECOVERY' && (
                <>
                <button type="button" onClick={() => setView('TRACKING')} className="w-full py-2 mb-2 border border-slate-700 rounded-lg bg-midnight/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-semibold">
                <Search className="w-4 h-4 text-pureOrange" /> Suivre un colis
                </button>
                <div className="flex justify-center mb-6 bg-midnight p-1 rounded-lg">
                <button onClick={() => { setMode('LOGIN'); setErrorMsg(null); }} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'LOGIN' ? 'bg-pureOrange text-white' : 'text-slate-400'}`}>Connexion</button>
                <button onClick={() => { setMode('REGISTER'); setErrorMsg(null); }} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'REGISTER' ? 'bg-pureOrange text-white' : 'text-slate-400'}`}>Inscription</button>
                </div>
                </>
            )}

            {mode === 'RECOVERY' && (
                <div className="mb-6 text-center">
                    <div className="bg-pureOrange/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><KeyRound className="w-6 h-6 text-pureOrange" /></div>
                    <h2 className="text-xl font-bold text-white">Mot de passe oublié</h2>
                </div>
            )}

            {errorMsg && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm text-center">{errorMsg}</div>}
            {successMsg && <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm text-center">{successMsg}</div>}

            {mode === 'REGISTER' && (
              <div className="flex gap-4 mb-6">
                <div onClick={() => setRole(UserRole.SENDER)} className={`flex-1 cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${role === UserRole.SENDER ? 'border-pureOrange bg-pureOrange/10' : 'border-slate-700 opacity-50'}`}><UserCircle2 className="w-8 h-8 text-pureOrange" /><span className="text-xs font-bold uppercase">Expéditeur</span></div>
                <div onClick={() => setRole(UserRole.COURIER)} className={`flex-1 cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${role === UserRole.COURIER ? 'border-pureOrange bg-pureOrange/10' : 'border-slate-700 opacity-50'}`}><Truck className="w-8 h-8 text-pureOrange" /><span className="text-xs font-bold uppercase">Livreur</span></div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              {(mode === 'LOGIN' || mode === 'RECOVERY') && <Input label="Téléphone ou Email" name="identifier" placeholder="Entrez votre numéro ou email" value={formData.identifier} onChange={handleChange} required />}

              {mode === 'REGISTER' && (
                <>
                    <Input label="Nom & Prénoms" name="name" placeholder="Ex: Kouassi Jean" value={formData.name} onChange={handleChange} required />
                    <Input label="Numéro de Téléphone" name="phone" type="tel" placeholder="Ex: 0707070707" value={formData.phone} onChange={handleChange} required />
                    <Input label="Email (Optionnel)" name="email" type="email" placeholder="Ex: jean@email.com" value={formData.email} onChange={handleChange} />
                </>
              )}

              {mode !== 'RECOVERY' && <Input label="Mot de passe" name="password" type="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />}

              {mode === 'LOGIN' && (
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><input type="checkbox" id="remember" className="w-4 h-4 accent-pureOrange" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">Se rappeler de moi</label></div>
                  <button type="button" onClick={() => { setMode('RECOVERY'); setErrorMsg(null); }} className="text-sm text-pureOrange hover:text-pureOrangeHover hover:underline">Mot de passe oublié ?</button>
                </div>
              )}

              {mode === 'REGISTER' && role === UserRole.COURIER && (
                <div className="space-y-3 mt-2 border-t border-slate-700 pt-4">
                  <h3 className="text-pureOrange text-sm font-bold uppercase tracking-wide">Infos Livreur</h3>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 mb-3">
                      <label className="block text-xs text-slate-400 mb-2 font-bold uppercase">Type de Livreur *</label>
                      <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="courierType" value="INDEPENDENT" checked={formData.courierType === 'INDEPENDENT'} onChange={handleChange} className="accent-pureOrange w-4 h-4"/><span className="text-sm">Livreur Indépendant</span></label>
                          <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="courierType" value="STANDARD" checked={formData.courierType === 'STANDARD'} onChange={handleChange} className="accent-pureOrange w-4 h-4"/><span className="text-sm">Livreur (Entreprise/Standard)</span></label>
                      </div>
                  </div>
                  
                  {/* PHOTO DE PROFIL AJOUTÉE */}
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-600 mb-3">
                      <label className="block text-xs text-slate-400 mb-2 font-bold uppercase">Photo de Profil *</label>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pureOrange file:text-white hover:file:bg-pureOrangeHover"/>
                  </div>

                  {formData.courierType === 'INDEPENDENT' && <Input label="Ville d'exercice" as="select" name="operatingCity" options={CITIES.map(c => ({ label: c, value: c }))} value={formData.operatingCity} onChange={handleChange} />}
                  <Input label="Numéro CNI" name="idCardNumber" placeholder="CI00..." value={formData.idCardNumber} onChange={handleChange} required />
                  <Input label="Numéro de permis" name="licenseNumber" placeholder="P-123..." value={formData.licenseNumber} onChange={handleChange} required />
                  <Input label="Type d'engin" as="select" name="vehicleType" options={VEHICLE_TYPES} value={formData.vehicleType} onChange={handleChange} />
                  <Input label="Plaque d'immatriculation" name="vehiclePlate" placeholder="Ex: 1234 AB 01" value={formData.vehiclePlate} onChange={handleChange} required />
                  
                  {/* ADRESSE DETAILLEE DANS UN BLOC (Onglet) */}
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-600">
                     <label className="block text-xs text-slate-400 mb-2 font-bold uppercase flex items-center gap-2"><MapPin className="w-3 h-3"/> Adresse Complète</label>
                     <Input 
                        label="" 
                        name="address" 
                        as="textarea"
                        placeholder="Quartier, Point de repère, Rue, Porte..." 
                        value={formData.address} 
                        onChange={handleChange} 
                        required 
                        className="text-sm min-h-[80px]"
                     />
                  </div>
                </div>
              )}
              
              {mode === 'REGISTER' && (
                <div className="flex items-start gap-2 mt-2 mb-2"><input type="checkbox" id="terms" className="mt-1 w-4 h-4 accent-pureOrange shrink-0" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} /><label htmlFor="terms" className="text-xs text-slate-400 cursor-pointer leading-tight">J'accepte les <span onClick={(e) => { e.preventDefault(); setInfoPage('TERMS'); }} className="text-pureOrange font-bold hover:underline">conditions d'utilisation</span>.</label></div>
              )}

              <div className="mt-4 space-y-3">
                <Button fullWidth type="submit">{mode === 'LOGIN' ? 'Se Connecter' : mode === 'REGISTER' ? "S'inscrire" : 'Recevoir le code'} {mode !== 'RECOVERY' && <ArrowRight className="w-4 h-4" />}</Button>
                
                {mode === 'LOGIN' && (
                    <button 
                        type="button"
                        onClick={() => { setShowLoginScanner(true); setScanInput(''); }}
                        className="w-full py-2 flex items-center justify-center gap-2 text-pureOrange border border-pureOrange rounded-xl hover:bg-pureOrange/10 font-bold"
                    >
                        <ScanBarcode className="w-5 h-5" /> Scanner pour se connecter
                    </button>
                )}

                {mode === 'RECOVERY' && <button type="button" onClick={() => { setMode('LOGIN'); setErrorMsg(null); }} className="w-full py-2 text-sm text-slate-400 hover:text-white">Retour à la connexion</button>}
              </div>
            </form>
          </div>
          
          <div className="w-full text-center pb-2 flex flex-col items-center">
              {/* LIENS INFORMATIFS */}
              <div className="flex gap-4 text-[10px] text-slate-500 mb-2 flex-wrap justify-center">
                <button onClick={() => setInfoPage('TERMS')} className="hover:text-pureOrange">CGU</button>
                <button onClick={() => setInfoPage('PRIVACY')} className="hover:text-pureOrange">Confidentialité</button>
                <button onClick={() => setInfoPage('FAQ')} className="hover:text-pureOrange">FAQ</button>
                <button onClick={() => setInfoPage('HELP')} className="hover:text-pureOrange">Aide</button>
              </div>
              <div className="text-[10px] text-slate-600 font-medium flex gap-2">
                 <span>© 2025 EXPEDI-CARGO</span>
                 <span>•</span>
                 <button onClick={() => { setFormData({...formData, identifier:'admin', password:'admin'}); setMode('LOGIN'); }} className="hover:text-pureOrange">Portail Admin</button>
              </div>
          </div>
      </div>
    </div>
  );
};