export enum UserRole {
  SENDER = 'SENDER',
  COURIER = 'COURIER',
  ADMIN = 'ADMIN',
}

export interface PricingConfig {
  basePriceIntra: number; // 1500
  basePriceInter: number; // 3000
  basePriceDoc: number; // 2000
  kmSurchargeInterval: number; // 5 (tous les 5km)
  kmSurchargeAmount: number; // 500
  weightSurchargeMedium: number; // 0.10 (10%)
  weightSurchargeHeavy: number; // 0.30 (30%)
  commissionRate: number; // 0.05 (5%)
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  walletBalance?: number; // Caution (Rechargeable)
  earningsBalance?: number; // Gains retirables (Issus des livraisons Wave/Momo)
  isBlocked?: boolean; // Pour bannissement admin
  createdAt?: number;
  // Champs spécifiques livreur
  courierDetails?: {
    courierType: 'STANDARD' | 'INDEPENDENT';
    operatingCity: string;
    idCardNumber: string;
    licenseNumber: string;
    vehiclePlate: string;
    vehicleType: 'MOTO' | 'VOITURE' | 'FOURGONNETTE';
    address: string;
    photoUrl: string;
    isAvailable: boolean;
  };
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: number;
  relatedPackageId?: string;
}

export enum PackageStatus {
  PENDING = 'EN_ATTENTE',
  ACCEPTED = 'ACCEPTE',
  PICKED_UP = 'RECUPERE',
  IN_TRANSIT = 'EN_LIVRAISON',
  DELIVERED = 'LIVRE',
  CANCELLED = 'ANNULE',
}

export enum ServiceLevel {
  EXPRESS = 'EXPRESS',   // 24H
  STANDARD = 'STANDARD', // 48H
  ECO = 'ECO'            // 72H
}

export enum PaymentMethod {
  WAVE = 'WAVE',
  MOMO = 'MOBILE_MONEY',
  CASH = 'ESPECES',
}

export interface Package {
  id: string;
  trackingNumber: string;
  senderId: string;
  courierId?: string;
  description: string;
  
  // Nouveaux champs pour le calcul avancé
  packageCount: number; // Nombre de colis
  weightKg: number; // Poids physique
  dimensions?: { length: number; width: number; height: number }; // Dimensions pour le poids volumétrique
  
  serviceLevel: ServiceLevel;
  distanceKm?: number;
  
  originCity: string;
  destinationCity: string;
  originAddress: string;
  destinationAddress: string;
  
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  
  price: number;
  paymentMethod: PaymentMethod;
  
  status: PackageStatus;
  createdAt: number;
  estimatedDeliveryTime?: string;
}

export const CITIES = ['Abidjan', 'Korhogo'];

export const VEHICLE_TYPES = [
  { value: 'MOTO', label: 'Moto' },
  { value: 'VOITURE', label: 'Véhicule Personnel' },
  { value: 'FOURGONNETTE', label: 'Fourgonnette' },
];

export const PAYMENT_METHODS = [
  { value: PaymentMethod.WAVE, label: 'Wave' },
  { value: PaymentMethod.MOMO, label: 'Mobile Money (Orange/MTN/Moov)' },
  { value: PaymentMethod.CASH, label: 'Espèces à la livraison' },
];