
/**
 * Service de simulation de passerelle de paiement (CinetPay / FedaPay style)
 */
export interface PaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transactionId: string;
  amount: number;
  operator?: string;
}

export const initiatePayment = async (
  amount: number,
  phone: string,
  method: 'WAVE' | 'ORANGE' | 'MTN' | 'MOOV'
): Promise<PaymentResponse> => {
  // Simulation d'un délai réseau API
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Simulation de succès (90% de chance)
  const isSuccess = Math.random() > 0.1;
  
  return {
    status: isSuccess ? 'SUCCESS' : 'FAILED',
    transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
    amount,
    operator: method
  };
};
