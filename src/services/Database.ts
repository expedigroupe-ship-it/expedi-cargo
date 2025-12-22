
import { Package, User, AppNotification, PackageStatus } from '../types';

/**
 * Ce service simule les appels à un serveur Backend (ex: Node.js, Firebase ou Supabase).
 * Pour un déploiement réel sur différents appareils, les appels localStorage seraient 
 * remplacés par des appels fetch() vers une API réelle.
 */
export class DatabaseService {
  private static STORAGE_KEYS = {
    PACKAGES: 'expedi_cargo_db_packages',
    USERS: 'expedi_cargo_db_users',
    NOTIFS: 'expedi_cargo_db_notifications'
  };

  // --- PACKAGES ---
  static async savePackage(pkg: Package): Promise<Package> {
    console.log("[BACKEND] Enregistrement du colis sur le serveur...", pkg.trackingNumber);
    await this.delay(800); // Simulation latence réseau
    const packages = await this.getPackages();
    const updated = [pkg, ...packages];
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
    return pkg;
  }

  static async getPackages(): Promise<Package[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.PACKAGES);
    return data ? JSON.parse(data) : [];
  }

  static async updatePackageStatus(pkgId: string, status: PackageStatus, courierId?: string): Promise<void> {
    console.log(`[BACKEND] Mise à jour du colis ${pkgId} vers ${status}`);
    const packages = await this.getPackages();
    const updated = packages.map(p => {
      if (p.id === pkgId) {
        return { ...p, status, courierId: courierId || p.courierId };
      }
      return p;
    });
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
  }

  // --- USERS ---
  static async getUsers(): Promise<User[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static async saveUser(user: User): Promise<void> {
    const users = await this.getUsers();
    const exists = users.findIndex(u => u.id === user.id);
    if (exists > -1) users[exists] = user;
    else users.push(user);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static async updateUserBalances(userId: string, wallet: number, earnings: number): Promise<void> {
    const users = await this.getUsers();
    const updated = users.map(u => {
      if (u.id === userId) return { ...u, walletBalance: wallet, earningsBalance: earnings };
      return u;
    });
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(updated));
  }

  // --- NOTIFICATIONS ---
  static async getNotifications(userId: string): Promise<AppNotification[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.NOTIFS);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    return all.filter(n => n.userId === userId);
  }

  static async createNotification(notif: AppNotification): Promise<void> {
    const data = localStorage.getItem(this.STORAGE_KEYS.NOTIFS);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    all.unshift(notif);
    localStorage.setItem(this.STORAGE_KEYS.NOTIFS, JSON.stringify(all));
  }

  static async markNotificationRead(notifId: string): Promise<void> {
    const data = localStorage.getItem(this.STORAGE_KEYS.NOTIFS);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    const updated = all.map(n => n.id === notifId ? { ...n, isRead: true } : n);
    localStorage.setItem(this.STORAGE_KEYS.NOTIFS, JSON.stringify(updated));
  }

  private static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
