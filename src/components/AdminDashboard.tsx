import React, { useState, useEffect, useRef } from 'react';
import { User, Package, PricingConfig, UserRole, PackageStatus } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { Logo } from './Logo';
import { LayoutDashboard, Users, Map, Settings, DollarSign, LogOut, Search, Trash2, Ban, CheckCircle, Package as PackageIcon, Truck } from 'lucide-react';

declare const L: any;

interface AdminDashboardProps {
  user: User;
  allUsers: User[];
  packages: Package[];
  pricingConfig: PricingConfig;
  onUpdatePricing: (config: PricingConfig) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onLogout: () => void;
}

// Coordonnées approximatives pour la carte
const ABIDJAN_COORDS = { lat: 5.34, lng: -4.02 };
const KORHOGO_COORDS = { lat: 9.45, lng: -5.62 };

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user, allUsers, packages, pricingConfig, onUpdatePricing, onUpdateUser, onDeleteUser, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'MAP' | 'PRICING' | 'FINANCE'>('OVERVIEW');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Stats
  const totalUsers = allUsers.length;
  const totalCouriers = allUsers.filter(u => u.role === UserRole.COURIER).length;
  const activeDeliveries = packages.filter(p => [PackageStatus.IN_TRANSIT, PackageStatus.ACCEPTED].includes(p.status)).length;
  const totalRevenue = packages
    .filter(p => p.status === PackageStatus.DELIVERED)
    .reduce((sum, p) => sum + (p.price * pricingConfig.commissionRate), 0);

  // Map Effect
  useEffect(() => {
    if (activeTab === 'MAP' && mapRef.current && !mapInstance) {
      const map = L.map(mapRef.current).setView([ABIDJAN_COORDS.lat, ABIDJAN_COORDS.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
      setMapInstance(map);
    }
    
    if (activeTab === 'MAP' && mapInstance) {
        // Clear existing layers (simple implementation: remove all markers loop not implemented for brevity, assume redraw)
        // In a real app, manage a layer group.
        mapInstance.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
        });

        // Add markers for active packages
        packages.filter(p => p.status !== PackageStatus.DELIVERED && p.status !== PackageStatus.CANCELLED).forEach(p => {
            // Random offset for demo if real coords missing, or map from city name
            const base = p.originCity === 'Korhogo' ? KORHOGO_COORDS : ABIDJAN_COORDS;
            const lat = base.lat + (Math.random() * 0.1 - 0.05);
            const lng = base.lng + (Math.random() * 0.1 - 0.05);
            
            const color = p.status === PackageStatus.IN_TRANSIT ? 'orange' : 'blue';
            const markerHtml = `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`;
            const icon = L.divIcon({ className: '', html: markerHtml });

            L.marker([lat, lng], { icon }).addTo(mapInstance)
                .bindPopup(`<b>${p.trackingNumber}</b><br>${p.status}<br>${p.originAddress} -> ${p.destinationAddress}`);
        });
    }

    return () => {
        if (activeTab !== 'MAP' && mapInstance) {
            mapInstance.remove();
            setMapInstance(null);
        }
    };
  }, [activeTab, packages, mapInstance]);

  // Pricing Form State
  const [priceForm, setPriceForm] = useState(pricingConfig);
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPriceForm({ ...priceForm, [e.target.name]: parseFloat(e.target.value) });
  };
  const savePricing = () => {
      onUpdatePricing(priceForm);
      alert("Tarifs mis à jour avec succès !");
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'OVERVIEW':
              return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-blue-500/10 rounded-xl"><Users className="text-blue-500 w-6 h-6"/></div>
                              <span className="text-xs text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">Total</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{totalUsers}</h3>
                          <p className="text-sm text-slate-400">Utilisateurs inscrits</p>
                      </div>
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-pureOrange/10 rounded-xl"><Truck className="text-pureOrange w-6 h-6"/></div>
                              <span className="text-xs text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">{totalCouriers}</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{totalCouriers}</h3>
                          <p className="text-sm text-slate-400">Livreurs Partenaires</p>
                      </div>
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-green-500/10 rounded-xl"><PackageIcon className="text-green-500 w-6 h-6"/></div>
                              <span className="text-xs text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">En cours</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{activeDeliveries}</h3>
                          <p className="text-sm text-slate-400">Livraisons Actives</p>
                      </div>
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-purple-500/10 rounded-xl"><DollarSign className="text-purple-500 w-6 h-6"/></div>
                              <span className="text-xs text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">Commissions</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{totalRevenue.toLocaleString()} F</h3>
                          <p className="text-sm text-slate-400">Revenus Plateforme</p>
                      </div>

                      {/* Recent Activity Table */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-midnightLight rounded-2xl border border-slate-700 p-6 mt-4">
                          <h3 className="text-lg font-bold text-white mb-4">Activités Récentes</h3>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left text-slate-400">
                                  <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                      <tr>
                                          <th className="px-4 py-3">ID Colis</th>
                                          <th className="px-4 py-3">Statut</th>
                                          <th className="px-4 py-3">Expéditeur</th>
                                          <th className="px-4 py-3">Livreur</th>
                                          <th className="px-4 py-3">Date</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {packages.slice(0, 5).map(p => (
                                          <tr key={p.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                                              <td className="px-4 py-3 font-medium text-white">{p.trackingNumber}</td>
                                              <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${p.status === PackageStatus.DELIVERED ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>{p.status}</span></td>
                                              <td className="px-4 py-3">{p.senderName}</td>
                                              <td className="px-4 py-3">{allUsers.find(u => u.id === p.courierId)?.name || '-'}</td>
                                              <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              );
          case 'USERS':
              return (
                  <div className="bg-midnightLight rounded-2xl border border-slate-700 p-6 animate-fade-in">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Gestion Utilisateurs</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
                            <input type="text" placeholder="Rechercher..." className="bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-pureOrange" />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-400">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">Nom</th>
                                    <th className="px-4 py-3">Rôle</th>
                                    <th className="px-4 py-3">Téléphone</th>
                                    <th className="px-4 py-3">Solde (Caution)</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map(u => (
                                    <tr key={u.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                                            {u.courierDetails?.photoUrl && <img src={u.courierDetails.photoUrl} className="w-6 h-6 rounded-full" alt="" />}
                                            {u.name}
                                        </td>
                                        <td className="px-4 py-3"><span className="bg-slate-800 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                                        <td className="px-4 py-3">{u.phone}</td>
                                        <td className="px-4 py-3">{u.role === UserRole.COURIER ? `${u.walletBalance} F` : '-'}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => onUpdateUser({...u, isBlocked: !u.isBlocked})}
                                                className={`p-2 rounded hover:bg-slate-700 ${u.isBlocked ? 'text-green-500' : 'text-orange-500'}`} 
                                                title={u.isBlocked ? "Débloquer" : "Bloquer"}
                                            >
                                                {u.isBlocked ? <CheckCircle className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}
                                            </button>
                                            <button onClick={() => onDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-slate-700 rounded" title="Supprimer">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              );
          case 'MAP':
              return (
                  <div className="h-[600px] bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 relative animate-fade-in">
                      <div ref={mapRef} className="w-full h-full z-0"></div>
                      <div className="absolute top-4 right-4 z-10 bg-slate-900/90 p-4 rounded-xl border border-slate-700 text-xs space-y-2 backdrop-blur-sm">
                          <h4 className="font-bold text-white mb-2">Légende</h4>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> <span>En Attente</span></div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> <span>En Livraison</span></div>
                      </div>
                  </div>
              );
          case 'PRICING':
              return (
                  <div className="bg-midnightLight rounded-2xl border border-slate-700 p-6 animate-fade-in max-w-2xl mx-auto">
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-pureOrange"/> Configuration Tarifs</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-slate-500 uppercase">Prix de Base (FCFA)</h4>
                              <Input label="Intra-Cité (Standard)" type="number" name="basePriceIntra" value={priceForm.basePriceIntra} onChange={handlePriceChange} />
                              <Input label="Inter-Villes" type="number" name="basePriceInter" value={priceForm.basePriceInter} onChange={handlePriceChange} />
                              <Input label="Documents" type="number" name="basePriceDoc" value={priceForm.basePriceDoc} onChange={handlePriceChange} />
                          </div>
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-slate-500 uppercase">Facteurs Variables</h4>
                              <Input label="Surcharge KM (Montant)" type="number" name="kmSurchargeAmount" value={priceForm.kmSurchargeAmount} onChange={handlePriceChange} />
                              <Input label="Intervalle KM" type="number" name="kmSurchargeInterval" value={priceForm.kmSurchargeInterval} onChange={handlePriceChange} />
                              <Input label="Commission Plateforme (0.05 = 5%)" type="number" step="0.01" name="commissionRate" value={priceForm.commissionRate} onChange={handlePriceChange} />
                          </div>
                      </div>
                      <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
                          <Button onClick={savePricing} className="min-w-[150px]">Enregistrer</Button>
                      </div>
                  </div>
              );
            case 'FINANCE':
                return (
                    <div className="bg-midnightLight rounded-2xl border border-slate-700 p-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6">Transactions & Revenus</h3>
                        <div className="bg-slate-800 p-4 rounded-xl mb-6 flex gap-8 items-center border border-slate-600">
                             <div>
                                 <p className="text-xs text-slate-400 uppercase">Volume Total Transactions</p>
                                 <p className="text-2xl font-bold text-white">{packages.filter(p => p.status === PackageStatus.DELIVERED).reduce((acc, p) => acc + p.price, 0).toLocaleString()} FCFA</p>
                             </div>
                             <div className="h-10 w-px bg-slate-600"></div>
                             <div>
                                 <p className="text-xs text-slate-400 uppercase">Revenu Net (Commissions)</p>
                                 <p className="text-2xl font-bold text-pureOrange">{totalRevenue.toLocaleString()} FCFA</p>
                             </div>
                        </div>
                        <table className="w-full text-sm text-left text-slate-400">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Tracking</th>
                                    <th className="px-4 py-3">Montant Course</th>
                                    <th className="px-4 py-3">Moyen Paiement</th>
                                    <th className="px-4 py-3 text-right">Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.filter(p => p.status === PackageStatus.DELIVERED).map(p => (
                                    <tr key={p.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                                        <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">{p.trackingNumber}</td>
                                        <td className="px-4 py-3 text-white">{p.price} F</td>
                                        <td className="px-4 py-3">{p.paymentMethod}</td>
                                        <td className="px-4 py-3 text-right text-green-500 font-bold">+{Math.ceil(p.price * pricingConfig.commissionRate)} F</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
          default:
              return null;
      }
  };

  return (
    <div className="min-h-screen bg-midnight text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-midnightLight border-r border-slate-800 p-6 flex flex-col hidden md:flex">
        <div className="mb-10"><Logo size="sm" /></div>
        
        <nav className="flex-1 space-y-2">
           <button onClick={() => setActiveTab('OVERVIEW')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'OVERVIEW' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <LayoutDashboard className="w-5 h-5" /> <span>Tableau de bord</span>
           </button>
           <button onClick={() => setActiveTab('USERS')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'USERS' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <Users className="w-5 h-5" /> <span>Utilisateurs</span>
           </button>
           <button onClick={() => setActiveTab('MAP')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'MAP' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <Map className="w-5 h-5" /> <span>Supervision</span>
           </button>
           <button onClick={() => setActiveTab('FINANCE')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'FINANCE' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <DollarSign className="w-5 h-5" /> <span>Finance</span>
           </button>
           <button onClick={() => setActiveTab('PRICING')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'PRICING' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <Settings className="w-5 h-5" /> <span>Paramètres</span>
           </button>
        </nav>

        <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors mt-auto pt-6 border-t border-slate-800">
            <LogOut className="w-5 h-5" /> <span>Déconnexion</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto h-screen bg-midnight">
         {/* Mobile Header */}
         <div className="md:hidden flex justify-between items-center mb-6">
             <Logo size="sm" />
             <div className="flex gap-2">
                 <button onClick={() => setActiveTab('OVERVIEW')} className="p-2 bg-slate-800 rounded-lg"><LayoutDashboard/></button>
                 <button onClick={onLogout} className="p-2 bg-slate-800 rounded-lg text-red-500"><LogOut/></button>
             </div>
         </div>
         
         <header className="flex justify-between items-center mb-8">
             <div>
                 <h2 className="text-2xl font-bold text-white">Administration</h2>
                 <p className="text-slate-400 text-sm">Bienvenue, Administrateur.</p>
             </div>
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-pureOrange rounded-full flex items-center justify-center text-white font-bold">A</div>
             </div>
         </header>

         {renderContent()}
      </main>
    </div>
  );
};