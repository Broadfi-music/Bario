import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveStation {
  id: string;
  user_id: string;
  station_name: string;
  logo_url: string | null;
  listener_count: number;
  is_live: boolean;
  profile?: {
    avatar_url: string | null;
    full_name: string | null;
    username: string | null;
  };
}

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const RadioLiveSidebar = () => {
  const navigate = useNavigate();
  const [liveStations, setLiveStations] = useState<LiveStation[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchLiveStations();

    // Real-time subscription
    const channel = supabase
      .channel('radio-live-sidebar')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'radio_stations'
      }, () => {
        fetchLiveStations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveStations = async () => {
    const { data: stations } = await supabase
      .from('radio_stations')
      .select('*')
      .eq('is_live', true)
      .order('listener_count', { ascending: false });

    if (stations && stations.length > 0) {
      // Fetch profiles for station owners
      const userIds = [...new Set(stations.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url, full_name, username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setLiveStations(stations.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id)
      })));
    } else {
      setLiveStations([]);
    }
  };

  const visibleStations = showAll ? liveStations : liveStations.slice(0, 10);

  return (
    <aside className={`hidden lg:flex fixed left-0 top-12 bottom-0 flex-col bg-[#18181b] border-r border-white/5 overflow-y-auto z-40 transition-all ${collapsed ? 'w-14' : 'w-56'}`}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-white/5">
        {!collapsed && (
          <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
            Live Channels
          </h3>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-white/10 rounded"
        >
          {collapsed ? <ChevronDown className="h-4 w-4 text-white/50" /> : <ChevronUp className="h-4 w-4 text-white/50" />}
        </button>
      </div>

      {/* Live Stations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {visibleStations.map((station) => (
          <div
            key={station.id}
            onClick={() => navigate(`/radio-feed/${station.user_id}`)}
            className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer group"
          >
            {/* Avatar/Logo */}
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-700">
                {station.logo_url || station.profile?.avatar_url ? (
                  <img 
                    src={station.logo_url || station.profile?.avatar_url || ''} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Radio className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              {/* Live indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#18181b]" />
            </div>

            {/* Info - hidden when collapsed */}
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-[#53fc18]">
                    {station.station_name}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    {station.profile?.full_name || station.profile?.username || 'Radio Station'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {formatViewers(station.listener_count || 0)}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Empty state */}
        {liveStations.length === 0 && !collapsed && (
          <div className="text-center py-6">
            <Radio className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/40">No live stations</p>
          </div>
        )}

        {/* Show more/less */}
        {liveStations.length > 10 && !collapsed && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs text-[#53fc18] hover:text-white py-2 transition-colors"
          >
            {showAll ? 'Show Less' : `Show More (${liveStations.length - 10})`}
          </button>
        )}
      </div>
    </aside>
  );
};
