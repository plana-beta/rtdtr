import { Sport } from './models';
import { ConfidenceLevel } from './coachTypes';

export type { ConfidenceLevel };

export type WorkoutRpe = 1 | 2 | 3 | 4 | 5;

export type PostWorkoutFeeling = 'very_good' | 'good' | 'tired' | 'very_tired';

export interface WorkoutFeedback {
  id: string;
  workoutId?: string; // Planned workout id reference
  actualWorkoutId?: string; // Actual workout id reference
  planId?: string;
  date: string; // YYYY-MM-DD
  sport: Sport;
  durationMin: number;
  distanceKm?: number;
  rpe: WorkoutRpe;
  feeling?: PostWorkoutFeeling;
  comment?: string;
  temperature?: number;
  createdAt: string; // ISO
}

export type ObservationType =
  | 'WORKOUT_COMPLETED_AS_PLANNED'
  | 'DURATION_LONGER_THAN_PLANNED'
  | 'DURATION_SHORTER_THAN_PLANNED'
  | 'HIGH_PERCEIVED_EFFORT'
  | 'LOW_PERCEIVED_EFFORT'
  | 'INTENSITY_DISCREPANCY'
  | 'POSITIVE_WORKOUT_EXPERIENCE'
  | 'HIGH_FATIGUE_REPORTED'
  | 'TEMPERATURE_CONTEXT';

export interface WorkoutObservation {
  id: string;
  workoutId?: string;
  actualWorkoutId?: string;
  date: string;
  type: ObservationType;
  title: string;
  description: string;
  metricsComparison?: {
    plannedDuration?: number;
    actualDuration?: number;
    plannedTss?: number;
    actualTss?: number;
    rpe?: number;
    temperature?: number;
  };
  createdAt: string;
}

export type HabitType =
  | 'HIGH_RPE_ON_INTENSITY'
  | 'FATIGUE_AFTER_CONSECUTIVE_DAYS'
  | 'SESSION_SHORTENING_TREND'
  | 'SPORT_VOLUME_TOLERANCE'
  | 'REGULAR_WEEKEND_LONG_SESSION';

export interface AthleteHabit {
  id: string;
  type: HabitType | string;
  category?: string;
  description: string;
  occurrenceCount: number;
  period: string;
  confidence: ConfidenceLevel;
  sources: string[];
  lastObservedAt: string;
  firstObservedAt?: string;
}

export type PreferenceType = 'PERSISTENT' | 'TEMPORARY';

export interface AthletePreference {
  id: string;
  category: 'workout_type' | 'schedule' | 'sport' | 'dislike' | 'general';
  statement: string;
  isConfirmed: boolean;
  type: PreferenceType;
  startDate?: string;
  endDate?: string;
  source: 'user_explicit' | 'coach_confirmed';
  createdAt: string;
}

export interface SimilarWorkoutsStat {
  status: 'AVAILABLE' | 'INSUFFICIENT_DATA';
  sport?: Sport;
  sampleSize: number;
  averageRpe?: number;
  averageDurationMin?: number;
  averageTss?: number;
  summary: string;
}
