
import { Package, User, AppNotification, PackageStatus, PackageStatusHistory } from '../types';

export class DatabaseService {
  private static STORAGE_KEYS = {
    PACKAGES: 'expedi_cargo_db_packages',
    USERS: 'expedi_cargo_db_users',
    NOTIFS: 'expedi_cargo_db_notifications'
  };

  private static channel: BroadcastChannel | null = typeof window !== 'undefined' ? new BroadcastChannel('expedi_cargo_sync') : null;

  static onMessage(callback: (data: any) => void) {
    if (this.channel) {
      this.channel.onmessage = (event) => callback(event.data);
    }
  }

  private static notifyOthers(type: 'UPDATE_PACKAGES' | 'UPDATE_USERS' | 'NEW_NOTIFICATION') {
    if (this.channel) {
      this.channel.postMessage({ type, timestamp: Date.now() });
    }
  }

  // --- USERS ---
  static async getUsers(): Promise<User[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static async isPhoneTaken(phone: string): Promise<boolean> {
    const users = await this.getUsers();
    return users.some(u => u.phone === phone);
  }

  static async saveUser(user: User): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id || u.phone === user.phone);
    if (index > -1) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push({ ...user, createdAt: user.createdAt || Date.now() });
    }
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

  // --- PACKAGES ---
  static async getPackages(): Promise<Package[]> {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEYS.PACKAGES);
    return data ? JSON.parse(data) : [];
  }

  static async savePackage(pkg: Package): Promise<Package> {
    const packages = await this.getPackages();
    if (!pkg.statusHistory) {
      pkg.statusHistory = [{
        status: pkg.status,
        timestamp: Date.now(),
        notes: "Colis enregistré sur la plateforme"
      }];
    }
    const updated = [pkg, ...packages];
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
    this.notifyOthers('UPDATE_PACKAGES');
    return pkg;
  }

  static async updatePackageStatus(
    pkgId: string, 
    status: PackageStatus, 
    courierId?: string, 
    notes?: string,
    signature?: { signerName: string, signedAt: number }
  ): Promise<void> {
    const packages = await this.getPackages();
    const updated = packages.map(p => {
      if (p.id === pkgId) {
        const history: PackageStatusHistory = {
          status,
          timestamp: Date.now(),
          notes: notes || `Changement de statut vers ${status}`
        };
        
        return { 
          ...p, 
          status, 
          courierId: courierId || p.courierId,
          updatedAt: Date.now(),
          statusHistory: [...(p.statusHistory || []), history],
          deliverySignature: signature || p.deliverySignature
        };
      }
      return p;
    });
    localStorage.setItem(this.STORAGE_KEYS.PACKAGES, JSON.stringify(updated));
    this.notifyOthers('UPDATE_PACKAGES');
  }

  // --- NOTIFICATIONS ---
  static async getNotifications(userId: string): Promise<AppNotification[]> {
    if (typeof window === 'undefined') return [];
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
}
