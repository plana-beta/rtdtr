import { HealthAdapter, HealthConnectionStatus, ExternalWorkout } from './types';

export class StravaAdapter implements HealthAdapter {
  async isAvailable(): Promise<boolean> {
    return true; // Always available on web via backend
  }

  async requestPermissions(): Promise<boolean> {
    // Initiate OAuth flow by redirecting to backend
    window.location.href = '/api/strava/auth';
    return false; // Will return false here as we navigate away
  }

  async getConnectionStatus(): Promise<HealthConnectionStatus> {
    try {
      const response = await fetch('/api/strava/status');
      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          connected: data.connected
        };
      }
      return { available: true, connected: false };
    } catch (e) {
      return { available: true, connected: false, error: 'Serveur injoignable' };
    }
  }

  async getWorkouts(startDate: Date, endDate: Date): Promise<ExternalWorkout[]> {
    try {
      // Calculate Unix timestamp for 'after' parameter
      const after = Math.floor(startDate.getTime() / 1000);
      
      const response = await fetch(`/api/strava/activities?after=${after}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Strava via backend');
      }
      
      const workouts = await response.json();
      return workouts as ExternalWorkout[];
    } catch (err) {
      console.error(err);
      throw new Error('Impossible de récupérer les activités Strava');
    }
  }

  async disconnect(): Promise<void> {
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' });
    } catch (err) {
      console.error('Failed to disconnect from Strava', err);
    }
  }
}
