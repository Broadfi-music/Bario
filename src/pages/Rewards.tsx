import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, ChevronLeft, DollarSign, Users, CreditCard, Copy, ExternalLink, TrendingUp, Wallet, Award, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EarningsData {
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnEarnings: number;
  giftEarnings: number;
  subscriptionEarnings: number;
  referralEarnings: number;
  subscribers: number;
  referrals: number;
  giftsReceived: number;
}

interface Transaction {
  id: string;
  type: 'gift' | 'subscription' | 'referral' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending';
}

const Rewards = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [dataLoading, setDataLoading] = useState(true);
  
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    pendingEarnings: 0,
    withdrawnEarnings: 0,
    giftEarnings: 0,
    subscriptionEarnings: 0,
    referralEarnings: 0,
    subscribers: 0,
    referrals: 0,
    giftsReceived: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const referralLink = user ? `https://bario.app/ref/${user.id.slice(0, 8)}` : '';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    if (!user) return;
    setDataLoading(true);
    
    try {
      // Fetch gifts received
      const { data: giftsData } = await supabase
        .from('podcast_gifts')
        .select('points_value')
        .eq('recipient_id', user.id);
      
      const giftEarnings = (giftsData || []).reduce((sum, g) => sum + (g.points_value * 0.01), 0);
      
      // Fetch followers count (as subscribers proxy)
      const { count: subscriberCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
      
      // Calculate simulated earnings
      const subscriptionEarnings = (subscriberCount || 0) * 0.50;
      const referralEarnings = 0; // Will be tracked separately
      const totalEarnings = giftEarnings + subscriptionEarnings + referralEarnings;
      
      setEarnings({
        totalEarnings,
        pendingEarnings: totalEarnings * 0.3,
        withdrawnEarnings: 0,
        giftEarnings,
        subscriptionEarnings,
        referralEarnings,
        subscribers: subscriberCount || 0,
        referrals: 0,
        giftsReceived: giftsData?.length || 0,
      });

      // Create sample transactions
      const txns: Transaction[] = [];
      if (giftsData && giftsData.length > 0) {
        txns.push({
          id: '1',
          type: 'gift',
          amount: giftEarnings,
          description: `${giftsData.length} gifts received`,
          date: new Date().toISOString(),
          status: 'completed',
        });
      }
      if (subscriberCount && subscriberCount > 0) {
        txns.push({
          id: '2',
          type: 'subscription',
          amount: subscriptionEarnings,
          description: `${subscriberCount} subscriber earnings`,
          date: new Date().toISOString(),
          status: 'pending',
        });
      }
      setTransactions(txns);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (parseFloat(withdrawAmount) > earnings.pendingEarnings) {
      toast.error('Insufficient balance');
      return;
    }
    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      toast.error('Please fill in all bank details');
      return;
    }
    
    // Simulate withdrawal processing
    toast.success(`Withdrawal of $${withdrawAmount} initiated. Processing in 2-3 business days.`);
    setWithdrawOpen(false);
    setWithdrawAmount('');
  };

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
    { icon: Upload, label: 'Upload', path: '/dashboard/upload' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 lg:p-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">BARIO</Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <nav className="flex-1 px-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link key={item.label} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors mb-0.5 ${item.label === 'Reward & Earn' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
              <item.icon className="h-4 w-4" /><span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        <div className="p-3 lg:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8"><ChevronLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Reward & Earn</h1>
              <p className="text-xs text-muted-foreground">Track your earnings and withdraw</p>
            </div>
          </div>

          {/* Earnings Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(earnings.totalEarnings)}</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Wallet className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Available to Withdraw</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(earnings.pendingEarnings)}</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Gift className="h-4 w-4 text-purple-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Gift Earnings</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(earnings.giftEarnings)}</p>
              <p className="text-[10px] text-muted-foreground">{earnings.giftsReceived} gifts received</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Subscribers</p>
              <p className="text-xl font-bold text-foreground">{earnings.subscribers}</p>
              <p className="text-[10px] text-muted-foreground">{formatCurrency(earnings.subscriptionEarnings)} earned</p>
            </Card>
          </div>

          {/* Withdraw Button */}
          <div className="mb-6">
            <Button 
              onClick={() => setWithdrawOpen(true)} 
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              disabled={earnings.pendingEarnings <= 0}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Withdraw Earnings
            </Button>
          </div>

          {/* Referral Section */}
          <Card className="p-4 mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Bario Referral Program</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Earn $5 for every new user who signs up using your referral link!
            </p>
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="text-xs bg-background"
              />
              <Button onClick={handleCopyReferral} variant="outline" size="sm">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{earnings.referrals} referrals</span>
              <span>•</span>
              <span>{formatCurrency(earnings.referralEarnings)} earned</span>
            </div>
          </Card>

          {/* Earnings Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Earnings Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Gifts</span>
                  </div>
                  <span className="font-medium">{formatCurrency(earnings.giftEarnings)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Subscriptions</span>
                  </div>
                  <span className="font-medium">{formatCurrency(earnings.subscriptionEarnings)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Referrals</span>
                  </div>
                  <span className="font-medium">{formatCurrency(earnings.referralEarnings)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-500">+{formatCurrency(tx.amount)}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Earnings</DialogTitle>
            <DialogDescription>
              Enter your bank details to withdraw your earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold">{formatCurrency(earnings.pendingEarnings)}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount to Withdraw</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                placeholder="e.g., Chase Bank"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                placeholder="Enter account number"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                placeholder="Name on account"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
              />
            </div>
            <Button onClick={handleWithdraw} className="w-full">
              Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rewards;
