import { Link } from 'react-router-dom';
import { Home, Library, Sparkles, Compass, User, Settings, Plus, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Dashboard = () => {
  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Compass, label: 'Explore', path: '/dashboard/explore' },
  ];

  const recentTracks = [
    { id: 1, title: 'Summer Vibes', genre: 'Amapiano', duration: '3:24' },
    { id: 2, title: 'Night Drive', genre: 'Trap', duration: '2:58' },
    { id: 3, title: 'Country Road', genre: 'Country', duration: '4:12' },
    { id: 4, title: 'Jazz Club', genre: 'Jazz', duration: '5:03' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <Link to="/" className="text-2xl font-bold text-foreground">
            BARIO
          </Link>
        </div>

        <nav className="flex-1 px-3">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors mb-1"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </Link>
          <Link
            to="/dashboard/profile"
            className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <User className="h-5 w-5" />
            <span className="font-medium">Profile</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
              <p className="text-muted-foreground">Ready to create your next remix?</p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-5 w-5 mr-2" />
              New Remix
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Quick Create</h3>
                  <p className="text-sm text-muted-foreground">Start a new remix</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Library className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Library</h3>
                  <p className="text-sm text-muted-foreground">View all tracks</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Compass className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Explore</h3>
                  <p className="text-sm text-muted-foreground">Discover new sounds</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Tracks */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Recent Remixes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentTracks.map((track) => (
                <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden group">
                  <div className="aspect-square bg-muted relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
                        <Play className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-1">{track.title}</h3>
                    <p className="text-sm text-muted-foreground">{track.genre}</p>
                    <p className="text-xs text-muted-foreground mt-2">{track.duration}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
