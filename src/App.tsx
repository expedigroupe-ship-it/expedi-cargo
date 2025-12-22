import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Truck, User, Navigation } from 'lucide-react';

function App() {
  const communes = ["Abobo", "Adjamé", "Anyama", "Attécoubé", "Bingerville", "Cocody", "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Songon", "Treichville", "Yopougon"];

  return (
    <div className="min-h-screen bg-midnight text-white p-4 font-sans no-scrollbar">
      <header className="flex items-center justify-between mb-8 bg-midnightLight p-4 rounded-xl border border-slate-700 shadow-lg">
        <h1 className="text-2xl font-bold text-pureOrange flex items-center gap-2">
          <Truck size={28} /> EXPEDI-CARGO
        </h1>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* EXPÉDITEUR */}
        <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-pureOrange">
            <User size={20} /> Expéditeur (Ramassage)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nom et Prénoms" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none focus:border-pureOrange" />
            <select className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none">
              <option>Commune de départ</option>
              {communes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Quartier" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Rue" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none" />
              <input type="text" placeholder="Porte" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none" />
            </div>
          </div>
        </div>

        {/* DESTINATAIRE */}
        <div className="bg-midnightLight p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-pureOrange">
            <Navigation size={20} /> Destinataire (Livraison)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nom et Prénoms" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none focus:border-pureOrange" />
            <select className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none">
              <option>Commune de destination</option>
              {communes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder="Quartier" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Rue" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none" />
              <input type="text" placeholder="Porte" className="bg-midnight border border-slate-600 p-3 rounded-lg outline-none" />
            </div>
          </div>
        </div>

        {/* CARTE ABIDJAN */}
        <div className="h-80 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <MapContainer center={[5.3484, -4.0244]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[5.3484, -4.0244]} icon={L.divIcon({ className: 'marker-pulse' })}>
              <Popup>Abidjan - Hub Central</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
