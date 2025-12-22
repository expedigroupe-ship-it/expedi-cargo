/**
 * Simulation d'envoi de SMS via la console et une alerte navigateur.
 * Dans une application réelle, ceci appellerait une API backend (Twilio, Infobip, etc.)
 */
export const sendTrackingSMS = (
    senderPhone: string, 
    recipientPhone: string, 
    trackingNumber: string
  ) => {
    const trackingLink = `https://expedi-cargo.ci/track/${trackingNumber}`;
    const message = `EXPEDI-CARGO: Votre colis ${trackingNumber} est enregistré. Suivez-le ici: ${trackingLink}`;
  
    // Simulation visuelle pour la démo
    console.log(`[SMS SIMULATION] To: ${senderPhone} | Msg: ${message}`);
    console.log(`[SMS SIMULATION] To: ${recipientPhone} | Msg: ${message}`);
    
    // Alerte optionnelle pour montrer à l'utilisateur que ça fonctionne
    alert(`SMS envoyé à ${senderPhone} et ${recipientPhone}:\n"${message}"`);
  };
