
import React, { useState } from 'react';
import { Logo } from './Logo';
import { Button } from './Button';
import { Input } from './Input';
import { User, UserRole, VEHICLE_TYPES, CITIES, Package, PackageStatus } from '../types';
import { DatabaseService } from '../services/database';
import { 
  ArrowRight, Search, ChevronLeft, Zap, Box, MapPin, 
  ShieldCheck, Smartphone, UserCircle2, Building2, Truck, 
  History, Info, CheckCircle2, Lock
} from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  checkUserExists: (phone: string) => boolean;
  users: User[]; 
  packages?: Package[];
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'TRACKING';
type RegisterStep = 'ROLE' | 'DETAILS' | 'VEHICLE' | 'DOCS' | 'FINISH';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, users, packages = [] }) => {
  const [view, setView] = useState<AuthMode>('LOGIN');
  const [role, setRole] = useState<UserRole>(UserRole.SENDER);
  const [step, setStep] = useState<RegisterStep>('ROLE');
  
  // States pour le suivi
  const [trackingId, setTrackingId] = useState('');
  const [foundPackage, setFoundPackage] = useState<Package | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', 
    courierType: 'INDEPENDENT' as 'STANDARD' | 'INDEPENDENT',
    operatingCity: 'Abidjan', vehicleType: 'MOTO' as any,
    vehiclePlate: '', idCardNumber: '', licenseNumber: '',
    acceptTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.phone === formData.phone && u.password === formData.password);
    if (user) {
        onLogin(user);
    } else {
        setError("Identifiants incorrects ou compte inexistant.");
    }
  };

  const validateAndNext = async () => {
    setError('');
    if (step === 'DETAILS') {
        if (!formData.name || !formData.phone || !formData.password) return setError("Veuillez remplir tous les champs.");
        if (await DatabaseService.isPhoneTaken(formData.phone)) return setError("Ce numéro de téléphone est déjà utilisé.");
        setStep(role === UserRole.COURIER ? 'VEHICLE' : 'FINISH');
    } else if (step === 'VEHICLE') {
        if (!formData.vehiclePlate) return setError("Plaque d'immatriculation requise.");
        setStep('DOCS');
    } else if (step === 'DOCS') {
        if (!formData.idCardNumber || !formData.licenseNumber) return setError("Numéros de documents requis.");
        setStep('FINISH');
    }
  };

  const handleRegister = async () => {
    if (!formData.acceptTerms) return setError("Veuillez accepter les conditions.");
    setLoading(true);
    
    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        role: role,
        walletBalance: role === UserRole.COURIER ? 0 : undefined,
        earningsBalance: role === UserRole.COURIER ? 0 : undefined,
        courierDetails: role === UserRole.COURIER ? {
            courierType: formData.courierType,
            operatingCity: formData.operatingCity,
            idCardNumber: formData.idCardNumber,
            licenseNumber: formData.licenseNumber,
            vehiclePlate: formData.vehiclePlate.toUpperCase(),
            vehicleType: formData.vehicleType,
            address: 'Abidjan, CI',
            photoUrl: '',
            isAvailable: true
        } : undefined
    };

    await DatabaseService.saveUser(newUser);
    onLogin(newUser);
  };

  if (view === 'TRACKING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-midnight pt-12">
        <div className="mb-10 cursor-pointer" onClick={() => setView('LOGIN')}><Logo /></div>
        <div className="w-full max-w-md bg-midnightLight/50 p-6 rounded-3xl border border-slate-800 animate-fade-in-up">
           <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Search className="text-pureOrange" /> Suivi Live</h2>
           <div className="flex gap-2 mb-8">
              <input 
                className="flex-1 bg-midnight border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-pureOrange text-sm font-bold uppercase" 
                placeholder="EC-XXXXXX" 
                value={trackingId} 
                onChange={(e) => setTrackingId(e.target.value)} 
              />
              <Button onClick={() => {
                  const pkg = packages.find(p => p.trackingNumber.toUpperCase() === trackingId.toUpperCase());
                  setFoundPackage(pkg || null);
                  if(!pkg) setError("Colis introuvable.");
              }}>Suivre</Button>
           </div>
           
           {foundPackage ? (
               <div className="space-y-6 animate-fade-in">
                   <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase">Tracking</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-pureOrange/10 text-pureOrange border border-pureOrange/20 font-bold">{foundPackage.status}</span>
                        </div>
                        <p className="font-bold text-white">{foundPackage.trackingNumber}</p>
                   </div>
                   <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
                       {foundPackage.statusHistory.slice().reverse().map((h, i) => (
                           <div key={i} className="relative">
                               <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-midnight ${i === 0 ? 'bg-pureOrange' : 'bg-slate-700'}`}></div>
                               <p className={`text-xs font-bold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>{h.status}</p>
                               <p className="text-[10px] text-slate-600">{new Date(h.timestamp).toLocaleString()}</p>
                           </div>
                       ))}
                   </div>
               </div>
           ) : error && <p className="text-center text-red-500 text-xs">{error}</p>}

           <button onClick={() => setView('LOGIN')} className="mt-8 text-xs font-bold text-slate-500 w-full text-center hover:text-white transition-colors">Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-midnight text-white">
        <div className="mb-8"><Logo /></div>
        
        <div className="w-full max-w-md bg-midnightLight/50 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
            {view === 'LOGIN' ? (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-black mb-2">Connexion</h2>
                    <p className="text-sm text-slate-500 mb-8">Accédez à votre espace EXPEDI-CARGO.</p>
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input label="Téléphone" placeholder="07xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                        <Input label="Mot de passe" type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                        <Button fullWidth type="submit" size="lg">Se connecter <ArrowRight className="w-4 h-4"/></Button>
                    </form>

                    <div className="mt-8 flex flex-col gap-3">
                        <button onClick={() => setView('REGISTER')} className="text-sm text-slate-400 hover:text-pureOrange transition-colors">Créer un nouveau compte</button>
                        <button onClick={() => setView('TRACKING')} className="text-sm text-slate-400 hover:text-pureOrange transition-colors flex items-center justify-center gap-2"><Search className="w-4 h-4"/> Suivi rapide de colis</button>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => step === 'ROLE' ? setView('LOGIN') : setStep('ROLE')} className="p-2 hover:bg-slate-800 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                        <h2 className="text-xl font-bold">Inscription</h2>
                    </div>

                    {step === 'ROLE' && (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-sm text-slate-400 mb-6">Quel est votre profil d'utilisation ?</p>
                            <div onClick={() => { setRole(UserRole.SENDER); setStep('DETAILS'); }} className="p-5 bg-midnight border border-slate-700 rounded-2xl cursor-pointer hover:border-pureOrange transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-pureOrange/10 rounded-xl group-hover:bg-pureOrange group-hover:text-white transition-all"><UserCircle2 className="w-6 h-6 text-pureOrange group-hover:text-white"/></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold">Expéditeur</h4>
                                        <p className="text-[10px] text-slate-500">J'envoie des colis à Abidjan & Korhogo</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </div>
                            <div onClick={() => { setRole(UserRole.COURIER); setFormData({...formData, courierType: 'INDEPENDENT'}); setStep('DETAILS'); }} className="p-5 bg-midnight border border-slate-700 rounded-2xl cursor-pointer hover:border-blue-500 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all"><Zap className="w-6 h-6 text-blue-500 group-hover:text-white"/></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold">Livreur Indépendant</h4>
                                        <p className="text-[10px] text-slate-500">Je livre avec mon propre véhicule</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </div>
                            <div onClick={() => { setRole(UserRole.COURIER); setFormData({...formData, courierType: 'STANDARD'}); setStep('DETAILS'); }} className="p-5 bg-midnight border border-slate-700 rounded-2xl cursor-pointer hover:border-green-500 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all"><Building2 className="w-6 h-6 text-green-500 group-hover:text-white"/></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold">Livreur Entreprise</h4>
                                        <p className="text-[10px] text-slate-500">Membre d'une flotte professionnelle</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'DETAILS' && (
                        <div className="space-y-4 animate-fade-in">
                            <Input label="Nom complet" placeholder="Ex: Jean Kouassi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <Input label="Téléphone (Identifiant)" placeholder="07xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            <Input label="Mot de passe" type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            {error && <p className="text-red-500 text-[10px] text-center">{error}</p>}
                            <Button fullWidth onClick={validateAndNext}>Suivant <ArrowRight className="w-4 h-4"/></Button>
                        </div>
                    )}

                    {step === 'VEHICLE' && (
                        <div className="space-y-4 animate-fade-in">
                            <Input label="Type de Véhicule" as="select" options={VEHICLE_TYPES} value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value as any})} />
                            <Input label="Plaque d'immatriculation" placeholder="Ex: 1234AB01" value={formData.vehiclePlate} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} />
                            <Input label="Ville d'activité principale" as="select" options={CITIES.map(c => ({label: c, value: c}))} value={formData.operatingCity} onChange={e => setFormData({...formData, operatingCity: e.target.value})} />
                            {error && <p className="text-red-500 text-[10px] text-center">{error}</p>}
                            <Button fullWidth onClick={validateAndNext}>Suivant <ArrowRight className="w-4 h-4"/></Button>
                        </div>
                    )}

                    {step === 'DOCS' && (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-[10px] text-slate-500 uppercase font-black mb-4">Authenticité du compte</p>
                            <Input label="N° Carte d'Identité (CNI)" placeholder="Ex: 0012345678" value={formData.idCardNumber} onChange={e => setFormData({...formData, idCardNumber: e.target.value})} />
                            <Input label="N° Permis de Conduire" placeholder="Ex: P-12345-CI" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
                            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 flex items-start gap-3">
                                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-slate-400">Vos documents seront vérifiés par notre équipe de sécurité sous 24h.</p>
                            </div>
                            {error && <p className="text-red-500 text-[10px] text-center">{error}</p>}
                            <Button fullWidth onClick={validateAndNext}>Suivant <ArrowRight className="w-4 h-4"/></Button>
                        </div>
                    )}

                    {step === 'FINISH' && (
                        <div className="space-y-6 animate-fade-in text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h4 className="text-lg font-bold">Presque terminé !</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Pour finaliser votre inscription sur <span className="text-pureOrange font-bold">EXPEDI-CARGO</span>, veuillez accepter nos conditions.
                            </p>
                            
                            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 text-left max-h-40 overflow-y-auto no-scrollbar text-[9px] text-slate-500 space-y-3">
                                <p className="font-bold text-slate-300">Conditions Générales d'Utilisation</p>
                                <p>1. Expédition : Tout colis doit être légal et ne pas contenir de substances illicites.</p>
                                <p>2. Livraison : Les livreurs s'engagent à respecter les délais et l'intégrité des colis.</p>
                                <p>3. Responsabilité : La plateforme connecte les usagers mais ne peut être tenue responsable des dommages causés par des tiers.</p>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-pureOrange rounded-lg" 
                                    checked={formData.acceptTerms} 
                                    onChange={e => setFormData({...formData, acceptTerms: e.target.checked})} 
                                />
                                <span className="text-[10px] text-slate-400 text-left group-hover:text-white transition-colors">J'accepte les conditions d'utilisation et la politique de confidentialité.</span>
                            </label>

                            {error && <p className="text-red-500 text-[10px]">{error}</p>}
                            <Button fullWidth isLoading={loading} onClick={handleRegister}>Terminer l'inscription</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <p className="mt-8 text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Lock className="w-3 h-3" /> Chiffrement SSL 256-bit Activé
        </p>
    </div>
  );
};
