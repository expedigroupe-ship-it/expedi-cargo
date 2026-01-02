
import React, { useState } from 'react';
import { Logo } from './Logo';
import { Button } from './Button';
import { Input } from './Input';
import { User, UserRole, VEHICLE_TYPES, CITIES, Package } from '../types';
import { DatabaseService } from '../services/database';
import { 
  ArrowRight, Search, ChevronLeft, Zap, Box, 
  Smartphone, UserCircle2, Building2, 
  CheckCircle2, Lock, Camera, Eye, EyeOff, FileText,
  ShieldAlert
} from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User, remember: boolean) => void;
  users: User[]; 
  packages?: Package[];
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'TRACKING' | 'FORGOT_PASSWORD';
type RegisterStep = 'ROLE' | 'DETAILS' | 'PHOTO' | 'VEHICLE' | 'DOCS' | 'FINISH';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, users, packages = [] }) => {
  const [view, setView] = useState<AuthMode>('LOGIN');
  const [role, setRole] = useState<UserRole>(UserRole.SENDER);
  const [step, setStep] = useState<RegisterStep>('ROLE');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [trackingId, setTrackingId] = useState('');
  const [foundPackage, setFoundPackage] = useState<Package | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', 
    courierType: 'INDEPENDENT' as 'STANDARD' | 'INDEPENDENT',
    operatingCity: 'Abidjan', vehicleType: 'MOTO' as any,
    vehiclePlate: '', idCardNumber: '', licenseNumber: '',
    photoUrl: '', idPhotoUrl: '',
    acceptTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.phone === formData.phone && u.password === formData.password);
    if (user) {
        onLogin(user, rememberMe);
    } else {
        setError("Identifiants incorrects.");
    }
  };

  const findTracking = () => {
    setError('');
    const pkg = packages.find(p => p.trackingNumber.trim().toUpperCase() === trackingId.trim().toUpperCase());
    if (pkg) {
        setFoundPackage(pkg);
    } else {
        setError("Aucun colis trouvé avec ce numéro.");
        setFoundPackage(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoUrl' | 'idPhotoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateAndNext = async () => {
    setError('');
    if (step === 'DETAILS') {
        if (!formData.name || !formData.phone || !formData.password) return setError("Champs obligatoires.");
        if (await DatabaseService.isPhoneTaken(formData.phone)) return setError("Ce numéro est déjà utilisé.");
        setStep(role === UserRole.COURIER ? 'PHOTO' : 'FINISH');
    } else if (step === 'PHOTO') {
        if (!formData.photoUrl) return setError("Photo requise.");
        setStep('VEHICLE');
    } else if (step === 'VEHICLE') {
        if (!formData.vehiclePlate) return setError("Plaque d'immatriculation requise.");
        setStep('DOCS');
    } else if (step === 'DOCS') {
        if (!formData.idCardNumber) return setError("N° CNI requis.");
        if (!formData.licenseNumber) return setError("N° Permis de conduire requis.");
        if (!formData.idPhotoUrl) return setError("Justificatif requis.");
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
            address: 'Côte d\'Ivoire',
            photoUrl: formData.photoUrl,
            isAvailable: true
        } : undefined
    };

    await DatabaseService.saveUser(newUser);
    onLogin(newUser, true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-midnight text-white">
        <div className="mb-8"><Logo /></div>
        
        <div className="w-full max-w-md bg-midnightLight/50 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
            {view === 'LOGIN' ? (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-black mb-2">Connexion</h2>
                    <p className="text-sm text-slate-500 mb-8">EXPEDI-CARGO Logistique</p>
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input label="Téléphone" placeholder="07xxxxxxxx" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
                        <div className="relative">
                            <Input label="Mot de passe" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-500">
                                {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                            </button>
                        </div>
                        
                        <div className="flex justify-between items-center px-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 accent-pureOrange" />
                                <span className="text-[11px] text-slate-400">Se souvenir de moi</span>
                            </label>
                        </div>

                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                        <Button fullWidth type="submit" size="lg">Se connecter <ArrowRight className="w-4 h-4"/></Button>
                    </form>

                    <div className="mt-8 flex flex-col gap-3">
                        <button onClick={() => setView('TRACKING')} className="w-full bg-slate-800/50 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white hover:bg-slate-700 transition-colors border border-slate-700">
                            <Search className="w-4 h-4 text-pureOrange" /> Suivre un colis
                        </button>
                        <button onClick={() => setView('REGISTER')} className="text-sm text-slate-400 hover:text-pureOrange transition-colors text-center mt-2">Pas encore de compte ? Créer un compte</button>
                    </div>
                </div>
            ) : view === 'TRACKING' ? (
                <div className="animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => setView('LOGIN')} className="p-2 hover:bg-slate-800 rounded-full"><ChevronLeft className="w-5 h-5"/></button>
                        <h2 className="text-xl font-bold">Suivi express</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input 
                                className="w-full bg-midnight border border-slate-700 rounded-xl pl-10 pr-4 py-4 text-white uppercase text-sm font-black focus:border-pureOrange transition-all" 
                                placeholder="ENTREZ LE N° EC-XXXXXX"
                                value={trackingId}
                                onChange={e => setTrackingId(e.target.value)}
                            />
                        </div>
                        <Button fullWidth onClick={findTracking}>Suivre mon colis</Button>
                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
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
                            <p className="text-sm text-slate-400 mb-6">Quel est votre profil ?</p>
                            <div onClick={() => { setRole(UserRole.SENDER); setStep('DETAILS'); }} className="p-5 bg-midnight border border-slate-700 rounded-2xl cursor-pointer hover:border-pureOrange transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-pureOrange/10 rounded-xl group-hover:bg-pureOrange group-hover:text-white transition-all"><UserCircle2 className="w-6 h-6 text-pureOrange group-hover:text-white"/></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm">Expéditeur</h4>
                                        <p className="text-[10px] text-slate-500">J'envoie des colis</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </div>
                            <div onClick={() => { setRole(UserRole.COURIER); setFormData({...formData, courierType: 'INDEPENDENT'}); setStep('DETAILS'); }} className="p-5 bg-midnight border border-slate-700 rounded-2xl cursor-pointer hover:border-blue-500 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all"><Zap className="w-6 h-6 text-blue-500 group-hover:text-white"/></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm">Livreur Indépendant</h4>
                                        <p className="text-[10px] text-slate-500">Freelance / Particulier</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </div>
                            <div onClick={() => { setRole(UserRole.COURIER); setFormData({...formData, courierType: 'STANDARD'}); setStep('DETAILS'); }} className="p-5 bg-midnight border border-slate-700 rounded-2xl cursor-pointer hover:border-green-500 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all"><Building2 className="w-6 h-6 text-green-500 group-hover:text-white"/></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm">Livreur Entreprise</h4>
                                        <p className="text-[10px] text-slate-500">Flotte / Agence de livraison</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-700" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'DETAILS' && (
                        <div className="space-y-4 animate-fade-in">
                            <Input label={formData.courierType === 'STANDARD' ? "Nom de l'agence" : "Nom complet"} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <Input label="Téléphone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            <Input label="Mot de passe" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            {error && <p className="text-red-500 text-[10px] text-center">{error}</p>}
                            <Button fullWidth onClick={validateAndNext}>Suivant <ArrowRight className="w-4 h-4"/></Button>
                        </div>
                    )}

                    {step === 'PHOTO' && (
                        <div className="space-y-6 animate-fade-in text-center">
                            <p className="text-sm text-slate-400">Ajoutez une photo.</p>
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="w-full h-full rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center overflow-hidden bg-slate-900">
                                    {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" /> : <Camera className="w-10 h-10 text-slate-700"/>}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-pureOrange rounded-full cursor-pointer">
                                    <Camera className="w-5 h-5 text-white" />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'photoUrl')} />
                                </label>
                            </div>
                            <Button fullWidth onClick={validateAndNext}>Suivant</Button>
                        </div>
                    )}

                    {step === 'VEHICLE' && (
                        <div className="space-y-4 animate-fade-in">
                            <Input label="Type de Véhicule" as="select" options={VEHICLE_TYPES} value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value as any})} />
                            <Input label="Plaque d'immatriculation" placeholder="Ex: 1234AB01" value={formData.vehiclePlate} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} />
                            <Input label="Ville principale" as="select" options={CITIES.map(c => ({label: c, value: c}))} value={formData.operatingCity} onChange={e => setFormData({...formData, operatingCity: e.target.value})} />
                            <Button fullWidth onClick={validateAndNext}>Suivant</Button>
                        </div>
                    )}

                    {step === 'DOCS' && (
                        <div className="space-y-4 animate-fade-in">
                            <Input label="Numéro de CNI" value={formData.idCardNumber} onChange={e => setFormData({...formData, idCardNumber: e.target.value})} />
                            <Input label="Numéro de Permis" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500 font-bold uppercase flex items-center gap-2"><FileText className="w-3 h-3"/> Recto CNI</label>
                                <div className="w-full h-40 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900 overflow-hidden relative group">
                                    {formData.idPhotoUrl ? <img src={formData.idPhotoUrl} className="w-full h-full object-contain" /> : <Box className="w-8 h-8 text-slate-700" />}
                                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                                        <Camera className="text-white w-8 h-8" />
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'idPhotoUrl')} />
                                    </label>
                                </div>
                            </div>
                            <Button fullWidth onClick={validateAndNext}>Vérifier les documents</Button>
                        </div>
                    )}

                    {step === 'FINISH' && (
                        <div className="space-y-6 animate-fade-in text-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-10 h-10 text-green-500" /></div>
                            <h4 className="text-lg font-bold">Prêt !</h4>
                            <p className="text-xs text-slate-400">Votre compte sera activé après vérification.</p>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 accent-pureOrange" checked={formData.acceptTerms} onChange={e => setFormData({...formData, acceptTerms: e.target.checked})} />
                                <span className="text-[10px] text-slate-400 text-left">J'accepte les conditions générales.</span>
                            </label>
                            <Button fullWidth isLoading={loading} onClick={handleRegister}>Terminer</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-6">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3" /> Données sécurisées SSL
            </p>
            
            <button 
                onClick={() => {
                    setFormData({...formData, phone: '0700000000', password: 'admin'});
                    setView('LOGIN');
                }}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-pureOrange transition-colors"
            >
                <ShieldAlert className="w-3 h-3" /> Portail Admin
            </button>
        </div>
    </div>
  );
};
