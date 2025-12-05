import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Audio mixing system prompt
const AUDIO_MIXING_SYSTEM_PROMPT = `You are an audio mixing assistant. Given era, genre, and description, output a single JSON object with audio FX parameters, no extra text.

Fields:
- reverb_amount (0–1)
- distortion_amount (0–1)
- bitcrush_level (0–1)
- eq_low, eq_mid, eq_high (each -12 to +12, in dB)
- stereo_width (0–1)
- tape_noise_level (0–1)
- tempo_change_percent (-20 to +20)
- filter_cutoff (20 to 20000, in Hz)
- compression_ratio (1 to 20)
- delay_time (0 to 1000, in ms)
- delay_feedback (0 to 0.9)

Rules:
- Older eras (1970) = warmer, darker, more noise, more bitcrush, narrower stereo.
- 1990 = punchy low-mids, moderate noise, moderate width.
- 2025 = clean, bright, wide stereo.
- 2050 = extra wide, bright, more creative FX.
- Afrobeats = strong low-end, bouncy drums.
- Fuji = mid percussion focus, room reverb.
- Trap = deep sub, darker highs, snappy transients.
- K-Pop = bright vocals, tight low-end, wide stereo.
- Amapiano = deep bass, log drum emphasis, shaker groove, wide stereo.
- Funk = punchy bass, tight drums, wah effects, moderate reverb.
- Hip-hop = hard-hitting drums, sub-bass, vinyl crackle, mid-range vocals.
- Country = acoustic warmth, room reverb, clean highs.
- R&B = smooth vocals, deep low-end, lush reverb, wide stereo.
- Soul = warm analog feel, tape saturation, rich mids.
- Pop = bright, polished, wide stereo, compressed dynamics.
- Jazz = natural room sound, warm EQ, minimal compression.
- Reggae = heavy bass, dub delays, spring reverb.
- Gospel = big reverb, full frequency range, choir-friendly mix.
- Instrumental = balanced across all frequencies, clear separation.

Return ONLY valid JSON.`;

interface FxConfig {
  reverb_amount: number;
  distortion_amount: number;
  bitcrush_level: number;
  eq_low: number;
  eq_mid: number;
  eq_high: number;
  stereo_width: number;
  tape_noise_level: number;
  tempo_change_percent: number;
  filter_cutoff: number;
  compression_ratio: number;
  delay_time: number;
  delay_feedback: number;
}

async function generateFxConfig(era: string, genre: string, description: string): Promise<FxConfig> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const userPrompt = `Era: ${era || '2025'}
Genre: ${genre}
Description: ${description || 'Create a modern, polished remix'}

Generate the audio FX parameters for this remix.`;

  console.log('Calling Lovable AI for FX config generation...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: AUDIO_MIXING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limits exceeded, please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required, please add funds to your workspace.');
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from AI');
  }

  console.log('AI Response:', content);

  // Parse JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse FX config from AI response');
  }

  const fxConfig = JSON.parse(jsonMatch[0]) as FxConfig;
  
  // Validate and clamp values
  return {
    reverb_amount: Math.max(0, Math.min(1, fxConfig.reverb_amount || 0.3)),
    distortion_amount: Math.max(0, Math.min(1, fxConfig.distortion_amount || 0)),
    bitcrush_level: Math.max(0, Math.min(1, fxConfig.bitcrush_level || 0)),
    eq_low: Math.max(-12, Math.min(12, fxConfig.eq_low || 0)),
    eq_mid: Math.max(-12, Math.min(12, fxConfig.eq_mid || 0)),
    eq_high: Math.max(-12, Math.min(12, fxConfig.eq_high || 0)),
    stereo_width: Math.max(0, Math.min(1, fxConfig.stereo_width || 0.5)),
    tape_noise_level: Math.max(0, Math.min(1, fxConfig.tape_noise_level || 0)),
    tempo_change_percent: Math.max(-20, Math.min(20, fxConfig.tempo_change_percent || 0)),
    filter_cutoff: Math.max(20, Math.min(20000, fxConfig.filter_cutoff || 20000)),
    compression_ratio: Math.max(1, Math.min(20, fxConfig.compression_ratio || 4)),
    delay_time: Math.max(0, Math.min(1000, fxConfig.delay_time || 0)),
    delay_feedback: Math.max(0, Math.min(0.9, fxConfig.delay_feedback || 0)),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create authenticated Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { genre, era, description, audioUrl, trackTitle } = await req.json();

    console.log('Remix request:', { genre, era, description, audioUrl, trackTitle, userId: user.id });

    // Validate required fields
    if (!genre) {
      return new Response(JSON.stringify({ error: 'Genre is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create track record with pending status
    const { data: track, error: insertError } = await supabase
      .from('tracks')
      .insert({
        user_id: user.id,
        genre,
        era: era || '2025',
        description: description || '',
        original_audio_url: audioUrl || null,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create track record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Created track:', track.id);

    // Generate FX config using AI
    let fxConfig: FxConfig;
    try {
      fxConfig = await generateFxConfig(era || '2025', genre, description || '');
      console.log('Generated FX config:', fxConfig);
    } catch (aiError) {
      console.error('AI error:', aiError);
      
      // Update track with error status
      await supabase
        .from('tracks')
        .update({ status: 'error', error_message: aiError instanceof Error ? aiError.message : 'AI processing failed' })
        .eq('id', track.id);

      return new Response(JSON.stringify({ 
        error: aiError instanceof Error ? aiError.message : 'Failed to generate FX config' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update track with FX config and done status
    // Note: Actual audio processing would require external services
    // For now, we return the FX config for client-side processing with Web Audio API
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        fx_config: fxConfig,
        status: 'done',
      })
      .eq('id', track.id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      trackId: track.id,
      fxConfig,
      message: 'FX parameters generated successfully. Apply effects using the Web Audio API.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Remix error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});