import { Link } from 'react-router-dom';
import { ArrowLeft, Edit, Share2, Play, Heart, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DashboardProfile = () => {
  const stats = [
    { label: 'Remixes', value: '42' },
    { label: 'Followers', value: '1.2K' },
    { label: 'Following', value: '384' },
  ];

  const tracks = [
    { id: 1, title: 'Summer Vibes', genre: 'Amapiano', plays: '1.2K', likes: 145 },
    { id: 2, title: 'Night Drive', genre: 'Trap', plays: '980', likes: 89 },
    { id: 3, title: 'Country Road', genre: 'Country', plays: '2.1K', likes: 234 },
    { id: 4, title: 'Jazz Club', genre: 'Jazz', plays: '750', likes: 67 },
    { id: 5, title: 'Funk Session', genre: 'Funk', plays: '1.5K', likes: 178 },
    { id: 6, title: 'Soul Train', genre: 'Soul', plays: '890', likes: 92 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          </div>
          <Link to="/" className="text-xl font-bold text-foreground">
            BARIO
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Profile Header */}
          <div className="bg-card rounded-lg p-8 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">JD</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-foreground mb-2">John Doe</h2>
                <p className="text-muted-foreground mb-4">@johndoe · Music Producer & Remix Artist</p>
                
                <div className="flex flex-wrap gap-6 mb-4">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button className="bg-background hover:bg-background/80 text-foreground border border-border">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="tracks" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="tracks" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Music className="h-4 w-4 mr-2" />
                My Tracks
              </TabsTrigger>
              <TabsTrigger 
                value="liked" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Heart className="h-4 w-4 mr-2" />
                Liked
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tracks" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tracks.map((track) => (
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
                      <p className="text-sm text-muted-foreground mb-3">{track.genre}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {track.plays}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {track.likes}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="liked" className="mt-6">
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No liked tracks yet</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default DashboardProfile;
