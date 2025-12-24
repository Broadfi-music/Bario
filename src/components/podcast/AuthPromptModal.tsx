import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User, Mic, Heart, MessageSquare } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

const AuthPromptModal = ({ isOpen, onClose, action = 'interact with podcasts' }: AuthPromptModalProps) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onClose();
    navigate('/auth?mode=login');
  };

  const handleSignUp = () => {
    onClose();
    navigate('/auth?mode=signup');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-sm">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-white text-xl">Sign in to continue</DialogTitle>
          <DialogDescription className="text-white/60 text-sm">
            Create an account or sign in to {action}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Features preview */}
          <div className="space-y-3 py-4 border-t border-b border-white/10">
            <div className="flex items-center gap-3 text-sm text-white/80">
              <Mic className="h-4 w-4 text-purple-400" />
              <span>Request to speak in live rooms</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <span>Send messages and reactions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80">
              <Heart className="h-4 w-4 text-pink-400" />
              <span>Send gifts to your favorite hosts</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSignUp}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white h-11"
            >
              Create Account
            </Button>
            <Button 
              onClick={handleSignIn}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 h-11"
            >
              Sign In
            </Button>
          </div>

          <p className="text-center text-[10px] text-white/40">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthPromptModal;
