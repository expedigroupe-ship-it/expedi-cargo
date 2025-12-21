import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';

interface FAQScreenProps {
  onBack: () => void;
}

const FAQ_ITEMS = [
  {
    question: "Comment suivre mon colis ?",
    answer: "Vous pouvez suivre votre colis en temps réel en utilisant le numéro de suivi (ex: EC-123456) dans la barre de recherche sur la page d'accueil ou via l'onglet 'Suivre un colis'."
  },
  {
    question: "Quels sont les délais de livraison ?",
    answer: "Cela dépend du service choisi : Express (24h), Standard (48h) ou Éco (72h). Les livraisons intra-urbaines (Abidjan) peuvent se faire en quelques heures."
  },
  {
    question: "Comment payer ma livraison ?",
    answer: "Nous acceptons les paiements via Mobile Money (Wave, Orange, MTN, Moov) et les espèces à la livraison (selon disponibilité du livreur)."
  },
  {
    question: "Que faire si mon colis est endommagé ?",
    answer: "Contactez immédiatement le support client via la section 'Support'. Si vous avez souscrit à une assurance (déclaration de valeur), vous serez indemnisé selon nos CGU."
  },
  {
    question: "Comment devenir livreur partenaire ?",
    answer: "Lors de l'inscription, choisissez le rôle 'Livreur'. Vous devrez fournir votre CNI, Permis de conduire et les documents du véhicule. Une caution est requise pour activer votre compte."
  },
  {
    question: "Quels objets sont interdits ?",
    answer: "Sont interdits : Drogues, armes, produits explosifs/inflammables, animaux vivants, et sommes d'argent liquide importantes."
  }
];

export const FAQScreen: React.FC<FAQScreenProps> = ({ onBack }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="p-4 max-w-md mx-auto animate-fade-in pb-24 min-h-screen text-white">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-xl font-bold">Foire Aux Questions</h2>
      </div>

      <div className="flex justify-center mb-6">
          <div className="bg-pureOrange/10 p-4 rounded-full">
            <HelpCircle className="w-10 h-10 text-pureOrange" />
          </div>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, index) => (
          <div key={index} className="bg-midnightLight border border-slate-700 rounded-xl overflow-hidden transition-all">
            <button 
              onClick={() => toggleIndex(index)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800 transition-colors"
            >
              <span className="font-semibold text-sm pr-4">{item.question}</span>
              {openIndex === index ? <ChevronUp className="w-4 h-4 text-pureOrange" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>
            
            {openIndex === index && (
              <div className="p-4 pt-0 text-sm text-slate-400 border-t border-slate-700/50 bg-slate-800/30">
                <p className="mt-2 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Vous ne trouvez pas votre réponse ?</p>
          <button onClick={onBack} className="text-pureOrange font-bold text-sm mt-1 hover:underline">Contactez le Support</button>
      </div>
    </div>
  );
};