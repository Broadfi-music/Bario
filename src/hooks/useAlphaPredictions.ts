import { useState, useCallback, useEffect } from 'react';

const SUPABASE_URL = 'https://sufbohhsxlrefkoubmed.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZmJvaGhzeGxyZWZrb3VibWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODY3NjAsImV4cCI6MjA4MDQ2Mjc2MH0.1Ms3xhguJjQ-bbPronddzgO-XCYcTZTkcWS-uUMg1q4';

export interface PredictionMarket {
  id: string;
  songTitle: string;
  artist: string;
  artwork: string;
  status: 'surging' | 'stable' | 'cooling' | 'underground';
  outcome: string;
  probability: number;
  fanProbability: number;
  aiProbability: number;
  totalForecasts: number;
  fanAccuracy: number;
  aiAccuracy: number;
  horizon: string;
  isWatchlisted: boolean;
  change24h: number;
  listeners: string;
  monthlyListeners: number;
  marketCap: string;
  previewUrl?: string | null;
  deezerUrl?: string | null;
  audiusUrl?: string | null;
  source: 'deezer' | 'audius';
}

export interface AIModel {
  name: string;
  model: string;
  accuracy: number;
  specialty: string;
  predictions: number;
  icon: string;
}

export interface FanForecaster {
  name: string;
  avatar: string;
  winRate: number;
  predictions: number;
  tags: string[];
  xp: number;
  rank: number;
}

export interface AlphaStats {
  activeMarkets: number;
  totalPredictions: number;
  avgAccuracy: number;
  lastUpdated: string;
}

export function useAlphaPredictions() {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [fanForecasters, setFanForecasters] = useState<FanForecaster[]>([]);
  const [stats, setStats] = useState<AlphaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/alpha-predictions?action=markets`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.markets) {
        setMarkets(data.markets);
        setAiModels(data.aiModels || []);
        setFanForecasters(data.fanForecasters || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching alpha predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitPrediction = useCallback(async (marketId: string, prediction: 'will' | 'wont', confidence: number, userId?: string) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/alpha-predictions?action=predict`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          },
          body: JSON.stringify({ marketId, prediction, confidence, userId })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error submitting prediction:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Real-time updates
  useEffect(() => {
    if (markets.length === 0) return;

    const interval = setInterval(() => {
      setMarkets(prev => prev.map(market => ({
        ...market,
        probability: Math.max(5, Math.min(95, market.probability + (Math.random() - 0.5) * 3)),
        fanProbability: Math.max(5, Math.min(95, market.fanProbability + (Math.random() - 0.5) * 2)),
        aiProbability: Math.max(5, Math.min(95, market.aiProbability + (Math.random() - 0.5) * 2)),
        change24h: parseFloat((market.change24h + (Math.random() - 0.5) * 1.5).toFixed(1)),
        totalForecasts: market.totalForecasts + Math.floor(Math.random() * 10)
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, [markets.length]);

  return { markets, aiModels, fanForecasters, stats, loading, error, refetch: fetchMarkets, submitPrediction };
}
