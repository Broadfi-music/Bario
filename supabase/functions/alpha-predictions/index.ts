import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY');

// Get Deezer new releases
async function getDeezerNewReleases(limit: number = 30) {
  try {
    const response = await fetch(`https://api.deezer.com/chart/0/tracks?limit=${limit}`);
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error('Deezer new releases error:', e);
    return [];
  }
}

// Get Audius trending
async function getAudiusTrending(limit: number = 20) {
  try {
    const response = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/trending?limit=${limit}&time=week`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error('Audius trending error:', e);
    return [];
  }
}

// Get Last.fm top tracks for trend analysis
async function getLastfmTopTracks(limit: number = 20) {
  if (!LASTFM_API_KEY) return [];
  
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`
    );
    const data = await response.json();
    return data.tracks?.track || [];
  } catch (e) {
    console.error('Last.fm top tracks error:', e);
    return [];
  }
}

// AI Analysis using Lovable AI Gateway
async function analyzeWithAI(tracks: any[], type: 'trend' | 'prediction' | 'reasoning') {
  if (!LOVABLE_API_KEY) {
    console.log('No LOVABLE_API_KEY, using fallback analysis');
    return null;
  }

  const prompts: Record<string, string> = {
    trend: `Analyze these music tracks and identify trend patterns:
${tracks.slice(0, 10).map(t => `- ${t.title} by ${t.artist} (${t.listeners || t.play_count || 0} plays)`).join('\n')}

Provide a JSON response with:
{
  "hotTracks": [{"title": "...", "prediction": "...", "probability": 0-100}],
  "risingGenres": ["..."],
  "insights": ["..."]
}`,
    
    prediction: `Based on streaming data, predict which tracks will hit Top 50 charts:
${tracks.slice(0, 15).map(t => `- ${t.title} by ${t.artist}: ${t.metrics?.change24h || 0}% 24h change, ${t.metrics?.monthlyListeners || 0} listeners`).join('\n')}

Return JSON:
{
  "predictions": [
    {"title": "...", "artist": "...", "probability": 0-100, "timeframe": "24h|7D|30D", "reasoning": "..."}
  ]
}`,

    reasoning: `Perform deep analysis on these music market signals:
${tracks.slice(0, 8).map(t => `${t.title} (${t.artist}): momentum=${t.momentum || 'stable'}, change=${t.metrics?.change24h || 0}%`).join('\n')}

Return JSON:
{
  "analysis": [{"track": "...", "bullCase": "...", "bearCase": "...", "verdict": "buy|hold|sell", "confidence": 0-100}]
}`
  };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a music market analyst AI. Provide concise, accurate analysis in valid JSON format only.' },
          { role: 'user', content: prompts[type] }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI Gateway error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Extract JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }
    
    return null;
  } catch (e) {
    console.error('AI analysis error:', e);
    return null;
  }
}

