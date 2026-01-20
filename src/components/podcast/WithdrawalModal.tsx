import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DollarSign, Building2, CreditCard, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreatorEarnings {
  pending_earnings_usd: number;
  total_earnings_usd: number;
  withdrawn_earnings_usd: number;
  withdrawal_threshold_usd: number;
}

interface WithdrawalRequest {
  id: string;
  amount_usd: number;
  status: string;
  created_at: string;
  processed_at: string | null;
}

const WithdrawalModal = ({ isOpen, onClose }: WithdrawalModalProps) => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  
  const WITHDRAWAL_THRESHOLD = 100; // $100 minimum

  useEffect(() => {
    if (user && isOpen) {
      fetchEarnings();
      fetchWithdrawalRequests();
    }
  }, [user, isOpen]);

  const fetchEarnings = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('creator_earnings')
      .select('pending_earnings_usd, total_earnings_usd, withdrawn_earnings_usd, withdrawal_threshold_usd')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setEarnings(data);
    } else if (error && error.code !== 'PGRST116') {
      console.error('Error fetching earnings:', error);
    }
    setLoading(false);
  };

  const fetchWithdrawalRequests = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('id, amount_usd, status, created_at, processed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) {
      setWithdrawalRequests(data);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !earnings) return;
    
    const withdrawAmount = parseFloat(amount);
    
    // Validations
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (withdrawAmount > earnings.pending_earnings_usd) {
      toast.error('Amount exceeds available earnings');
      return;
    }
    
    if (withdrawAmount < WITHDRAWAL_THRESHOLD) {
      toast.error(`Minimum withdrawal amount is $${WITHDRAWAL_THRESHOLD}`);
      return;
    }
    
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast.error('Please fill in all bank details');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Call the edge function to process withdrawal
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          userId: user.id,
          amount: withdrawAmount,
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim()
        }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      
      toast.success('Withdrawal request submitted successfully!');
      
      // Refresh data
      await fetchEarnings();
      await fetchWithdrawalRequests();
      
      // Reset form
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-white/50" />;
    }
  };

  const canWithdraw = earnings && earnings.pending_earnings_usd >= WITHDRAWAL_THRESHOLD;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Withdraw Earnings
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-white/50">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Earnings Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/50 text-xs mb-1">Available</p>
                <p className="text-xl font-bold text-green-500">
                  ${(earnings?.pending_earnings_usd || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/50 text-xs mb-1">Total Earned</p>
                <p className="text-xl font-bold text-white">
                  ${(earnings?.total_earnings_usd || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Threshold Warning */}
            {!canWithdraw && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                <p className="text-yellow-400 text-sm">
                  Minimum withdrawal: ${WITHDRAWAL_THRESHOLD}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  ${(WITHDRAWAL_THRESHOLD - (earnings?.pending_earnings_usd || 0)).toFixed(2)} more to go
                </p>
              </div>
            )}

            {/* Withdrawal Form */}
            {canWithdraw && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount" className="text-white/70 text-sm">
                    Amount (USD)
                  </Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100.00"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                      max={earnings.pending_earnings_usd}
                      min={WITHDRAWAL_THRESHOLD}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bankName" className="text-white/70 text-sm">
                    Bank Name
                  </Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., First Bank, GTBank"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="accountNumber" className="text-white/70 text-sm">
                    Account Number
                  </Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="0123456789"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="accountName" className="text-white/70 text-sm">
                    Account Name
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      id="accountName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="John Doe"
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitting ? 'Processing...' : 'Request Withdrawal'}
                </Button>
              </div>
            )}

            {/* Recent Requests */}
            {withdrawalRequests.length > 0 && (
              <div>
                <h4 className="text-white/70 text-sm mb-2">Recent Requests</h4>
                <div className="space-y-2">
                  {withdrawalRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className="text-white text-sm">${request.amount_usd.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs capitalize ${
                          request.status === 'completed' ? 'text-green-500' :
                          request.status === 'rejected' ? 'text-red-500' :
                          'text-yellow-500'
                        }`}>
                          {request.status}
                        </span>
                        <p className="text-white/40 text-[10px]">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalModal;