import { set, get } from 'idb-keyval';
import { getBaselineModel } from '../models/baselineModels';

export interface TrainingData {
  category: string;
  recentSales: {
    date: string; // ISO format
    total: number;
    itemsCount: number;
  }[];
}

export interface LocalModelWeights {
  version: number;
  lastTrained: string;
  category: string;
  // Adjusted multipliers from baseline
  customDayOfWeekMultipliers: number[];
  // Overall momentum/growth factor (1.0 = stable)
  salesMomentum: number;
  confidenceScore: number; // 0 to 100
}

const LOCAL_MODEL_KEY = 'equipulse_local_ai_model';

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent<{ type: string; payload: TrainingData }>) => {
  if (e.data.type === 'TRAIN_LOCAL_MODEL') {
    try {
      const { category, recentSales } = e.data.payload;
      
      console.log('[ModelTrainer Worker] Starting local on-device training...');
      
      // 1. Fetch current local weights or initialize from baseline
      let localModel: LocalModelWeights | undefined = await get(LOCAL_MODEL_KEY);
      const baseline = getBaselineModel(category);

      if (!localModel) {
        console.log('[ModelTrainer Worker] Cold start detected. Initializing from baseline heuristic.');
        localModel = {
          version: 1,
          lastTrained: new Date().toISOString(),
          category: baseline.category,
          customDayOfWeekMultipliers: [...baseline.dayOfWeekMultipliers],
          salesMomentum: 1.0,
          confidenceScore: 10, // Low confidence initially
        };
      }

      // 2. Perform mock "training" / statistical aggregation
      // In a full implementation, we would use DuckDB-WASM here to run complex SQL aggregations
      // or TensorFlow.js for deep learning. Here we use statistical heuristics.
      
      if (recentSales.length > 0) {
        // Calculate basic momentum
        const recentTotal = recentSales.reduce((acc, sale) => acc + sale.total, 0);
        const avgDaily = recentTotal / recentSales.length;
        
        // Slightly adjust momentum based on average daily sales vs a static baseline
        // This is a naive implementation for the hackathon MVP
        const newMomentum = avgDaily > 1000 ? 1.05 : 0.98;
        
        // Blend previous momentum with new momentum (exponential moving average)
        localModel.salesMomentum = (localModel.salesMomentum * 0.7) + (newMomentum * 0.3);
        
        // Increase confidence as we get more data
        localModel.confidenceScore = Math.min(100, localModel.confidenceScore + (recentSales.length * 2));
      }

      localModel.version += 1;
      localModel.lastTrained = new Date().toISOString();

      // 3. Save updated weights back to IndexedDB
      await set(LOCAL_MODEL_KEY, localModel);
      
      console.log('[ModelTrainer Worker] Training complete. New weights:', localModel);
      
      // 4. Post success back to main thread
      self.postMessage({ type: 'TRAINING_COMPLETE', payload: localModel });
      
    } catch (error) {
      console.error('[ModelTrainer Worker] Training failed', error);
      self.postMessage({ type: 'TRAINING_ERROR', error: String(error) });
    }
  }
};
