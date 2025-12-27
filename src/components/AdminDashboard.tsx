
import React, { useState, useEffect, useRef } from 'react';
// Added PaymentMethod to the import list to fix the undefined reference error.
import { User, Package, PricingConfig, UserRole, PackageStatus, PaymentMethod } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { Logo } from './Logo';
import { 
  LayoutDashboard, Users, Map as MapIcon, Settings, DollarSign, LogOut, 
  Search, Trash2, Ban, CheckCircle, Package as PackageIcon, 
  Truck, Navigation, Activity, Box, Info, Target
} from 'lucide-react';

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

const ABIDJAN_COORDS = { lat: 5.34, lng: -4.02 };

const STATUS_COLORS: Record<string, string> = {
    [PackageStatus.PENDING]: '#94a3b8',   // Slate 400
    [PackageStatus.ACCEPTED]: '#facc15',  // Yellow 400
    [PackageStatus.PICKED_UP]: '#fb923c', // Orange 400
    [PackageStatus.IN_TRANSIT]: '#f97316',// Orange 500 (Focus)
    [PackageStatus.DELIVERED]: '#22c55e', // Green 500
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user, allUsers, packages, pricingConfig, onUpdatePricing, onUpdateUser, onDeleteUser, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'MAP' | 'PRICING' | 'FINANCE'>('OVERVIEW');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<any>(null);

  // Stats
  const totalUsers = allUsers.length;
  const totalCouriers = allUsers.filter(u => u.role === UserRole.COURIER).length;
  const activeDeliveries = packages.filter(p => [PackageStatus.IN_TRANSIT, PackageStatus.ACCEPTED, PackageStatus.PICKED_UP].includes(p.status)).length;
  const totalRevenue = packages
    .filter(p => p.status === PackageStatus.DELIVERED)
    .reduce((sum, p) => sum + (p.price * pricingConfig.commissionRate), 0);

  // Map Lifecycle
  useEffect(() => {
    if (activeTab === 'MAP' && mapRef.current && !mapInstance && typeof L !== 'undefined') {
      const map = L.map(mapRef.current, { zoomControl: false }).setView([ABIDJAN_COORDS.lat, ABIDJAN_COORDS.lng], 12);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      
      markersGroupRef.current = L.layerGroup().addTo(map);
      setMapInstance(map);
    }
    
    return () => {
        if (activeTab !== 'MAP' && mapInstance) {
            mapInstance.remove();
            setMapInstance(null);
        }
    };
  }, [activeTab, mapInstance]);

  // Update Markers
  useEffect(() => {
    if (activeTab === 'MAP' && mapInstance && markersGroupRef.current && typeof L !== 'undefined') {
        markersGroupRef.current.clearLayers();

        packages.filter(p => p.status !== PackageStatus.DELIVERED && p.status !== PackageStatus.CANCELLED).forEach(p => {
            const isSelected = p.id === selectedPkgId;
            const color = STATUS_COLORS[p.status] || '#ffffff';
            
            const lat = ABIDJAN_COORDS.lat + (Math.sin(parseInt(p.id, 36) || 0) * 0.05);
            const lng = ABIDJAN_COORDS.lng + (Math.cos(parseInt(p.id, 36) || 0) * 0.05);
            
            const markerHtml = `
                <div class="relative flex items-center justify-center">
                    <div class="absolute w-8 h-8 rounded-full opacity-30 animate-ping" style="background-color: ${color}"></div>
                    <div class="relative w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform ${isSelected ? 'scale-125 z-50' : ''}" 
                         style="background-color: ${color}">
                        ${p.status === PackageStatus.IN_TRANSIT ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3m0 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0m11 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0m4-3.1V9l-5-4v7h5Z"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'}
                    </div>
                </div>
            `;
            
            const icon = L.divIcon({ 
                className: 'custom-marker', 
                html: markerHtml,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            const marker = L.marker([lat, lng], { icon }).addTo(markersGroupRef.current);
            
            marker.bindPopup(`
                <div class="p-2 text-midnight min-w-[150px]">
                    <p class="font-bold text-sm mb-1">${p.trackingNumber}</p>
                    <p class="text-xs text-slate-500 mb-2">${p.description}</p>
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${color}"></span>
                        <span class="text-[10px] font-bold uppercase">${p.status}</span>
                    </div>
                </div>
            `);

            if (isSelected) {
                mapInstance.flyTo([lat, lng], 14);
                marker.openPopup();
            }
        });
    }
  }, [mapInstance, packages, activeTab, selectedPkgId]);

  const [priceForm, setPriceForm] = useState(pricingConfig);
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPriceForm({ ...priceForm, [e.target.name]: parseFloat(e.target.value) || 0 });
  };
  const savePricing = () => {
      onUpdatePricing(priceForm);
      alert("Tarifs mis à jour !");
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'OVERVIEW':
              return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg group hover:border-blue-500/50 transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform"><Users className="text-blue-500 w-6 h-6"/></div>
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">LIVE</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{totalUsers}</h3>
                          <p className="text-sm text-slate-400">Comptes actifs</p>
                      </div>
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg group hover:border-pureOrange/50 transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-pureOrange/10 rounded-xl group-hover:scale-110 transition-transform"><Truck className="text-pureOrange w-6 h-6"/></div>
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">EN LIGNE</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{totalCouriers}</h3>
                          <p className="text-sm text-slate-400">Livreurs actifs</p>
                      </div>
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg group hover:border-green-500/50 transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform"><Activity className="text-green-500 w-6 h-6"/></div>
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">FLUX</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{activeDeliveries}</h3>
                          <p className="text-sm text-slate-400">Missions en cours</p>
                      </div>
                      <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-lg group hover:border-purple-500/50 transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform"><DollarSign className="text-purple-500 w-6 h-6"/></div>
                              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-1 rounded">NET</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-1">{totalRevenue.toLocaleString()} F</h3>
                          <p className="text-sm text-slate-400">Total Commissions</p>
                      </div>

                      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-midnightLight rounded-2xl border border-slate-700 p-6">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-bold text-white">Journal des Expéditions</h3>
                              <button onClick={() => setActiveTab('MAP')} className="text-xs text-pureOrange hover:underline font-bold">Voir sur la carte →</button>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left text-slate-400">
                                  <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                      <tr>
                                          <th className="px-4 py-3">ID Colis</th>
                                          <th className="px-4 py-3">Statut</th>
                                          <th className="px-4 py-3">Provenance</th>
                                          <th className="px-4 py-3">Destination</th>
                                          <th className="px-4 py-3">Prix</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                      {packages.slice(0, 8).map(p => (
                                          <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                              <td className="px-4 py-4 font-mono font-bold text-white text-xs">{p.trackingNumber}</td>
                                              <td className="px-4 py-4">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black border" 
                                                      style={{ borderColor: STATUS_COLORS[p.status], color: STATUS_COLORS[p.status] }}>
                                                    {p.status}
                                                </span>
                                              </td>
                                              <td className="px-4 py-4 truncate max-w-[150px]">{p.originAddress}</td>
                                              <td className="px-4 py-4 truncate max-w-[150px]">{p.destinationAddress}</td>
                                              <td className="px-4 py-4 font-bold text-white">{p.price} F</td>
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
                        <h3 className="text-xl font-bold text-white">Annuaire Utilisateurs</h3>
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
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3">Caution</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allUsers.map(u => (
                                    <tr key={u.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                                        <td className="px-4 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden">
                                                <Users className="w-4 h-4 text-slate-500"/>
                                            </div>
                                            {u.name}
                                        </td>
                                        <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${u.role === UserRole.COURIER ? 'bg-pureOrange/10 text-pureOrange border border-pureOrange/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>{u.role}</span></td>
                                        <td className="px-4 py-4 font-mono">{u.phone}</td>
                                        <td className="px-4 py-4 font-bold">{u.role === UserRole.COURIER ? `${(u.walletBalance || 0).toLocaleString()} F` : '-'}</td>
                                        <td className="px-4 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => onUpdateUser({...u, isBlocked: !u.isBlocked})} className={`p-2 rounded-lg transition-colors ${u.isBlocked ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                {u.isBlocked ? <CheckCircle className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}
                                            </button>
                                            <button onClick={() => onDeleteUser(u.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
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
              const activePackages = packages.filter(p => p.status !== PackageStatus.DELIVERED && p.status !== PackageStatus.CANCELLED);
              return (
                  <div className="h-[75vh] flex flex-col md:flex-row gap-4 animate-fade-in">
                      <div className="flex-1 bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 relative shadow-2xl min-h-[400px]">
                          <div ref={mapRef} className="w-full h-full z-0"></div>
                          {typeof L === 'undefined' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white z-10">
                              Chargement de la carte...
                            </div>
                          )}
                          <div className="absolute top-4 left-4 z-[10] flex flex-col gap-2">
                              <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-xl max-w-xs">
                                  <h4 className="font-bold text-white mb-3 flex items-center gap-2 tracking-tight"><Navigation className="w-4 h-4 text-pureOrange"/> Supervision Live</h4>
                                  <div className="space-y-2">
                                      {Object.entries(STATUS_COLORS).map(([status, color]) => (
                                          <div key={status} className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                              <div className="flex items-center gap-2">
                                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                                                  {status}
                                              </div>
                                              <span>{packages.filter(p => p.status === status).length}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="w-full md:w-80 bg-midnightLight rounded-3xl border border-slate-700 flex flex-col overflow-hidden shadow-2xl max-h-[75vh]">
                          <div className="p-5 border-b border-slate-800">
                              <h3 className="font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-pureOrange"/> Missions Actives</h3>
                              <p className="text-[10px] text-slate-500 uppercase font-black mt-1">{activePackages.length} Colis en mouvement</p>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                              {activePackages.length === 0 ? (
                                  <div className="text-center py-10">
                                      <Info className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                      <p className="text-xs text-slate-500 italic">Aucun mouvement détecté.</p>
                                  </div>
                              ) : (
                                activePackages.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => setSelectedPkgId(p.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedPkgId === p.id ? 'bg-pureOrange/10 border-pureOrange shadow-lg shadow-pureOrange/10' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-pureOrange">{p.trackingNumber}</span>
                                            <Target className={`w-3 h-3 ${selectedPkgId === p.id ? 'text-pureOrange' : 'text-slate-700'}`} />
                                        </div>
                                        <p className="text-xs font-bold text-white line-clamp-1">{p.description}</p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: STATUS_COLORS[p.status] }}></div>
                                                <span className="text-[9px] font-black uppercase text-slate-400">{p.status}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500">{p.originCity}</span>
                                        </div>
                                    </div>
                                ))
                              )}
                          </div>
                      </div>
                  </div>
              );
          case 'PRICING':
              return (
                  <div className="bg-midnightLight rounded-2xl border border-slate-700 p-8 animate-fade-in max-w-3xl mx-auto shadow-2xl">
                      <div className="flex items-center gap-4 mb-8">
                          <div className="p-4 bg-pureOrange/10 rounded-2xl"><Settings className="w-8 h-8 text-pureOrange"/></div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Ingénierie Tarifaire</h3>
                            <p className="text-sm text-slate-400">Ajustez les paramètres économiques de la plateforme.</p>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Forfaits de Base</h4>
                              <Input label="Intra-Commune (F)" type="number" name="basePriceIntra" value={priceForm.basePriceIntra} onChange={handlePriceChange} />
                              <Input label="Inter-Villes (F)" type="number" name="basePriceInter" value={priceForm.basePriceInter} onChange={handlePriceChange} />
                              <Input label="Documents & Plis (F)" type="number" name="basePriceDoc" value={priceForm.basePriceDoc} onChange={handlePriceChange} />
                          </div>
                          <div className="space-y-6">
                              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Variables & Marges</h4>
                              <Input label="Commission (%) ex: 0.05" type="number" step="0.01" name="commissionRate" value={priceForm.commissionRate} onChange={handlePriceChange} />
                              <div className="grid grid-cols-2 gap-4">
                                <Input label="Surcharge KM" type="number" name="kmSurchargeAmount" value={priceForm.kmSurchargeAmount} onChange={handlePriceChange} />
                                <Input label="Intervalle (KM)" type="number" name="kmSurchargeInterval" value={priceForm.kmSurchargeInterval} onChange={handlePriceChange} />
                              </div>
                          </div>
                      </div>
                      <div className="mt-10 pt-6 border-t border-slate-800">
                          <Button onClick={savePricing} fullWidth size="lg">Appliquer les nouveaux tarifs</Button>
                      </div>
                  </div>
              );
            case 'FINANCE':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Chiffre d'Affaire Brut</p>
                                <p className="text-2xl font-black text-white">{packages.filter(p => p.status === PackageStatus.DELIVERED).reduce((acc, p) => acc + (p.price || 0), 0).toLocaleString()} F</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-pureOrange">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Bénéfice Net (Commissions)</p>
                                <p className="text-2xl font-black text-pureOrange">{totalRevenue.toLocaleString()} F</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Encours de paiement (Mobile)</p>
                                <p className="text-2xl font-black text-blue-500">
                                    {packages.filter(p => p.status === PackageStatus.DELIVERED && p.paymentMethod !== PaymentMethod.CASH).reduce((acc, p) => acc + (p.price || 0), 0).toLocaleString()} F
                                </p>
                            </div>
                        </div>

                        <div className="bg-midnightLight rounded-2xl border border-slate-700 p-6">
                            <h3 className="text-lg font-bold text-white mb-6">Historique des Transactions</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="text-[10px] text-slate-500 uppercase bg-slate-800/50 font-black tracking-widest">
                                        <tr>
                                            <th className="px-4 py-3">Horodatage</th>
                                            <th className="px-4 py-3">Tracking</th>
                                            <th className="px-4 py-3">Montant</th>
                                            <th className="px-4 py-3">Méthode</th>
                                            <th className="px-4 py-3 text-right">Commission Plateforme</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {packages.filter(p => p.status === PackageStatus.DELIVERED).map(p => (
                                            <tr key={p.id} className="hover:bg-slate-800/30">
                                                <td className="px-4 py-4 text-xs">{new Date(p.createdAt || Date.now()).toLocaleString()}</td>
                                                <td className="px-4 py-4 font-mono font-bold text-white text-xs">{p.trackingNumber}</td>
                                                <td className="px-4 py-4 font-bold text-white">{(p.price || 0).toLocaleString()} F</td>
                                                <td className="px-4 py-4">
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                                                        {p.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-green-500 font-black">+{Math.ceil((p.price || 0) * pricingConfig.commissionRate).toLocaleString()} F</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
          default:
              return null;
      }
  };

  return (
    <div className="min-h-screen bg-midnight text-white flex">
      <aside className="w-64 bg-midnightLight border-r border-slate-800 p-6 flex-col hidden lg:flex sticky top-0 h-screen">
        <div className="mb-10"><Logo size="sm" /></div>
        
        <nav className="flex-1 space-y-2">
           <button onClick={() => setActiveTab('OVERVIEW')} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeTab === 'OVERVIEW' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <LayoutDashboard className="w-5 h-5" /> <span className="text-sm font-bold">Vue d'ensemble</span>
           </button>
           <button onClick={() => setActiveTab('USERS')} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeTab === 'USERS' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <Users className="w-5 h-5" /> <span className="text-sm font-bold">Utilisateurs</span>
           </button>
           <button onClick={() => setActiveTab('MAP')} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeTab === 'MAP' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <MapIcon className="w-5 h-5" /> <span className="text-sm font-bold">Supervision Live</span>
           </button>
           <button onClick={() => setActiveTab('FINANCE')} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeTab === 'FINANCE' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <DollarSign className="w-5 h-5" /> <span className="text-sm font-bold">Finances</span>
           </button>
           <button onClick={() => setActiveTab('PRICING')} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeTab === 'PRICING' ? 'bg-pureOrange text-white shadow-lg shadow-pureOrange/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
               <Settings className="w-5 h-5" /> <span className="text-sm font-bold">Paramétrage</span>
           </button>
        </nav>

        <button onClick={onLogout} className="flex items-center gap-3 text-slate-500 hover:text-red-500 transition-colors mt-auto pt-6 border-t border-slate-800 group font-bold text-sm">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> <span>Déconnexion</span>
        </button>
      </aside>

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-midnight max-w-full">
         <div className="lg:hidden flex justify-between items-center mb-6 bg-midnightLight p-4 rounded-2xl border border-slate-800 shadow-lg">
             <Logo size="sm" />
             <div className="flex gap-2">
                 <button onClick={() => setActiveTab('MAP')} className={`p-2 rounded-xl transition-colors ${activeTab === 'MAP' ? 'bg-pureOrange' : 'bg-slate-800 text-slate-400'}`}><MapIcon className="w-5 h-5"/></button>
                 <button onClick={() => setActiveTab('OVERVIEW')} className={`p-2 rounded-xl transition-colors ${activeTab === 'OVERVIEW' ? 'bg-pureOrange' : 'bg-slate-800 text-slate-400'}`}><LayoutDashboard className="w-5 h-5"/></button>
                 <button onClick={onLogout} className="p-2 bg-slate-800 rounded-xl text-red-500"><LogOut className="w-5 h-5"/></button>
             </div>
         </div>
         
         <header className="hidden lg:flex justify-between items-center mb-8">
             <div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-tight">Console Admin</h2>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Status: <span className="text-green-500">Connecté • Live DB</span></p>
             </div>
             <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-bold text-white">Super Administrateur</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Accès Total</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-pureOrange to-red-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-pureOrange/20">A</div>
             </div>
         </header>

         <div className="animate-fade-in-up">
            {renderContent()}
         </div>
      </main>
    </div>
  );
};
