
import React, { useState } from 'react';
import { User, UserRole, VEHICLE_TYPES } from '../types';
import { Button } from './Button';
import { 
  User as UserIcon, Phone, Mail, FileBadge, Truck, 
  LogOut, Trash2, HelpCircle, LifeBuoy, ChevronRight, 
  QrCode, X, Edit2, Save, ShieldAlert, FileText, Info
} from 'lucide-react';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
  onDelete: () => void;
  onNavigate: (view: 'FAQ' | 'SUPPORT') => void;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onDelete, onNavigate, onUpdateUser }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [editVehicleType, setEditVehicleType] = useState<any>(user.courierDetails?.vehicleType || 'MOTO');
  const [editVehiclePlate, setEditVehiclePlate] = useState(user.courierDetails?.vehiclePlate || '');

  const loginPayload = JSON.stringify({ action: 'LOGIN', phone: user.phone, id: user.id });

  const handleSaveVehicle = () => {
    if (!user.courierDetails) return;
    if (!editVehiclePlate.trim()) return alert("Plaque requise.");
    onUpdateUser({
        ...user,
        courierDetails: { ...user.courierDetails, vehicleType: editVehicleType, vehiclePlate: editVehiclePlate.toUpperCase() }
    });
    setIsEditingVehicle(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto animate-fade-in pb-24 text-white relative">
      
      {/* MODAL QR CODE IDENTITÉ */}
      {showQrModal && (
           <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 animate-fade-in">
               <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center relative shadow-2xl">
                   <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-800"><X className="w-5 h-5" /></button>
                   <div className="w-20 h-20 bg-pureOrange rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-100">
                        <QrCode className="text-white w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold text-midnight mb-1">{user.name}</h3>
                   <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-widest font-black">Identité Digitale EXPEDI-CARGO</p>
                   
                   <div className="flex justify-center mb-6">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(loginPayload)}`} alt="QR" className="w-56 h-56 border-8 border-slate-50 rounded-2xl shadow-inner" />
                   </div>
                   <p className="text-xs text-slate-500 italic px-4">Utilisez ce code pour transférer votre session ou vous identifier auprès d'un agent EXPEDI-CARGO.</p>
               </div>
           </div>
       )}

      {/* MODAL LÉGAL */}
      {showLegal && (
          <div className="fixed inset-0 z-[100] bg-midnight flex flex-col p-6 animate-fade-in-up">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-pureOrange"/> Mentions Légales</h2>
                  <button onClick={() => setShowLegal(false)} className="p-2 bg-slate-800 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-8 pr-2 no-scrollbar">
                  <section>
                      <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">1. Politique de Confidentialité</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">Nous collectons vos données de géolocalisation pour assurer le suivi en temps réel des colis. Ces données sont chiffrées et ne sont jamais revendues à des tiers.</p>
                  </section>
                  <section>
                      <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">2. Assurance et Garanties</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">Chaque colis est assuré à hauteur de sa valeur déclarée (max 500.000 F). En cas de perte ou dommage avéré, EXPEDI-CARGO s'engage à rembourser l'expéditeur sous 10 jours ouvrés.</p>
                  </section>
                  <section>
                      <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">3. Obligations du Livreur</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">Le livreur doit être en règle avec les lois de circulation en Côte d'Ivoire. Toute fraude sur les identifiants ou documents entraîne une suspension définitive et des poursuites judiciaires.</p>
                  </section>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-800">
                  <Button fullWidth onClick={() => setShowLegal(false)}>J'ai compris</Button>
              </div>
          </div>
      )}

      {/* Header Profil */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-4 border-pureOrange shadow-2xl relative overflow-hidden group">
            {user.courierDetails?.photoUrl ? <img src={user.courierDetails.photoUrl} className="w-full h-full object-cover"/> : <UserIcon className="w-12 h-12 text-slate-600" />}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"><Edit2 className="w-5 h-5 text-white"/></div>
        </div>
        <h2 className="text-2xl font-black">{user.name}</h2>
        <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${user.role === UserRole.SENDER ? 'bg-pureOrange/10 text-pureOrange' : 'bg-blue-500/10 text-blue-500'}`}>
                {user.role === UserRole.SENDER ? 'Expéditeur' : user.courierDetails?.courierType === 'INDEPENDENT' ? 'Indépendant' : 'Entreprise'}
            </span>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
        </div>
      </div>

      <div className="space-y-6">
        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShowQrModal(true)} className="bg-midnightLight p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-2 hover:border-pureOrange transition-all">
                <QrCode className="w-6 h-6 text-pureOrange" />
                <span className="text-[10px] font-bold uppercase">Ma Carte QR</span>
            </button>
            <button onClick={() => setShowLegal(true)} className="bg-midnightLight p-4 rounded-2xl border border-slate-800 flex flex-col items-center gap-2 hover:border-pureOrange transition-all">
                <ShieldAlert className="w-6 h-6 text-blue-500" />
                <span className="text-[10px] font-bold uppercase">Sécurité & CGU</span>
            </button>
        </div>

        {/* INFO COMPTE */}
        <div className="bg-midnightLight rounded-3xl p-6 border border-slate-800 space-y-6 shadow-xl">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Info className="w-4 h-4"/> Détails du Compte</h3>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-xl"><Phone className="text-pureOrange w-5 h-5" /></div>
                <div><p className="text-[10px] text-slate-500 font-bold uppercase">Contact</p><p className="font-bold">{user.phone}</p></div>
            </div>

            {user.role === UserRole.COURIER && user.courierDetails && (
            <>
                <div className="h-px bg-slate-800"></div>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl mt-1"><Truck className="text-pureOrange w-5 h-5" /></div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                             <p className="text-[10px] text-slate-500 font-bold uppercase">Véhicule</p>
                             <button onClick={() => setIsEditingVehicle(!isEditingVehicle)} className="p-1 text-slate-600 hover:text-white transition-colors"><Edit2 className="w-3 h-3"/></button>
                        </div>
                        {isEditingVehicle ? (
                            <div className="space-y-2 pt-2 animate-fade-in">
                                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs" value={editVehicleType} onChange={e => setEditVehicleType(e.target.value as any)}>
                                    {VEHICLE_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                                </select>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs" value={editVehiclePlate} onChange={e => setEditVehiclePlate(e.target.value)} />
                                <div className="flex gap-2"><Button size="sm" fullWidth onClick={handleSaveVehicle}>Sauver</Button></div>
                            </div>
                        ) : (
                            <p className="font-bold text-sm uppercase">{user.courierDetails.vehicleType} — {user.courierDetails.vehiclePlate}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl mt-1"><FileBadge className="text-pureOrange w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Documents Certifiés</p>
                        <p className="text-xs font-bold text-white mt-1">CNI: {user.courierDetails.idCardNumber}</p>
                        <p className="text-xs text-slate-500">Permis: {user.courierDetails.licenseNumber}</p>
                    </div>
                </div>
            </>
            )}
        </div>

        {/* SECTION SUPPORT */}
        <div className="bg-midnightLight rounded-3xl p-2 border border-slate-800">
            <button onClick={() => onNavigate('FAQ')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 rounded-2xl transition-all">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg text-pureOrange"><HelpCircle className="w-5 h-5" /></div>
                    <span className="font-bold text-sm">Aide & FAQ</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <div className="h-px bg-slate-800 mx-4"></div>
            <button onClick={() => onNavigate('SUPPORT')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 rounded-2xl transition-all">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg text-pureOrange"><LifeBuoy className="w-5 h-5" /></div>
                    <span className="font-bold text-sm">Contacter le Support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
        </div>

        <div className="mt-8 space-y-4">
          <Button variant="secondary" fullWidth onClick={onLogout}><LogOut className="w-4 h-4" /> Déconnexion</Button>
          <button onClick={() => { if(confirm("Supprimer définitivement ?")) onDelete(); }} className="w-full py-4 text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-3 h-3" /> Clôturer mon compte
          </button>
        </div>
      </div>
    </div>
  );
};
