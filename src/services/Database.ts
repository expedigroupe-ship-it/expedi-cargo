
import { Package, User, AppNotification, PackageStatus } from '../types';

/**
 * DATABASE SERVICE (MOCK BACKEND)
 * Pour un environnement de production, remplacez les appels localStorage/BroadcastChannel
 * par des appels fetch() vers votre API Node.js/Python/Firebase.
 */
export class DatabaseService {
  private static STORAGE_KEYS = {
    PACKAGES: 'expedi_cargo_db_packages',
    USERS: 'expedi_cargo_db_users',
    NOTIFS: 'expedi_cargo_db_notifications'
  };

  // Canal de communication en temps réel (Inter-onglets)
  private static channel = new BroadcastChannel('expedi_cargo_sync');

  static onMessage(callback: (data: any) => void) {
    this.channel.onmessage = (event) => callback(event.data);
  }

  private static notifyOthers(type: 'UPDATE_PACKAGES' | 'UPDATE_USERS' | 'NEW_NOTIFICATION') {
    this.channel.postMessage({ type, timestamp: Date.now() });
  }

  // --- PACKAGES ---
  static async savePackage(pkg: Package): Promise<Package> {
    await this.delay(1000); // Simulation temps de traitement serveur
    const packages = await this.getPackages();
    const updated = [pkg, ...packages];
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
    
    this.notifyOthers('UPDATE_PACKAGES');
    return pkg;
  }

  static async getPackages(): Promise<Package[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.PACKAGES);
    return data ? JSON.parse(data) : [];
  }

  static async updatePackageStatus(pkgId: string, status: PackageStatus, courierId?: string): Promise<void> {
    const packages = await this.getPackages();
    const updated = packages.map(p => {
      if (p.id === pkgId) {
        return { ...p, status, courierId: courierId || p.courierId };
      }
      return p;
    });
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
    this.notifyOthers('UPDATE_PACKAGES');
  }

  // --- USERS ---
  static async getUsers(): Promise<User[]> {
    const data = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static async saveUser(user: User): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id || u.phone === user.phone);
    if (index > -1) users[index] = { ...users[index], ...user };
    else users.push(user);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    this.notifyOthers('UPDATE_USERS');
  }

  static async updateUserBalances(userId: string, wallet: number, earnings: number): Promise<void> {
    const users = await this.getUsers();
    const updated = users.map(u => {
      if (u.id === userId) return { ...u, walletBalance: wallet, earningsBalance: earnings };
      return u;
    });
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(updated));
    this.notifyOthers('UPDATE_USERS');
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
    this.notifyOthers('NEW_NOTIFICATION');
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
