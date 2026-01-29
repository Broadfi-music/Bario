import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Send, Twitter } from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  title: string;
}

const ShareModal = ({ isOpen, onClose, sessionId, title }: ShareModalProps) => {
  const shareUrl = `${window.location.origin}/podcasts?session=${sessionId}`;
  const shareText = `Check out this live space: "${title}" on Bario!`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
    onClose();
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(url, '_blank');
    onClose();
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    onClose();
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Share Podcast</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Copy Link */}
          <div className="flex gap-2">
            <Input 
              value={shareUrl}
              readOnly
              className="bg-white/5 border-white/10 text-white text-sm"
            />
            <Button onClick={copyLink} size="icon" className="bg-white/10 hover:bg-white/20">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* WhatsApp */}
            <button
              onClick={shareToWhatsApp}
              className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs text-white/80">WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={shareToTelegram}
              className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Send className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs text-white/80">Telegram</span>
            </button>

            {/* Twitter */}
            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-black border border-white/20 flex items-center justify-center">
                <Twitter className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs text-white/80">Twitter</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
