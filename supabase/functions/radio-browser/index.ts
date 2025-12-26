import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Radio Browser API endpoints (they have multiple mirrors)
const RADIO_BROWSER_SERVERS = [
  'de1.api.radio-browser.info',
  'nl1.api.radio-browser.info',
  'at1.api.radio-browser.info',
];

const getRandomServer = () => {
  return RADIO_BROWSER_SERVERS[Math.floor(Math.random() * RADIO_BROWSER_SERVERS.length)];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, limit = 50, offset = 0, search, tag, country, order } = await req.json();
    const server = getRandomServer();
    let url = '';

    console.log('Radio Browser request:', { action, limit, search, tag, country });

    switch (action) {
      case 'top':
        // Get top clicked stations
        url = `https://${server}/json/stations/topclick/${limit}`;
        break;
      case 'trending':
        // Get trending stations by recent votes
        url = `https://${server}/json/stations/topvote/${limit}`;
        break;
      case 'search':
        // Search stations by name
        url = `https://${server}/json/stations/byname/${encodeURIComponent(search || '')}?limit=${limit}&offset=${offset}`;
        break;
      case 'by_tag':
        // Get stations by tag/genre
        url = `https://${server}/json/stations/bytag/${encodeURIComponent(tag || '')}?limit=${limit}&offset=${offset}&order=${order || 'clickcount'}&reverse=true`;
        break;
      case 'by_country':
        // Get stations by country
        url = `https://${server}/json/stations/bycountry/${encodeURIComponent(country || '')}?limit=${limit}&offset=${offset}&order=${order || 'clickcount'}&reverse=true`;
        break;
      case 'tags':
        // Get all available tags
        url = `https://${server}/json/tags?order=stationcount&reverse=true&limit=${limit}`;
        break;
      case 'countries':
        // Get all countries
        url = `https://${server}/json/countries?order=stationcount&reverse=true&limit=${limit}`;
        break;
      default:
        // Default: get popular stations
        url = `https://${server}/json/stations/topclick/${limit}`;
    }

    console.log('Fetching from:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bario/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Radio Browser API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform the data for our frontend
    const transformedData = Array.isArray(data) ? data.map((station: any) => ({
      id: station.stationuuid,
      name: station.name,
      url: station.url_resolved || station.url,
      favicon: station.favicon || null,
      country: station.country,
      countryCode: station.countrycode,
      state: station.state,
      language: station.language,
      tags: station.tags?.split(',').filter(Boolean) || [],
      codec: station.codec,
      bitrate: station.bitrate,
      votes: station.votes,
      clickcount: station.clickcount,
      clicktrend: station.clicktrend,
      homepage: station.homepage,
      lastCheckOk: station.lastcheckok === 1,
      geo_lat: station.geo_lat,
      geo_long: station.geo_long,
    })) : data;

    console.log(`Returning ${transformedData.length} stations`);

    return new Response(
      JSON.stringify({ 
        stations: transformedData,
        count: transformedData.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Radio Browser error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, stations: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
