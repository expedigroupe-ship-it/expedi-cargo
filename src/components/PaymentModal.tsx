
import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface PaymentModalProps {
  amount: number;
  phone: string;
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

type Step = 'SELECT' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export const PaymentModal: React.FC<PaymentModalProps> = ({ amount, phone, onSuccess, onCancel }) => {
  const [step, setStep] = useState<Step>('SELECT');
  const [selectedOp, setSelectedOp] = useState<'WAVE' | 'ORANGE' | 'MTN' | 'MOOV'>('ORANGE');
  const [error, setError] = useState<string | null>(null);

  const operators = [
    { id: 'WAVE', name: 'Wave', color: 'bg-cyan-500', logo: '🌊' },
    { id: 'ORANGE', name: 'Orange Money', color: 'bg-orange-500', logo: '🍊' },
    { id: 'MTN', name: 'MTN MoMo', color: 'bg-yellow-400', logo: '🟡' },
    { id: 'MOOV', name: 'Moov Money', color: 'bg-blue-600', logo: '🔵' },
  ];

  const handlePay = async () => {
    setStep('PROCESSING');
    try {
      // Simulation appel API Gateway
      await new Promise(r => setTimeout(r, 3000));
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        setStep('SUCCESS');
        setTimeout(() => {
          onSuccess({ operator: selectedOp, amount });
        }, 2000);
      } else {
        setError("La transaction a été refusée par l'opérateur.");
        setStep('ERROR');
      }
    } catch (e) {
      setError("Erreur de connexion aux serveurs de paiement.");
      setStep('ERROR');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-bounce-in">
        {/* Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-slate-900 font-bold text-lg">Paiement Sécurisé</h3>
            <p className="text-slate-500 text-xs">Propulsé par FedaPay / CinetPay</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'SELECT' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Montant à payer</p>
                <h4 className="text-4xl font-black text-slate-900">{amount.toLocaleString()} <span className="text-lg">FCFA</span></h4>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Choisissez votre opérateur</label>
                <div className="grid grid-cols-2 gap-3">
                  {operators.map(op => (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOp(op.id as any)}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selectedOp === op.id ? 'border-pureOrange bg-pureOrange/5' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <span className="text-2xl">{op.logo}</span>
                      <span className="text-xs font-bold text-slate-700">{op.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                <Smartphone className="text-slate-400 w-5 h-5" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Numéro de débit</p>
                  <p className="text-slate-700 font-bold">{phone}</p>
                </div>
              </div>

              <Button fullWidth onClick={handlePay} className="py-4 text-lg">
                Payer maintenant
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase font-bold">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Transactions chiffrées SSL
              </div>
            </div>
          )}

          {step === 'PROCESSING' && (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="relative inline-block">
                 <Loader2 className="w-16 h-16 text-pureOrange animate-spin mx-auto" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-900">{selectedOp[0]}</span>
                 </div>
              </div>
              <h4 className="text-xl font-bold text-slate-900">Traitement en cours...</h4>
              <p className="text-sm text-slate-500">Veuillez valider l'opération sur votre téléphone si demandé.</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Paiement Réussi !</h4>
              <p className="text-sm text-slate-500">Votre transaction a été confirmée.</p>
            </div>
          )}

          {step === 'ERROR' && (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Échec du paiement</h4>
              <p className="text-sm text-slate-500">{error}</p>
              <Button fullWidth variant="secondary" onClick={() => setStep('SELECT')}>Réessayer</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
