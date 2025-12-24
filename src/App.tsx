import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Truck, User, Send } from 'lucide-react';

// Tes clés Supabase intégrées
const supabaseUrl = 'https://mmnyjlasrdayqgftiodb.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnlqbGFzcmRheXFnZnRpb2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NjE5ODAsImV4cCI6MjA4MjEzNzk4MH0.skwp9mUIgvlZpTc74H78OIpa19QhbWWBdkeTFxaonuo';

const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [loading, setLoading] = useState(false);

  const handleEnvoyer = async () => {
    setLoading(true);
    // On enregistre un colis test dans ta table 'shipments'
    const { error } = await supabase
      .from('shipments')
      .insert([{ 
        tracking_number: "EXP-" + Math.floor(Math.random() * 10000),
        status: 'pending',
        recipient_name: "Client Test Abidjan",
        recipient_phone: "0708091011"
      }]);

    setLoading(false);
    if (error) {
      console.error(error);
      alert("Erreur Supabase: " + error.message);
    } else {
      alert("✅ Succès ! Le colis est enregistré. Vérifie ton tableau de bord Supabase !");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 font-sans">
      <header className="mb-8 bg-[#1E293B] p-4 rounded-xl border border-slate-700 shadow-lg text-center">
        <h1 className="text-2xl font-bold text-[#FF6B00] flex items-center justify-center gap-2">
          <Truck size={32} /> EXPEDI-CARGO
        </h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-[#FF6B00] flex items-center gap-2">
             <User size={20}/> Test de Connexion
          </h2>
          
          <p className="text-slate-400 mb-6 text-sm">
            Clique sur le bouton pour envoyer un colis test directement vers ton projet Supabase.
          </p>

          <button 
            onClick={handleEnvoyer}
            disabled={loading}
            className="w-full bg-[#FF6B00] hover:bg-orange-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Envoi en cours..." : <><Send size={20} /> TESTER L'ENVOI RÉEL</>}
          </button>
        </div>

        <div className="h-64 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <MapContainer center={[5.3484, -4.0244]} zoom={11} style={{height: '100%', width: '100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
