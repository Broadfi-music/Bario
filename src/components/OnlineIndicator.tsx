import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const OnlineIndicator = ({ isOnline, size = 'sm', className }: OnlineIndicatorProps) => {
  if (!isOnline) return null;

  return (
    <span
      className={cn(
        'absolute rounded-full border-2 border-black bg-green-500',
        sizeMap[size],
        className
      )}
      title="Online"
    />
  );
};

export default OnlineIndicator;
