import { IWireGuardService } from './IWireGuardService';
import { RealWireGuardService } from './RealWireGuardService';
import { MockWireGuardService } from './MockWireGuardService';

class WireGuardManager {
  private static instance: WireGuardManager;
  private activeService: IWireGuardService;
  private isDetectedReal = false;
  private realService: RealWireGuardService;
  private mockService: MockWireGuardService;

  private constructor() {
    this.realService = new RealWireGuardService();
    this.mockService = new MockWireGuardService();

    // Default to Mock, test if Real is available
    this.activeService = this.mockService;
    this.detectService();
  }

  public static getInstance(): WireGuardManager {
    if (!WireGuardManager.instance) {
      WireGuardManager.instance = new WireGuardManager();
    }
    return WireGuardManager.instance;
  }

  private async detectService() {
    // Check if on Windows and wg executable is present
    try {
      const check = await this.realService.checkInstallation();
      if (check.installed) {
        this.activeService = this.realService;
        this.isDetectedReal = true;
        console.log(`[WireGuardManager] Detected native WireGuard CLI at: ${check.path}`);
      } else {
        this.activeService = this.mockService;
        this.isDetectedReal = false;
        console.log(`[WireGuardManager] Using MockWireGuardService: ${check.details}`);
      }
    } catch {
      this.activeService = this.mockService;
      this.isDetectedReal = false;
    }
  }

  public getService(): IWireGuardService {
    return this.activeService;
  }

  public isRealWireGuard(): boolean {
    return this.isDetectedReal;
  }

  /**
   * Force switch between Real and Mock (useful for testing on administrator's machine)
   */
  public forceServiceMode(useReal: boolean) {
    this.activeService = useReal ? this.realService : this.mockService;
  }
}

export const wireGuardManager = WireGuardManager.getInstance();
