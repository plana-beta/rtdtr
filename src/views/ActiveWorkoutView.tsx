import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Pause, ChevronLeft } from 'lucide-react';
import { PlannedWorkout, ActualWorkout } from '../domain/models';
import { useAppStore } from '../store';
import { format } from 'date-fns';

interface Props {
  plannedWorkout: PlannedWorkout;
  onClose: () => void;
}

export default function ActiveWorkoutView({ plannedWorkout, onClose }: Props) {
  const addActualWorkout = useAppStore(s => s.addActualWorkout);
  const updatePlannedWorkout = useAppStore(s => s.updatePlannedWorkout);
  
  const [status, setStatus] = useState<'ready' | 'active' | 'paused' | 'finished'>('ready');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (status === 'active') {
      interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleStart = () => setStatus('active');
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('active');
  
  const handleFinish = () => {
    setStatus('finished');
    
    // Save ActualWorkout
    const actual: ActualWorkout = {
      id: crypto.randomUUID(),
      source: 'demo',
      sport: plannedWorkout.sport,
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: new Date().toISOString(),
      durationMin: Math.max(1, Math.round(elapsedSeconds / 60)), // minimum 1 min
      plannedWorkoutId: plannedWorkout.id,
      averageHeartRate: 142, // demo data
      distanceKm: plannedWorkout.sport === 'Run' ? 5.2 : plannedWorkout.sport === 'Ride' ? 25 : undefined,
    };
    
    addActualWorkout(actual);
    updatePlannedWorkout({ ...plannedWorkout, status: 'completed' });
    onClose();
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} className="fixed inset-0 z-50 bg-plana-black text-white flex flex-col">
      <div className="p-5 flex items-center justify-between pt-12">
        <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
          <ChevronLeft size={20} />
        </button>
        <div className="font-bold tracking-wide">{plannedWorkout.sport.toUpperCase()}</div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <h2 className="text-2xl font-black mb-8 text-center">{plannedWorkout.title}</h2>
        
        <div className="text-7xl font-black tracking-tighter mb-12 text-plana-orange">
          {formatTime(elapsedSeconds)}
        </div>

        {status === 'ready' && (
          <div className="text-center text-slate-400 font-medium max-w-xs mb-8">
            Objectif: {plannedWorkout.targetDurationMin} min en {plannedWorkout.targetIntensity.value}
          </div>
        )}
      </div>

      <div className="p-8 pb-16 flex justify-center gap-6">
        {status === 'ready' && (
          <button onClick={handleStart} className="w-20 h-20 bg-plana-orange rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(255,107,0,0.4)] active:scale-95 transition-transform">
            <Play size={32} fill="currentColor" className="ml-2" />
          </button>
        )}
        
        {status === 'active' && (
          <button onClick={handlePause} className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
            <Pause size={32} fill="currentColor" />
          </button>
        )}

        {status === 'paused' && (
          <>
            <button onClick={handleResume} className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
              <Play size={32} fill="currentColor" className="ml-2" />
            </button>
            <button onClick={handleFinish} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] active:scale-95 transition-transform">
              <Square size={28} fill="currentColor" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
