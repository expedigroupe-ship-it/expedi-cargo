import React, { useState } from 'react';
import { ChevronLeft, Phone, Mail, MapPin, Send, MessageSquare } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface SupportScreenProps {
  onBack: () => void;
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ onBack }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulation d'envoi
    setTimeout(() => {
      setSubmitted(true);
      setSubject('');
      setMessage('');
    }, 1000);
  };

  return (
    <div className="p-4 max-w-md mx-auto animate-fade-in pb-24 min-h-screen text-white">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-xl font-bold">Support Client</h2>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
          <a href="tel:+225075883032" className="bg-midnightLight p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-pureOrange transition-colors group">
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-pureOrange group-hover:text-white transition-colors">
                  <Phone className="w-5 h-5 text-pureOrange group-hover:text-white" />
              </div>
              <span className="text-xs font-bold text-slate-300">Appeler</span>
          </a>
          <a href="mailto:contact@expedicargo.ci" className="bg-midnightLight p-4 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-pureOrange transition-colors group">
              <div className="p-3 bg-slate-800 rounded-full group-hover:bg-pureOrange group-hover:text-white transition-colors">
                  <Mail className="w-5 h-5 text-pureOrange group-hover:text-white" />
              </div>
              <span className="text-xs font-bold text-slate-300">Email</span>
          </a>
      </div>

      {/* Location */}
      <div className="bg-midnightLight p-4 rounded-xl border border-slate-700 flex items-start gap-4 mb-8">
          <MapPin className="w-5 h-5 text-pureOrange mt-1 shrink-0" />
          <div>
              <h4 className="font-bold text-sm text-white">Nos Bureaux</h4>
              <p className="text-xs text-slate-400 mt-1">Cocody Riviera 2, Abidjan, Côte d'Ivoire.</p>
              <p className="text-xs text-slate-500 mt-1">Lun - Ven : 08h00 - 18h00</p>
          </div>
      </div>

      {/* Formulaire */}
      <div className="bg-midnightLight p-5 rounded-xl border border-slate-700">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-pureOrange" /> Envoyez-nous un message
          </h3>
          
          {submitted ? (
              <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-lg text-center animate-fade-in">
                  <p className="text-green-400 font-bold mb-1">Message envoyé !</p>
                  <p className="text-xs text-green-300">Notre équipe vous répondra sous 24h.</p>
                  <button onClick={() => setSubmitted(false)} className="text-xs text-white underline mt-3">Envoyer un autre message</button>
              </div>
          ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                  <Input 
                    label="Sujet" 
                    placeholder="Ex: Problème de livraison..." 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    required 
                  />
                  <Input 
                    label="Message" 
                    as="textarea" 
                    placeholder="Décrivez votre problème en détail..." 
                    value={message} 
                    onChange={(e) => setMessage(e.target.value)} 
                    required 
                  />
                  <Button type="submit" fullWidth>
                      <Send className="w-4 h-4" /> Envoyer
                  </Button>
              </form>
          )}
      </div>
    </div>
  );
};