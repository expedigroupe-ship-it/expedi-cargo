import React, { useState } from 'react';
import { User, UserRole, VEHICLE_TYPES } from '../types';
import { Button } from './Button';
import { User as UserIcon, Phone, Mail, FileBadge, Truck, LogOut, Trash2, HelpCircle, LifeBuoy, ChevronRight, QrCode, X, Edit2, Save } from 'lucide-react';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
  onDelete: () => void;
  onNavigate: (view: 'FAQ' | 'SUPPORT') => void;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onDelete, onNavigate, onUpdateUser }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  
  // States for Vehicle Edition
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [editVehicleType, setEditVehicleType] = useState<"MOTO" | "VOITURE" | "FOURGONNETTE">(
    user.courierDetails?.vehicleType || 'MOTO'
  );
  const [editVehiclePlate, setEditVehiclePlate] = useState(user.courierDetails?.vehiclePlate || '');

  // Génération des données pour le QR Code de connexion
  const loginPayload = JSON.stringify({
      action: 'LOGIN',
      phone: user.phone,
      password: user.password
  });

  const handleSaveVehicle = () => {
    if (!user.courierDetails) return;
    
    // Simple validation
    if (!editVehiclePlate.trim()) {
        alert("La plaque d'immatriculation ne peut pas être vide.");
        return;
    }

    const updatedUser = {
        ...user,
        courierDetails: {
            ...user.courierDetails,
            vehicleType: editVehicleType,
            vehiclePlate: editVehiclePlate.trim().toUpperCase()
        }
    };
    onUpdateUser(updatedUser);
    setIsEditingVehicle(false);
  };

  const cancelEditVehicle = () => {
      setEditVehicleType(user.courierDetails?.vehicleType || 'MOTO');
      setEditVehiclePlate(user.courierDetails?.vehiclePlate || '');
      setIsEditingVehicle(false);
  };

  return (
    <div className="p-6 max-w-md mx-auto animate-fade-in pb-24 text-white relative">
      
      {/* MODAL QR CODE IDENTITÉ */}
      {showQrModal && (
           <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-6 animate-fade-in">
               <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center relative">
                   <button onClick={() => setShowQrModal(false)} className="absolute top-2 right-2 p-1 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-800">
                       <X className="w-5 h-5" />
                   </button>
                   <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pureOrange">
                            {user.courierDetails?.photoUrl ? (
                                <img src={user.courierDetails.photoUrl} alt="Profil" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center"><UserIcon className="text-slate-500"/></div>
                            )}
                        </div>
                   </div>
                   <h3 className="text-lg font-bold text-midnight mb-1">{user.name}</h3>
                   <p className="text-xs text-slate-500 mb-4 uppercase tracking-widest">{user.role === 'SENDER' ? 'Expéditeur' : 'Livreur'}</p>
                   
                   <div className="flex justify-center mb-4 relative">
                       <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(loginPayload)}`} 
                          alt="QR Code Login" 
                          className="w-56 h-56 border-4 border-midnight rounded-xl"
                       />
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white p-1 rounded-full"><QrCode className="text-midnight w-6 h-6"/></div>
                       </div>
                   </div>
                   <p className="text-xs text-slate-500 leading-tight">
                       Scannez ce code depuis un autre appareil sur l'écran de connexion pour accéder à ce compte instantanément.
                   </p>
               </div>
           </div>
       )}

      {/* Header Profil */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-4 border-4 border-pureOrange overflow-hidden relative shadow-xl">
           {user.courierDetails?.photoUrl ? (
             <img src={user.courierDetails.photoUrl} alt="Profil" className="w-full h-full object-cover" />
           ) : (
             <UserIcon className="w-10 h-10 text-slate-400" />
           )}
        </div>
        <h2 className="text-2xl font-bold">{user.name}</h2>
        <span className="text-pureOrange text-sm font-bold uppercase tracking-widest bg-pureOrange/10 px-3 py-1 rounded-full mt-1">
          {user.role === UserRole.SENDER ? 'Expéditeur' : 
           user.courierDetails?.courierType === 'INDEPENDENT' ? 'Livreur Indépendant' : 'Livreur'}
        </span>
      </div>

      <div className="space-y-6">
        
        {/* BOUTON IDENTITÉ QR */}
        <button 
            onClick={() => setShowQrModal(true)}
            className="w-full bg-gradient-to-r from-slate-800 to-slate-900 border border-pureOrange/30 p-4 rounded-2xl flex items-center justify-between shadow-lg hover:border-pureOrange transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="bg-pureOrange p-2 rounded-lg text-white shadow-lg shadow-pureOrange/20 group-hover:scale-110 transition-transform">
                    <QrCode className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-white">Mon QR Code</h3>
                    <p className="text-xs text-slate-400">Pour connexion rapide</p>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-pureOrange transition-colors" />
        </button>

        {/* INFO PERSO */}
        <div className="bg-midnightLight rounded-2xl p-5 border border-slate-700 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informations Personnelles</h3>
            <div className="flex items-center gap-4">
            <Phone className="text-pureOrange w-5 h-5" />
            <div>
                <p className="text-xs text-slate-400">Téléphone</p>
                <p className="font-semibold">{user.phone}</p>
            </div>
            </div>

            {user.email && (
            <div className="flex items-center gap-4">
                <Mail className="text-pureOrange w-5 h-5" />
                <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="font-semibold">{user.email}</p>
                </div>
            </div>
            )}

            {user.role === UserRole.COURIER && user.courierDetails && (
            <>
                <div className="h-px bg-slate-700 my-2"></div>
                
                {/* VEHICULE SECTION WITH EDIT */}
                <div className="flex items-start gap-4">
                    <div className="mt-1"><Truck className="text-pureOrange w-5 h-5" /></div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                             <p className="text-xs text-slate-400">Véhicule</p>
                             {!isEditingVehicle ? (
                                 <button onClick={() => setIsEditingVehicle(true)} className="p-1 text-slate-500 hover:text-white transition-colors">
                                     <Edit2 className="w-3 h-3" />
                                 </button>
                             ) : (
                                 <div className="flex gap-2">
                                     <button onClick={handleSaveVehicle} className="p-1 text-green-500 hover:text-green-400"><Save className="w-4 h-4"/></button>
                                     <button onClick={cancelEditVehicle} className="p-1 text-red-500 hover:text-red-400"><X className="w-4 h-4"/></button>
                                 </div>
                             )}
                        </div>
                        
                        {!isEditingVehicle ? (
                            <p className="font-semibold capitalize animate-fade-in">
                                {user.courierDetails.vehicleType.toLowerCase()} - {user.courierDetails.vehiclePlate}
                            </p>
                        ) : (
                            <div className="space-y-2 animate-fade-in">
                                <select 
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-pureOrange outline-none"
                                    value={editVehicleType}
                                    onChange={(e) => setEditVehicleType(e.target.value as "MOTO" | "VOITURE" | "FOURGONNETTE")}
                                >
                                    {VEHICLE_TYPES.map(vt => (
                                        <option key={vt.value} value={vt.value}>{vt.label}</option>
                                    ))}
                                </select>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-pureOrange outline-none"
                                    value={editVehiclePlate}
                                    onChange={(e) => setEditVehiclePlate(e.target.value)}
                                    placeholder="Plaque..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                <FileBadge className="text-pureOrange w-5 h-5" />
                <div>
                    <p className="text-xs text-slate-400">Documents</p>
                    <p className="font-semibold text-sm">Permis: {user.courierDetails.licenseNumber}</p>
                    <p className="text-xs text-slate-500">CNI: {user.courierDetails.idCardNumber}</p>
                </div>
                </div>
            </>
            )}
        </div>

        {/* SECTION SUPPORT */}
        <div className="bg-midnightLight rounded-2xl p-1 border border-slate-700">
            <button 
                onClick={() => onNavigate('FAQ')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 rounded-xl transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-lg text-pureOrange"><HelpCircle className="w-5 h-5" /></div>
                    <span className="font-semibold text-sm">Foire aux questions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <div className="h-px bg-slate-700 mx-4"></div>
            <button 
                onClick={() => onNavigate('SUPPORT')}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 rounded-xl transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2 rounded-lg text-pureOrange"><LifeBuoy className="w-5 h-5" /></div>
                    <span className="font-semibold text-sm">Support Client</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
        </div>

        <div className="mt-8 space-y-3">
          <Button variant="secondary" fullWidth onClick={onLogout}>
            <LogOut className="w-4 h-4" /> Se déconnecter
          </Button>

          <button 
             onClick={onDelete}
             className="w-full py-3 flex items-center justify-center gap-2 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors text-sm font-semibold"
          >
              <Trash2 className="w-4 h-4" /> Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  );
};