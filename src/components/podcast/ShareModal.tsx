import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, MessageCircle, Send, Twitter, Facebook, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: when provided, builds a podcasts session URL */
  sessionId?: string;
  /** Optional title used in default share text */
  title?: string;
  /** Optional explicit URL (overrides sessionId-based URL) */
  shareUrl?: string;
  /** Optional explicit share message */
  shareText?: string;
}

const ShareModal = ({ isOpen, onClose, sessionId, title, shareUrl, shareText }: ShareModalProps) => {
  const finalUrl =
    shareUrl ||
    (sessionId ? `${window.location.origin}/podcasts?session=${sessionId}` : window.location.href);
  const finalText = shareText || (title ? `Check out "${title}" on Bario!` : 'Check this out on Bario!');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(finalUrl);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Could not copy link');
    }
    onClose();
  };

  const shareToWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${finalText}\n${finalUrl}`)}`,
      '_blank',
      'noopener,noreferrer'
    );
    onClose();
  };

  const shareToTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(finalUrl)}&text=${encodeURIComponent(finalText)}`,
      '_blank',
      'noopener,noreferrer'
    );
    onClose();
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(finalText)}&url=${encodeURIComponent(finalUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
    onClose();
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
    onClose();
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: title || 'Bario', text: finalText, url: finalUrl });
        onClose();
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Share</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Link */}
          <div className="flex gap-2">
            <Input
              value={finalUrl}
              readOnly
              className="bg-white/5 border-white/10 text-white text-sm"
            />
            <Button onClick={copyLink} size="icon" className="bg-white/10 hover:bg-white/20" aria-label="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={shareToWhatsApp}
              className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white/80">WhatsApp</span>
            </button>

            <button
              onClick={shareToTelegram}
              className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center">
                <Send className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white/80">Telegram</span>
            </button>

            <button
              onClick={shareToTwitter}
              className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-black border border-white/20 flex items-center justify-center">
                <Twitter className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white/80">Twitter</span>
            </button>

            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-[#1877f2] flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white/80">Facebook</span>
            </button>
          </div>

          <button
            onClick={nativeShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors"
          >
            <LinkIcon className="h-4 w-4" />
            More sharing options
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
