import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BikeComponent, MetricData, PmcData, EventGoal } from './types';
import { AthleteProfile, PlannedWorkout, ActualWorkout } from './domain/models';
import { format, subDays, addDays } from 'date-fns';
import { generatePMC } from './lib/trainingEngine';
import { adaptPlan } from './lib/adaptationEngine';

interface AppState {
  syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'not_available';
  lastSyncedAt: string | null;
  setSyncStatus: (status: 'idle' | 'syncing' | 'success' | 'error' | 'not_available') => void;
  setLastSyncedAt: (date: string) => void;


  athleteProfile: AthleteProfile | null;
  setAthleteProfile: (profile: AthleteProfile) => void;
  updateAthleteProfile: (updates: Partial<AthleteProfile>) => void;
  resetAthleteProfile: () => void;

  plannedWorkouts: PlannedWorkout[];
  actualWorkouts: ActualWorkout[];
  
  components: BikeComponent[];
  metrics: MetricData[];
  pmc: PmcData[];
  events: EventGoal[];
  ftp: number;

  setFtp: (ftp: number) => void;
  
  addPlannedWorkout: (p: PlannedWorkout) => void;
  updatePlannedWorkout: (p: PlannedWorkout) => void;
  removePlannedWorkout: (id: string) => void;
  runAdaptation: () => void;
  setPlannedWorkouts: (workouts: PlannedWorkout[]) => void;
  
  addActualWorkout: (a: ActualWorkout) => void;
  updateActualWorkout: (a: ActualWorkout) => void;
  removeActualWorkout: (id: string) => void;

  addComponent: (c: BikeComponent) => void;
  updateComponent: (c: BikeComponent) => void;
  removeComponent: (id: string) => void;
  
  addEvent: (e: EventGoal) => void;
  updateEvent: (e: EventGoal) => void;
  removeEvent: (id: string) => void;
}



export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      
      
      syncStatus: 'idle',
      lastSyncedAt: null,
      setSyncStatus: (status) => set({ syncStatus: status }),
      setLastSyncedAt: (date) => set({ lastSyncedAt: date }),
      athleteProfile: null,


      setAthleteProfile: (profile) => set({ athleteProfile: profile }),
      updateAthleteProfile: (updates) => set((state) => ({ 
        athleteProfile: state.athleteProfile ? { ...state.athleteProfile, ...updates } : null 
      })),
      resetAthleteProfile: () => set({ athleteProfile: null, plannedWorkouts: [], actualWorkouts: [], components: [], events: [], metrics: [], pmc: [] }),

      plannedWorkouts: [],
      actualWorkouts: [],
      
      components: [],
      events: [],
      metrics: [],
      ftp: 250,
      pmc: [],

      setFtp: (ftp) => set((state) => ({ ftp, pmc: generatePMC(state.actualWorkouts, ftp, state.athleteProfile?.hrMax) })),
      
      setPlannedWorkouts: (workouts) => set({ plannedWorkouts: workouts }),
      runAdaptation: () => set((state) => {
        if (!state.athleteProfile) return state;
        const result = adaptPlan(state.athleteProfile, state.plannedWorkouts, state.actualWorkouts, state.pmc);
        if (result.changed) {
          return { plannedWorkouts: result.updatedPlannedWorkouts };
        }
        return state;
      }),
      addPlannedWorkout: (p) => set((state) => ({ plannedWorkouts: [...state.plannedWorkouts, p] })),
      updatePlannedWorkout: (updated) => set((state) => ({
        plannedWorkouts: state.plannedWorkouts.map(p => p.id === updated.id ? updated : p)
      })),
      removePlannedWorkout: (id) => set((state) => ({
        plannedWorkouts: state.plannedWorkouts.filter(p => p.id !== id)
      })),
      
      addActualWorkout: (a) => set((state) => {
        const newActual = [...state.actualWorkouts, a];
        return { actualWorkouts: newActual, pmc: generatePMC(newActual, state.ftp, state.athleteProfile?.hrMax) };
      }),
      updateActualWorkout: (updated) => set((state) => {
        const newActual = state.actualWorkouts.map(a => a.id === updated.id ? updated : a);
        return { actualWorkouts: newActual, pmc: generatePMC(newActual, state.ftp, state.athleteProfile?.hrMax) };
      }),
      removeActualWorkout: (id) => set((state) => {
        const newActual = state.actualWorkouts.filter(a => a.id !== id);
        return { actualWorkouts: newActual, pmc: generatePMC(newActual, state.ftp, state.athleteProfile?.hrMax) };
      }),

      addComponent: (c) => set((state) => ({ components: [...state.components, c] })),
      updateComponent: (updated) => set((state) => ({
        components: state.components.map(c => c.id === updated.id ? updated : c)
      })),
      removeComponent: (id) => set((state) => ({
        components: state.components.filter(c => c.id !== id)
      })),

      addEvent: (e) => set((state) => ({ events: [...state.events, e] })),
      updateEvent: (updated) => set((state) => ({
        events: state.events.map(e => e.id === updated.id ? updated : e)
      })),
      removeEvent: (id) => set((state) => ({
        events: state.events.filter(e => e.id !== id)
      }))
    }),
    {
      name: 'plana-storage',
      partialize: (state) => ({ athleteProfile: state.athleteProfile, ftp: state.ftp, plannedWorkouts: state.plannedWorkouts, actualWorkouts: state.actualWorkouts, components: state.components, metrics: state.metrics, events: state.events, pmc: state.pmc }),
    }
  )
);
