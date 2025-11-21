import { Play } from 'lucide-react';

interface FloatingAlbumCardProps {
  image: string;
  title: string;
  artist: string;
  position: 'left' | 'right';
  delay?: number;
}

export const FloatingAlbumCard = ({ image, title, artist, position, delay = 0 }: FloatingAlbumCardProps) => {
  const positionClasses = position === 'left' 
    ? 'left-4 md:left-8 lg:left-16' 
    : 'right-4 md:right-8 lg:right-16';

  return (
    <div 
      className={`absolute ${positionClasses} top-1/2 -translate-y-1/2 hidden lg:block animate-float`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative group cursor-pointer">
        <div className="w-48 h-48 rounded-xl overflow-hidden border border-foreground/10 bg-card shadow-2xl transition-transform duration-300 group-hover:scale-105">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <Play className="h-5 w-5 text-background fill-background ml-1" />
            </div>
          </div>
        </div>
        
        {/* Card info */}
        <div className="mt-3 space-y-1">
          <div className="text-foreground font-medium text-sm truncate">{title}</div>
          <div className="text-foreground/60 text-xs truncate">{artist}</div>
        </div>
      </div>
    </div>
  );
};
