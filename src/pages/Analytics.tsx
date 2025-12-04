import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, TrendingUp, Users, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const Analytics = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const totalCredits = 100;
  const usedCredits = 45;
  const remainingCredits = totalCredits - usedCredits;

  const topTracks = [
    { id: 1, title: 'Summer Vibes Remix', plays: 1245, downloads: 89, shares: 34 },
    { id: 2, title: 'Night Drive Trap', plays: 987, downloads: 67, shares: 28 },
    { id: 3, title: 'Country Soul', plays: 856, downloads: 54, shares: 22 },
    { id: 4, title: 'Jazz Fusion', plays: 743, downloads: 41, shares: 19 },
    { id: 5, title: 'Gospel Energy', plays: 621, downloads: 38, shares: 15 },
  ];

  const stats = [
    { label: 'Total Plays', value: '12.4K', icon: Play, trend: '+12%' },
    { label: 'Total Downloads', value: '3.2K', icon: Download, trend: '+8%' },
    { label: 'Followers', value: '1.8K', icon: Users, trend: '+15%' },
    { label: 'Engagement', value: '67%', icon: TrendingUp, trend: '+5%' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Track your music performance</p>
          </div>
        </div>

        {/* Credits Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Credits</h2>
                <p className="text-sm text-muted-foreground">Your generation credits</p>
              </div>
            </div>
            <Link to="/dashboard/settings">
              <Button variant="outline">Manage Plan</Button>
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="text-foreground font-medium">{usedCredits} / {totalCredits}</span>
            </div>
            <Progress value={(usedCredits / totalCredits) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground">{remainingCredits} credits remaining this month</p>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm text-green-500 font-medium">{stat.trend}</span>
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Performance Chart Placeholder */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Performance Overview</h2>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Chart Visualization Coming Soon</p>
          </div>
        </Card>

        {/* Top Tracks */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Top Performing Tracks</h2>
          <div className="space-y-4">
            {topTracks.map((track, index) => (
              <div key={track.id} className="flex items-center gap-4 p-4 bg-muted rounded-lg hover:bg-accent/50 transition-colors">
                <div className="text-2xl font-bold text-muted-foreground w-8">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{track.title}</h3>
                </div>
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{track.plays}</p>
                    <p className="text-xs text-muted-foreground">Plays</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{track.downloads}</p>
                    <p className="text-xs text-muted-foreground">Downloads</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{track.shares}</p>
                    <p className="text-xs text-muted-foreground">Shares</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Genre Distribution */}
        <Card className="p-6 mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Genre Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-foreground mb-1">28%</p>
              <p className="text-sm text-muted-foreground">Amapiano</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-foreground mb-1">22%</p>
              <p className="text-sm text-muted-foreground">Trap</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-foreground mb-1">18%</p>
              <p className="text-sm text-muted-foreground">Jazz</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-foreground mb-1">32%</p>
              <p className="text-sm text-muted-foreground">Other</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
