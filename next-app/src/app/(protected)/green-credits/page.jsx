"use client";
import { useState, useEffect } from 'react';

const MOCK_DATA = {
  balance: 850,
  co2Saved: 125.5,
  treesPlanted: 6,
  history: [
    { id: 1, action: 'Offered a ride', date: '2 days ago', amount: '+50', type: 'earn' },
    { id: 2, action: 'Booked a ride with Priya', date: '3 days ago', amount: '+20', type: 'earn' },
    { id: 3, action: 'Redeemed Cafeteria Coffee', date: '5 days ago', amount: '-300', type: 'spend' },
    { id: 4, action: '5-Star Rating Bonus', date: '1 week ago', amount: '+100', type: 'earn' },
    { id: 5, action: 'Offered a ride', date: '1 week ago', amount: '+50', type: 'earn' },
    { id: 6, action: 'Redeemed Priority Parking Pass', date: '2 weeks ago', amount: '-250', type: 'spend' },
  ],
  rewards: [
    { id: 1, title: 'Cafeteria Coffee', cost: 300, icon: '☕' },
    { id: 2, title: 'Priority Parking Pass', cost: 250, icon: '🅿️' },
    { id: 3, title: 'Company Eco Swag', cost: 400, icon: '🎁' },
    { id: 4, title: 'Free Lunch Voucher', cost: 300, icon: '🍱' },
    { id: 5, title: 'Half-Day Off', cost: 1000, icon: '🌴' },
    { id: 6, title: 'Eco Champion Badge', cost: 50, icon: '🏅' },
  ],
};

const EARN_METHODS = [
  { title: 'Offer a Ride', credits: '+50 Credits', description: 'Publish a commute and carry a colleague along your route.', icon: '🚗' },
  { title: 'Book a Ride', credits: '+20 Credits', description: 'Join an existing ride instead of driving solo.', icon: '🎟️' },
  { title: 'Maintain 5-Star Rating', credits: '+100 / month', description: 'Keep your average rating at 4.8+ for a recurring bonus.', icon: '⭐' },
];

const GreenCreditsPage = () => {
  const [activeTab, setActiveTab] = useState('earn');
  const [balance, setBalance] = useState(MOCK_DATA.balance);
  const [history, setHistory] = useState(MOCK_DATA.history);
  const [redeemedIds, setRedeemedIds] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRedeem = (reward) => {
    if (balance < reward.cost) return;
    setBalance((prev) => prev - reward.cost);
    setRedeemedIds((prev) => [...prev, reward.id]);
    setHistory((prev) => [
      { id: Date.now(), action: `Redeemed ${reward.title}`, date: 'Just now', amount: `-${reward.cost}`, type: 'spend' },
      ...prev,
    ]);
    setToast({ message: `Redeemed "${reward.title}" successfully!` });
  };

  return (
    <div className="min-h-[calc(100dvh-73px)] relative py-8 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto space-y-8 relative">

        {/* ── Hero Section ── */}
        <div className="glass-panel p-6 sm:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Eco Impact Program
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6" style={{ color: 'var(--text-primary)' }}>
              Green Credits
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Total Green Credits
                </p>
                <p className="text-5xl font-bold text-emerald-400 tracking-tight">{balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  CO2 Saved
                </p>
                <p className="text-5xl font-bold text-teal-400 tracking-tight">{MOCK_DATA.co2Saved} kg</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Trees Planted (Equiv.)
                </p>
                <p className="text-5xl font-bold text-emerald-400 tracking-tight">🌳 {MOCK_DATA.treesPlanted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="glass-panel p-2 rounded-2xl inline-flex gap-2">
          <button
            onClick={() => setActiveTab('earn')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'earn'
                ? 'bg-emerald-500 text-emerald-950'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            How to Earn
          </button>
          <button
            onClick={() => setActiveTab('redeem')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'redeem'
                ? 'bg-emerald-500 text-emerald-950'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Rewards Store
          </button>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'earn' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EARN_METHODS.map((method) => (
              <div
                key={method.title}
                className="glass-panel glass-panel-hover p-6 border border-[var(--border-subtle)] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-4">
                  {method.icon}
                </div>
                <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{method.title}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{method.description}</p>
                <span className="text-emerald-400 font-bold text-sm">{method.credits}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_DATA.rewards.map((reward) => {
              const redeemed = redeemedIds.includes(reward.id);
              const affordable = balance >= reward.cost;
              return (
                <div
                  key={reward.id}
                  className="glass-panel glass-panel-hover p-6 border border-[var(--border-subtle)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-2xl mb-4">
                      {reward.icon}
                    </div>
                    <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{reward.title}</h3>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={redeemed || !affordable}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                      redeemed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                        : affordable
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                        : 'opacity-40 bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-not-allowed'
                    }`}
                  >
                    {redeemed ? '✓ Redeemed' : `Redeem (${reward.cost})`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Transaction History ── */}
        <div className="glass-panel p-6 relative overflow-hidden">
          <h2 className="font-bold mb-6 uppercase tracking-widest text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Transaction History
          </h2>
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 transition-colors hover:bg-[var(--bg-surface)]"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.action}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.date}</p>
                </div>
                <span className={`font-bold text-sm whitespace-nowrap ${item.type === 'earn' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold flex items-center gap-2"
          style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#34d399' }}
        >
          ✅ {toast.message}
        </div>
      )}
    </div>
  );
};

export default GreenCreditsPage;
