import { HealthAdapter, HealthConnectionStatus } from './adapters/types';
import { HealthKitAdapter } from './adapters/HealthKitAdapter';
import { HealthConnectAdapter } from './adapters/HealthConnectAdapter';
import { DemoAdapter } from './adapters/DemoAdapter';
import { StravaAdapter } from './adapters/StravaAdapter';
import { useAppStore } from '../store';
import { normalizeWorkout, isDuplicateWorkout, matchToPlannedWorkout } from './SyncService';

class HealthService {
  private adapters: Record<string, HealthAdapter>;
  private demoAdapter: DemoAdapter;

  constructor() {
    this.demoAdapter = new DemoAdapter();
    this.adapters = {
      apple_health: new HealthKitAdapter(),
      google_health_connect: new HealthConnectAdapter(),
      demo: this.demoAdapter,
      strava: new StravaAdapter()
    };
  }

  private getAdapter(source: string): HealthAdapter | null {
    if (source === 'none') return null;
    return this.adapters[source] || null;
  }

  async connect(provider: string): Promise<boolean> {
    const adapter = this.getAdapter(provider);
    if (!adapter) return false;

    const available = await adapter.isAvailable();
    if (!available) {
      console.warn(`[HealthService] ${provider} is not available on this platform.`);
      return false;
    }

    return await adapter.requestPermissions();
  }

  async disconnect(provider: string): Promise<void> {
    const adapter = this.getAdapter(provider);
    if (adapter) {
      await adapter.disconnect();
    }
  }

  async getConnectionStatus(provider: string): Promise<HealthConnectionStatus> {
    const adapter = this.getAdapter(provider);
    if (!adapter) return { available: false, connected: false };
    return await adapter.getConnectionStatus();
  }

  async syncWorkouts(provider: string): Promise<{ success: boolean; message: string; count?: number }> {
    const adapter = this.getAdapter(provider);
    if (!adapter) return { success: false, message: "Aucun fournisseur configuré." };

    const status = await adapter.getConnectionStatus();
    if (!status.available) {
      return { success: false, message: status.error || "Non disponible sur cet appareil." };
    }
    
    // Auto-connect if not connected for demo purposes or smooth flow
    if (!status.connected) {
      const granted = await adapter.requestPermissions();
      if (!granted) return { success: false, message: "Permissions refusées." };
    }

    // Determine sync window (e.g., last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const store = useAppStore.getState();
    try {
      const extWorkouts = await adapter.getWorkouts(startDate, endDate);
      const existingWorkouts = [...store.actualWorkouts];
      const plannedWorkouts = store.plannedWorkouts;
      
      let importedCount = 0;

      for (const ext of extWorkouts) {
        const actual = normalizeWorkout(ext);
        
        if (!isDuplicateWorkout(actual, existingWorkouts)) {
          // 1. Match to planned workout
          const matchedPlanned = matchToPlannedWorkout(actual, plannedWorkouts);
          
          if (matchedPlanned) {
            actual.plannedWorkoutId = matchedPlanned.id;
            // Update planned workout status
            store.updatePlannedWorkout({
              ...matchedPlanned,
              status: 'completed'
            });
          }
          
          // 2. Add to store
          store.addActualWorkout(actual);
          importedCount++;
          // Since existingWorkouts array reference might not update mid-loop if we don't fetch it, 
          // we should append to our local array for deduplication within the same batch
          existingWorkouts.push(actual);
        }
      }

      // Update sync status in store
      store.setSyncStatus('success');

      return { success: true, message: `${importedCount} entraînements importés`, count: importedCount };
    } catch (err) {
      store.setSyncStatus('error');
      return { success: false, message: "Erreur lors de la synchronisation." };
    }
  }
}

export const healthService = new HealthService();
