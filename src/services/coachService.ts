import { useAppStore } from '../store';
import { format, startOfDay } from 'date-fns';

export interface CoachContext {
  profile: any;
  todayWorkout: any;
  recentWorkouts: any[];
  pmcStatus: any;
}

export interface CoachResponse {
  success: boolean;
  message: string;
  suggestedAction?: 'OPEN_TODAY_WORKOUT' | 'OPEN_PLAN' | 'SYNC_HEALTH' | null;
  error?: string;
}

export class CoachService {
  private buildContext(): CoachContext {
    const store = useAppStore.getState();
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    
    // Profile safely stripped of PII if any, just keeping fitness data
    const profile = store.athleteProfile ? {
      level: store.athleteProfile.level,
      goal: store.athleteProfile.goal,
      availability: store.athleteProfile.availability,
    } : null;

    const todayWorkout = store.plannedWorkouts.find(p => p.date === today);
    
    // Get last 3 actual workouts
    const sortedActuals = [...store.actualWorkouts].sort((a, b) => b.date.localeCompare(a.date));
    const recentWorkouts = sortedActuals.slice(0, 3).map(w => ({
      date: w.date,
      sport: w.sport,
      durationMin: w.durationMin,
      tss: w.tss
    }));

    // Current PMC status (latest)
    const currentPmc = store.pmc.find(p => p.date === today) || 
                       (store.pmc.length > 0 ? store.pmc[store.pmc.length - 1] : null);
    
    let fatigueLevel = 'normal';
    if (currentPmc) {
      if (currentPmc.tsb < -20 || currentPmc.atl > 80) fatigueLevel = 'high';
      if (currentPmc.tsb < -30) fatigueLevel = 'extreme';
    }

    return {
      profile,
      todayWorkout: todayWorkout ? {
         sport: todayWorkout.sport,
         duration: todayWorkout.targetDurationMin,
         intensity: todayWorkout.targetIntensity,
         status: todayWorkout.status,
         explanation: todayWorkout.explanation
      } : null,
      recentWorkouts,
      pmcStatus: currentPmc ? {
        ctl: Math.round(currentPmc.ctl),
        atl: Math.round(currentPmc.atl),
        tsb: Math.round(currentPmc.tsb),
        fatigueLevel
      } : null
    };
  }

  async askCoach(prompt: string): Promise<CoachResponse> {
    const context = this.buildContext();
    
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, context })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("[CoachService] Network error:", error);
      return {
        success: false,
        message: "Désolé, je ne parviens pas à accéder au serveur pour le moment (mode hors-ligne ou erreur réseau).",
        error: error.message
      };
    }
  }
}

export const coachService = new CoachService();
