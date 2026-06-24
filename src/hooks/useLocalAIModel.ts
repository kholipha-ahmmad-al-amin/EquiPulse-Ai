import { useState, useEffect } from 'react';
import { get } from 'idb-keyval';
import { useStoreProfile } from './useStoreProfile';
import { useDailyRegister } from './useDailyRegister';
import type { LocalModelWeights, TrainingData } from '../workers/modelTrainer.worker';
import { getBaselineModel } from '../models/baselineModels';

const LOCAL_MODEL_KEY = 'equipulse_local_ai_model';

export function useLocalAIModel() {
  const [modelWeights, setModelWeights] = useState<LocalModelWeights | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { profile } = useStoreProfile();
  const { register } = useDailyRegister();

  // Load weights on mount
  useEffect(() => {
    async function loadWeights() {
      const weights = await get<LocalModelWeights>(LOCAL_MODEL_KEY);
      if (weights) {
        setModelWeights(weights);
      } else if (profile?.category) {
        // Provide baseline immediately if no weights exist yet
        const baseline = getBaselineModel(profile.category);
        setModelWeights({
          version: 0,
          lastTrained: new Date().toISOString(),
          category: baseline.category,
          customDayOfWeekMultipliers: [...baseline.dayOfWeekMultipliers],
          salesMomentum: 1.0,
          confidenceScore: 0, // Baseline implies zero custom confidence
        });
      }
    }
    loadWeights();
  }, [profile?.category]);

  const trainModel = () => {
    if (!profile?.category) return;

    setIsTraining(true);
    setLastError(null);

    // Prepare recent sales data (last 30 days max for training chunk)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = (register?.transactions || [])
      .filter((entry: { timestamp: string; type: string; amount: number; items?: unknown[] }) => new Date(entry.timestamp) > thirtyDaysAgo && entry.type === 'sale')
      .map((entry: { timestamp: string; amount: number; items?: unknown[] }) => ({
        date: entry.timestamp,
        total: entry.amount,
        itemsCount: entry.items?.length || 0
      }));

    const trainingData: TrainingData = {
      category: profile.category,
      recentSales
    };

    // Instantiate and call worker
    const worker = new Worker(new URL('../workers/modelTrainer.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      if (e.data.type === 'TRAINING_COMPLETE') {
        setModelWeights(e.data.payload);
        setIsTraining(false);
        worker.terminate();
      } else if (e.data.type === 'TRAINING_ERROR') {
        setLastError(e.data.error);
        setIsTraining(false);
        worker.terminate();
      }
    };

    worker.postMessage({ type: 'TRAIN_LOCAL_MODEL', payload: trainingData });
  };

  return {
    modelWeights,
    isTraining,
    lastError,
    trainModel
  };
}
