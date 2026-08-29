import { HealthAdapter, ExternalWorkout, HealthConnectionStatus } from './types';

export class HealthKitAdapter implements HealthAdapter {
  async isAvailable(): Promise<boolean> {
    // In a pure PWA/web environment, Apple HealthKit is never available.
    // This would be replaced by Capacitor/React Native bridge code in a native build.
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async getWorkouts(startDate: Date, endDate: Date): Promise<ExternalWorkout[]> {
    return [];
  }

  async getConnectionStatus(): Promise<HealthConnectionStatus> {
    return {
      available: false,
      connected: false,
      error: 'Apple HealthKit est indisponible dans le navigateur.'
    };
  }

  async disconnect(): Promise<void> {
    // No-op
  }
}
