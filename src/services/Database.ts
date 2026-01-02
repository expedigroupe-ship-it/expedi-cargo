
import { Package, User, AppNotification, PackageStatus, PackageStatusHistory, UserRole } from '../types';

export class DatabaseService {
  private static STORAGE_KEYS = {
    PACKAGES: 'expedi_cargo_db_packages',
    USERS: 'expedi_cargo_db_users',
    NOTIFS: 'expedi_cargo_db_notifications'
  };

  private static channel: BroadcastChannel | null = typeof window !== 'undefined' ? new BroadcastChannel('expedi_cargo_sync') : null;

  static onMessage(callback: (data: any) => void) {
    if (DatabaseService.channel) {
      DatabaseService.channel.onmessage = (event) => callback(event.data);
    }
  }

  private static notifyOthers(type: 'UPDATE_PACKAGES' | 'UPDATE_USERS' | 'NEW_NOTIFICATION') {
    if (DatabaseService.channel) {
      DatabaseService.channel.postMessage({ type, timestamp: Date.now() });
    }
  }

  // --- USERS ---
  static async getUsers(): Promise<User[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DatabaseService.STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static async isPhoneTaken(phone: string): Promise<boolean> {
    const users = await DatabaseService.getUsers();
    return users.some(u => u.phone === phone);
  }

  static async saveUser(user: User): Promise<void> {
    const users = await DatabaseService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push({ ...user, createdAt: user.createdAt || Date.now() });
    }
    localStorage.setItem(DatabaseService.STORAGE_KEYS.USERS, JSON.stringify(users));
    DatabaseService.notifyOthers('UPDATE_USERS');
  }

  // --- PACKAGES ---
  static async getPackages(): Promise<Package[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DatabaseService.STORAGE_KEYS.PACKAGES);
    return data ? JSON.parse(data) : [];
  }

  static async savePackage(pkg: Package): Promise<Package> {
    const packages = await DatabaseService.getPackages();
    if (!pkg.statusHistory || pkg.statusHistory.length === 0) {
      pkg.statusHistory = [{
        status: pkg.status,
        timestamp: Date.now(),
        notes: "Colis enregistré sur la plateforme"
      }];
    }
    const updated = [pkg, ...packages];
    localStorage.setItem(DatabaseService.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
    
    // Notification pour l'expéditeur
    await DatabaseService.createNotification({
      id: Math.random().toString(36).substr(2, 9),
      userId: pkg.senderId,
      title: "Expédition créée",
      message: `Votre colis ${pkg.trackingNumber} est maintenant en ligne.`,
      isRead: false,
      timestamp: Date.now(),
      relatedPackageId: pkg.id
    });

    DatabaseService.notifyOthers('UPDATE_PACKAGES');
    return pkg;
  }

  static async updatePackageStatus(
    pkgId: string, 
    status: PackageStatus, 
    courierId?: string, 
    notes?: string,
    signature?: { signerName: string, signedAt: number }
  ): Promise<void> {
    const packages = await DatabaseService.getPackages();
    const pkgIndex = packages.findIndex(p => p.id === pkgId);
    if (pkgIndex === -1) return;

    const p = packages[pkgIndex];
    const oldStatus = p.status;
    const history: PackageStatusHistory = {
      status,
      timestamp: Date.now(),
      notes: notes || `Changement de statut vers ${status}`
    };

    const updatedPkg = { 
      ...p, 
      status, 
      courierId: courierId || p.courierId,
      updatedAt: Date.now(),
      statusHistory: [...(p.statusHistory || []), history],
      deliverySignature: signature || p.deliverySignature
    };

    packages[pkgIndex] = updatedPkg;
    localStorage.setItem(DatabaseService.STORAGE_KEYS.PACKAGES, JSON.stringify(packages));

    // Gestion Financière lors de la livraison
    if (status === PackageStatus.DELIVERED && oldStatus !== PackageStatus.DELIVERED && updatedPkg.courierId) {
      const users = await DatabaseService.getUsers();
      const courierIndex = users.findIndex(u => u.id === updatedPkg.courierId);
      if (courierIndex > -1) {
        const courier = users[courierIndex];
        const appFee = updatedPkg.price * 0.05; // 5% application
        const courierGain = updatedPkg.price * 0.95; // 95% gain
        
        users[courierIndex] = {
          ...courier,
          walletBalance: (courier.walletBalance || 0) - appFee, // Retrait de la caution
          earningsBalance: (courier.earningsBalance || 0) + courierGain // Ajout aux gains
        };
        localStorage.setItem(DatabaseService.STORAGE_KEYS.USERS, JSON.stringify(users));
        DatabaseService.notifyOthers('UPDATE_USERS');
      }
    }

    // Notifications automatiques
    if (status === PackageStatus.ACCEPTED) {
        await DatabaseService.createNotification({
            id: Math.random().toString(36).substr(2, 9),
            userId: p.senderId,
            title: "Livreur trouvé !",
            message: `Un livreur a accepté votre colis ${p.trackingNumber}.`,
            isRead: false,
            timestamp: Date.now(),
            relatedPackageId: p.id
        });
    } else if (status === PackageStatus.DELIVERED) {
        await DatabaseService.createNotification({
            id: Math.random().toString(36).substr(2, 9),
            userId: p.senderId,
            title: "Colis livré",
            message: `Votre colis ${p.trackingNumber} a été livré avec succès.`,
            isRead: false,
            timestamp: Date.now(),
            relatedPackageId: p.id
        });
    }

    DatabaseService.notifyOthers('UPDATE_PACKAGES');
  }

  // --- NOTIFICATIONS ---
  static async getNotifications(userId: string): Promise<AppNotification[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(DatabaseService.STORAGE_KEYS.NOTIFS);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    return all.filter(n => n.userId === userId);
  }

  static async createNotification(notif: AppNotification): Promise<void> {
    const data = localStorage.getItem(DatabaseService.STORAGE_KEYS.NOTIFS);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    all.unshift(notif);
    localStorage.setItem(DatabaseService.STORAGE_KEYS.NOTIFS, JSON.stringify(all));
    DatabaseService.notifyOthers('NEW_NOTIFICATION');
  }

  static async markNotificationRead(notifId: string): Promise<void> {
    const data = localStorage.getItem(DatabaseService.STORAGE_KEYS.NOTIFS);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    const updated = all.map(n => n.id === notifId ? { ...n, isRead: true } : n);
    localStorage.setItem(DatabaseService.STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
    DatabaseService.notifyOthers('NEW_NOTIFICATION');
  }
}
