
export enum UserRole {
  SENDER = 'SENDER',
  COURIER = 'COURIER',
  ADMIN = 'ADMIN',
}

export interface PricingConfig {
  basePriceIntra: number;
  basePriceInter: number;
  basePriceDoc: number;
  kmSurchargeInterval: number;
  kmSurchargeAmount: number;
  weightSurchargeMedium: number;
  weightSurchargeHeavy: number;
  commissionRate: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  walletBalance?: number;
  earningsBalance?: number;
  isBlocked?: boolean;
  createdAt?: number;
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

export interface PackageStatusHistory {
  status: PackageStatus;
  timestamp: number;
  notes?: string;
  location?: string;
}

export enum ServiceLevel {
  EXPRESS = 'EXPRESS',
  STANDARD = 'STANDARD',
  ECO = 'ECO'
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
  
  packageCount: number;
  weightKg: number;
  dimensions?: { length: number; width: number; height: number };
  packageValue?: number; // Valeur déclarée (XOF)
  
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
  statusHistory: PackageStatusHistory[]; // Historique chronologique
  
  deliverySignature?: {
    signerName: string;
    signedAt: number;
  };
  
  createdAt: number;
  updatedAt: number;
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
