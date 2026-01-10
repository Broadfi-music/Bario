import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, ChevronLeft, DollarSign, Users, CreditCard, Copy, ExternalLink, TrendingUp, Wallet, Award, Upload, Coins, ShoppingCart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  bonus_coins: number;
  is_popular: boolean;
}

interface EarningsData {
  totalCoinsReceived: number;
  totalEarningsUsd: number;
  pendingEarningsUsd: number;
  withdrawnEarningsUsd: number;
  withdrawalThreshold: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  coins: number;
  description: string;
  created_at: string;
  status: string;
}

const Rewards = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountName: '' });
  const [dataLoading, setDataLoading] = useState(true);
  
  const [userCoins, setUserCoins] = useState(0);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalCoinsReceived: 0,
    totalEarningsUsd: 0,
    pendingEarningsUsd: 0,
    withdrawnEarningsUsd: 0,
    withdrawalThreshold: 100
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
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);
    
    try {
      // Fetch coin packages
      const { data: packages } = await supabase
        .from('coin_packages')
        .select('*')
        .eq('is_active', true)
        .order('coins', { ascending: true });
      
      if (packages) {
        setCoinPackages(packages as CoinPackage[]);
      }

      // Fetch user coins
      let { data: coinsData } = await supabase
        .from('user_coins')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!coinsData) {
        // Create initial coin record
        await supabase.from('user_coins').insert({
          user_id: user.id,
          balance: 100 // Free starter coins
        });
        setUserCoins(100);
      } else {
        setUserCoins(coinsData.balance);
      }

      // Fetch creator earnings
      const { data: earningsData } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (earningsData) {
        const ed = earningsData as any;
        setEarnings({
          totalCoinsReceived: ed.total_coins_received || 0,
          totalEarningsUsd: parseFloat(String(ed.total_earnings_usd || 0)),
          pendingEarningsUsd: parseFloat(String(ed.pending_earnings_usd || 0)),
          withdrawnEarningsUsd: parseFloat(String(ed.withdrawn_earnings_usd || 0)),
          withdrawalThreshold: parseFloat(String(ed.withdrawal_threshold_usd || 100))
        });
      }

      // Fetch recent transactions
      const { data: txns } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (txns) {
        setTransactions(txns as Transaction[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const handleBuyCoins = async (pkg: CoinPackage) => {
    if (!user) return;
    
    // Simulate payment processing
    toast.loading('Processing payment...', { id: 'payment' });
    
    try {
      const totalCoins = pkg.coins + pkg.bonus_coins;
      
      // Update user coins
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({ 
          balance: userCoins + totalCoins,
          total_purchased: userCoins + totalCoins
        })
        .eq('user_id', user.id);

      if (coinError) throw coinError;

      // Record transaction
      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount: pkg.price_usd,
        coins: totalCoins,
        description: `Purchased ${pkg.name} package (${pkg.coins} + ${pkg.bonus_coins} bonus coins)`
      });

      setUserCoins(prev => prev + totalCoins);
      setBuyCoinsOpen(false);
      toast.success(`Successfully purchased ${totalCoins} coins!`, { id: 'payment' });
      fetchData();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process payment', { id: 'payment' });
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > earnings.pendingEarningsUsd) {
      toast.error('Insufficient balance');
      return;
    }
    if (earnings.pendingEarningsUsd < earnings.withdrawalThreshold) {
      toast.error(`Minimum withdrawal is $${earnings.withdrawalThreshold}`);
      return;
    }
    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      toast.error('Please fill in all bank details');
      return;
    }
    
    try {
      // Create withdrawal request
      await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount_usd: amount,
        bank_name: bankDetails.bankName,
        account_number: bankDetails.accountNumber,
        account_name: bankDetails.accountName
      });

      // Update earnings
      await supabase
        .from('creator_earnings')
        .update({
          pending_earnings_usd: earnings.pendingEarningsUsd - amount
        })
        .eq('user_id', user.id);

      // Record transaction
      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: amount,
        coins: 0,
        description: `Withdrawal request for $${amount.toFixed(2)}`
      });

      toast.success(`Withdrawal of $${amount.toFixed(2)} initiated. Processing in 2-3 business days.`);
      setWithdrawOpen(false);
      setWithdrawAmount('');
      fetchData();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to process withdrawal');
    }
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
              <p className="text-xs text-muted-foreground">Buy coins to gift creators & earn money</p>
            </div>
          </div>

          {/* Coin Balance & Buy Coins */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Coins className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Coins</p>
                    <p className="text-2xl font-bold text-foreground">{userCoins.toLocaleString()}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setBuyCoinsOpen(true)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy Coins
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Use coins to gift your favorite creators during live streams
              </p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Creator Earnings</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(earnings.pendingEarningsUsd)}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setWithdrawOpen(true)}
                  disabled={earnings.pendingEarningsUsd < earnings.withdrawalThreshold}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </div>
              {earnings.pendingEarningsUsd < earnings.withdrawalThreshold && (
                <div className="flex items-center gap-1 text-[10px] text-yellow-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>Minimum ${earnings.withdrawalThreshold} to withdraw ({formatCurrency(earnings.withdrawalThreshold - earnings.pendingEarningsUsd)} more needed)</span>
                </div>
              )}
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(earnings.totalEarningsUsd)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Withdrawn</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(earnings.withdrawnEarningsUsd)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Gifts Received</p>
              <p className="text-xl font-bold text-foreground">{earnings.totalCoinsReceived.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">coins</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <p className="text-xl font-bold text-foreground">$0.007</p>
              <p className="text-[10px] text-muted-foreground">per coin</p>
            </Card>
          </div>

          {/* Referral Section */}
          <Card className="p-4 mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Bario Referral Program</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Earn 100 free coins for every new user who signs up using your referral link!
            </p>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="text-xs bg-background" />
              <Button onClick={handleCopyReferral} variant="outline" size="sm">
                <Copy className="h-3 w-3 mr-1" />Copy
              </Button>
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="p-4">
            <h3 className="font-semibold text-foreground mb-3">Recent Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${tx.coins > 0 ? 'text-green-500' : tx.coins < 0 ? 'text-red-500' : 'text-foreground'}`}>
                        {tx.coins > 0 ? '+' : ''}{tx.coins.toLocaleString()} coins
                      </p>
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Buy Coins Dialog */}
      <Dialog open={buyCoinsOpen} onOpenChange={setBuyCoinsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Buy Coins
            </DialogTitle>
            <DialogDescription>
              Choose a coin package to support your favorite creators
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {coinPackages.map((pkg) => (
              <Card 
                key={pkg.id}
                className={`p-3 cursor-pointer transition-all hover:scale-105 ${pkg.is_popular ? 'border-yellow-500 ring-1 ring-yellow-500/50' : 'border-border'}`}
                onClick={() => handleBuyCoins(pkg)}
              >
                {pkg.is_popular && (
                  <div className="text-[9px] bg-yellow-500 text-black px-2 py-0.5 rounded-full w-fit mb-2 font-bold">
                    POPULAR
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="font-bold text-lg">{pkg.coins.toLocaleString()}</p>
                    {pkg.bonus_coins > 0 && (
                      <p className="text-[10px] text-green-500">+{pkg.bonus_coins} bonus</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(pkg.price_usd)}</p>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Earnings</DialogTitle>
            <DialogDescription>
              Enter your bank details to withdraw your earnings. Minimum withdrawal is ${earnings.withdrawalThreshold}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold">{formatCurrency(earnings.pendingEarningsUsd)}</p>
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
            <Button onClick={handleWithdraw} className="w-full" disabled={earnings.pendingEarningsUsd < earnings.withdrawalThreshold}>
              Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rewards;