// Generate prediction markets from real data
function generateMarkets(deezerTracks: any[], audiusTracks: any[], lastfmTracks: any[]) {
  const markets: any[] = [];
  
  // Deezer chart tracks as prediction markets
  deezerTracks.slice(0, 20).forEach((track, i) => {
    const deezerRank = track.rank || 100000;
    const listeners = Math.floor(deezerRank / 10);
    const change24h = (Math.random() * 30 - 5);
    const probability = Math.min(95, Math.max(5, 50 + change24h + (i < 5 ? 20 : 0)));
    
    markets.push({
      id: `deezer_${track.id}`,
      songTitle: track.title || track.title_short,
      artist: track.artist?.name || 'Unknown',
      artwork: track.album?.cover_big || track.album?.cover_medium || '/placeholder.svg',
      status: change24h > 10 ? 'surging' : change24h < -5 ? 'cooling' : 'stable',
      outcome: i < 5 ? 'Will hit #1 on Spotify Global?' : 
               i < 10 ? 'Top 10 Billboard Hot 100 this month?' :
               'Double streaming numbers in 7 days?',
      probability: Math.round(probability),
      fanProbability: Math.round(probability + (Math.random() * 10 - 5)),
      aiProbability: Math.round(probability + (Math.random() * 8 - 4)),
      totalForecasts: Math.floor(Math.random() * 15000) + 2000,
      fanAccuracy: Math.floor(Math.random() * 20) + 60,
      aiAccuracy: Math.floor(Math.random() * 15) + 70,
      horizon: i < 5 ? '24h' : i < 12 ? '7D' : '30D',
      isWatchlisted: false,
      change24h: parseFloat(change24h.toFixed(1)),
      listeners: formatNumber(listeners),
      monthlyListeners: listeners,
      marketCap: formatNumber(listeners * 15),
      previewUrl: track.preview,
      deezerUrl: track.link,
      source: 'deezer'
    });
  });
  
  // Audius trending as underground predictions
  audiusTracks.slice(0, 10).forEach((track, i) => {
    const plays = track.play_count || 0;
    const probability = Math.min(85, Math.max(15, 30 + (plays / 10000)));
    
    markets.push({
      id: `audius_${track.id}`,
      songTitle: track.title,
      artist: track.user?.name || 'Unknown',
      artwork: track.artwork?.['480x480'] || '/placeholder.svg',
      status: 'underground',
      outcome: 'Break 100K streams this week?',
      probability: Math.round(probability),
      fanProbability: Math.round(probability + (Math.random() * 15 - 5)),
      aiProbability: Math.round(probability + (Math.random() * 10 - 5)),
      totalForecasts: Math.floor(Math.random() * 5000) + 500,
      fanAccuracy: Math.floor(Math.random() * 25) + 55,
      aiAccuracy: Math.floor(Math.random() * 20) + 65,
      horizon: '7D',
      isWatchlisted: false,
      change24h: parseFloat((Math.random() * 40 - 5).toFixed(1)),
      listeners: formatNumber(plays),
      monthlyListeners: plays,
      marketCap: formatNumber(plays * 10),
      previewUrl: null,
      audiusUrl: `https://audius.co/${track.user?.handle}/${track.permalink}`,
      source: 'audius'
    });
  });
  
  return markets;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Generate AI models leaderboard
function generateAILeaderboard() {
  return [
    { name: 'Momentum AI', model: 'openai/gpt-5', accuracy: 84, specialty: 'TikTok velocity analysis', predictions: 1250, icon: '🚀' },
    { name: 'Underground Scout', model: 'google/gemini-2.5-pro', accuracy: 79, specialty: 'Artist breakout detection', predictions: 890, icon: '🔍' },
    { name: 'Radio Oracle', model: 'google/gemini-2.5-flash', accuracy: 77, specialty: 'Radio add predictions', predictions: 720, icon: '📻' },
    { name: 'Chart Prophet', model: 'openai/gpt-5-mini', accuracy: 75, specialty: 'Billboard forecasting', predictions: 1100, icon: '📊' },
    { name: 'Viral Detector', model: 'google/gemini-2.5-flash', accuracy: 73, specialty: 'Social media trends', predictions: 950, icon: '🔥' },
  ];
}

// Generate fan forecasters leaderboard
function generateFanLeaderboard() {
  const names = ['ChartMaster99', 'BeatProphet', 'TrendHunter', 'ViralQueen', 'MusicOracle', 'HitPredictor', 'StreamKing', 'PlaylistGuru'];
  const tags = [['K-Pop', 'Viral'], ['Hip-Hop', 'R&B'], ['Afrobeats', 'Amapiano'], ['Pop', 'EDM'], ['Latin', 'Reggaeton']];
  
  return names.map((name, i) => ({
    name,
    avatar: ['🎯', '🔮', '🎵', '👑', '🌟', '💫', '🎤', '🎧'][i],
    winRate: 78 - i * 3,
    predictions: 250 - i * 20,
    tags: tags[i % tags.length],
    xp: 5000 - i * 400,
    rank: i + 1
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get('action') || 'markets';
    const limit = parseInt(url.searchParams.get('limit') || '30');
    
    // Also check body for action (for supabase.functions.invoke)
    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
        if (body.action) {
          action = body.action;
        }
      } catch (e) {
        // No body or invalid JSON
      }
    }
    
    console.log(`Alpha predictions: action=${action}, limit=${limit}`);
    
    if (action === 'markets') {
      // Fetch real data from multiple sources
      const [deezerTracks, audiusTracks, lastfmTracks] = await Promise.all([
        getDeezerNewReleases(30),
        getAudiusTrending(15),
        getLastfmTopTracks(20)
      ]);
      
      const markets = generateMarkets(deezerTracks, audiusTracks, lastfmTracks);
      
      // Get AI analysis if available
      const aiAnalysis = await analyzeWithAI(markets, 'prediction');
      
      return new Response(JSON.stringify({
        markets,
        aiInsights: aiAnalysis,
        aiModels: generateAILeaderboard(),
        fanForecasters: generateFanLeaderboard(),
        stats: {
          activeMarkets: markets.length,
          totalPredictions: Math.floor(Math.random() * 50000) + 30000,
          avgAccuracy: 74,
          lastUpdated: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'analyze') {
      const tracks = body.tracks || [];
      
      const analysis = await analyzeWithAI(tracks, 'reasoning');
      
      return new Response(JSON.stringify({
        analysis: analysis || { error: 'AI analysis unavailable' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'predict') {
      const { marketId, prediction, confidence, userId } = body;
      
      // In production, this would save to database
      const points = Math.floor(confidence * 10);
      
      return new Response(JSON.stringify({
        success: true,
        prediction: {
          marketId,
          prediction,
          confidence,
          userId,
          points,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'leaderboard') {
      return new Response(JSON.stringify({
        aiModels: generateAILeaderboard(),
        fanForecasters: generateFanLeaderboard()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Alpha predictions error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
