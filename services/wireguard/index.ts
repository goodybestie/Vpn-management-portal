/**
 * Foundation Polytechnic VPN Management Portal
 * WireGuard Service Factory & Module Exports
 */

import { IWireGuardService } from './WireGuardService';
import { RealWireGuardService } from './RealWireGuardService';
import { MockWireGuardService } from './MockWireGuardService';

export * from './WireGuardService';
export * from './RealWireGuardService';
export * from './MockWireGuardService';
export * from './clientSyncService';

export type WireGuardServiceMode = 'real' | 'mock' | 'auto';

class WireGuardServiceFactory {
  private static instance: WireGuardServiceFactory;
  private realService: RealWireGuardService;
  private mockService: MockWireGuardService;
  private activeMode: WireGuardServiceMode = 'auto';
  private cachedService: IWireGuardService | null = null;

  private constructor() {
    this.realService = new RealWireGuardService();
    this.mockService = new MockWireGuardService();
    
    // Explicit environment override check
    if (process.env.WG_USE_MOCK === 'true' || process.env.WG_SERVICE_MODE === 'mock') {
      this.activeMode = 'mock';
    } else if (process.env.WG_SERVICE_MODE === 'real') {
      this.activeMode = 'real';
    } else {
      this.activeMode = 'auto';
    }
  }

  public static getInstance(): WireGuardServiceFactory {
    if (!WireGuardServiceFactory.instance) {
      WireGuardServiceFactory.instance = new WireGuardServiceFactory();
    }
    return WireGuardServiceFactory.instance;
  }

  /**
   * Resolves the appropriate service instance.
   * Defaults to RealWireGuardService when WireGuard is installed and configured on the machine.
   */
  public async resolveService(): Promise<IWireGuardService> {
    if (this.activeMode === 'mock') {
      return this.mockService;
    }

    if (this.activeMode === 'real') {
      return this.realService;
    }

    // Auto mode: Detect whether wg.exe is available
    const isRealAvailable = await this.realService.isAvailable();
    if (isRealAvailable) {
      return this.realService;
    }

    // When WireGuard is not installed on the current host (e.g. cloud sandbox), use Mock adapter
    return this.mockService;
  }

  /**
   * Synchronous getter returning the currently cached or best-guess service instance
   */
  public getService(): IWireGuardService {
    if (this.cachedService) {
      return this.cachedService;
    }

    if (this.activeMode === 'mock') {
      this.cachedService = this.mockService;
      return this.mockService;
    }

    if (this.activeMode === 'real') {
      this.cachedService = this.realService;
      return this.realService;
    }

    // Default to RealWireGuardService instance; RealWireGuardService handles missing binary gracefully
    this.cachedService = this.realService;
    return this.realService;
  }

  public getRealService(): RealWireGuardService {
    return this.realService;
  }

  public getMockService(): MockWireGuardService {
    return this.mockService;
  }

  public setMode(mode: WireGuardServiceMode): void {
    this.activeMode = mode;
    this.cachedService = mode === 'mock' ? this.mockService : this.realService;
  }

  public getMode(): WireGuardServiceMode {
    return this.activeMode;
  }
}

export const wireGuardFactory = WireGuardServiceFactory.getInstance();
export const getWireGuardService = (): IWireGuardService => wireGuardFactory.getService();
