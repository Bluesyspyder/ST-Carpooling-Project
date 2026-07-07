"use client";
import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

const CO2_KG_PER_TREE = 21; // rough equivalence used for the "trees planted" display stat

const GreenCreditsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('earn');

  const [balance, setBalance] = useState(0);
  const [co2Saved, setCo2Saved] = useState(0);
  const [history, setHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);
  const [toast, setToast] = useState(null);

  const treesPlanted = Math.round(co2Saved / CO2_KG_PER_TREE);

  const mapRedemptionsToHistory = (redemptions) =>
    redemptions.map((r) => ({
      id: r._id,
      action: `Redeemed ${r.title}`,
      date: new Date(r.createdAt).toLocaleDateString(),
      amount: `-${r.cost}`,
      type: 'spend',
    }));

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, rewardsRes, redemptionsRes, leaderboardRes] = await Promise.all([
        api.get('/users/me/stats'),
        api.get('/rewards'),
        api.get('/rewards/redemptions'),
        api.get('/users/leaderboard'),
      ]);

      setBalance(statsRes.data.data.greenCredits || 0);
      setCo2Saved(statsRes.data.data.co2SavedKg || 0);
      setRewards(rewardsRes.data.data.rewards || []);
      setHistory(mapRedemptionsToHistory(redemptionsRes.data.data.redemptions || []));
      setLeaderboard(leaderboardRes.data.data.leaderboard || []);
      setMyRank(leaderboardRes.data.data.myRank || null);
    } catch (err) {
      setError('Failed to load Green Credits data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRedeem = async (reward) => {
    if (balance < reward.cost || redeemingId) return;
    setRedeemingId(reward._id);
    try {
      const res = await api.post('/rewards/redeem', { rewardId: reward._id });
      const { redemption, balance: newBalance } = res.data.data;
      setBalance(newBalance);
      setHistory((prev) => [
        { id: redemption._id, action: `Redeemed ${redemption.title}`, date: 'Just now', amount: `-${redemption.cost}`, type: 'spend' },
        ...prev,
      ]);
      setToast({ message: `Redeemed "${reward.title}"! Code: ${redemption.redemptionCode}` });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Redemption failed. Please try again.', error: true });
    } finally {
      setRedeemingId(null);
    }
  };

  const EARN_METHODS = [
    { title: 'Offer a Ride', credits: '+5 base + fuel/occupancy bonus', description: 'Publish a commute and carry a colleague along your route.', icon: '🚗' },
    { title: 'Book a Ride', credits: '+1.2 credits / km', description: 'Join an existing ride instead of driving solo.', icon: '🎟️' },
    { title: 'Maintain 5-Star Rating', credits: '+100 / month', description: 'Keep your average rating at 4.8+ for a recurring bonus.', icon: '⭐' },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-73px)] flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Green Credits...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-73px)] relative py-8 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-6xl mx-auto space-y-8 relative">

        {error && (
          <div className="glass-panel p-4 rounded-2xl border border-red-500/30 text-red-400 text-sm font-semibold">
            ⚠ {error}
          </div>
        )}

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
                <p className="text-5xl font-bold text-emerald-400 tracking-tight">{Math.round(balance).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  CO2 Saved
                </p>
                <p className="text-5xl font-bold text-teal-400 tracking-tight">{co2Saved} kg</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Trees Planted (Equiv.)
                </p>
                <p className="text-5xl font-bold text-emerald-400 tracking-tight">🌳 {treesPlanted}</p>
              </div>
            </div>
            {myRank && (
              <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                🏆 Your leaderboard rank: <span className="text-emerald-400">#{myRank}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="glass-panel p-2 rounded-2xl inline-flex gap-2">
          {[
            { key: 'earn', label: 'How to Earn' },
            { key: 'redeem', label: 'Rewards Store' },
            { key: 'leaderboard', label: 'Leaderboard' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === tab.key
                  ? 'bg-emerald-500 text-emerald-950'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'earn' && (
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
        )}

        {activeTab === 'redeem' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewards.map((reward) => {
              const affordable = balance >= reward.cost;
              const isRedeeming = redeemingId === reward._id;
              return (
                <div
                  key={reward._id}
                  className="glass-panel glass-panel-hover p-6 border border-[var(--border-subtle)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-2xl mb-4">
                      {reward.icon}
                    </div>
                    <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{reward.title}</h3>
                    {reward.description && (
                      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{reward.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!affordable || isRedeeming}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                      affordable
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                        : 'opacity-40 bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-not-allowed'
                    }`}
                  >
                    {isRedeeming ? 'Redeeming...' : `Redeem (${reward.cost})`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="glass-panel p-6 relative overflow-hidden">
            <h2 className="font-bold mb-6 uppercase tracking-widest text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Top Eco Commuters
            </h2>
            <div className="space-y-2">
              {leaderboard.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] py-6 text-center">No rankings yet — complete a ride to get on the board!</p>
              )}
              {leaderboard.map((entry, idx) => {
                const isMe = entry._id === user?._id || entry._id === user?.id;
                return (
                  <div
                    key={entry._id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      isMe ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold w-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase">
                        {entry.firstName?.[0]}{entry.lastName?.[0]}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {entry.firstName} {entry.lastName} {isMe && <span className="text-emerald-400 text-xs">(you)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-emerald-400">{Math.round(entry.lifetimeGreenCredits)} credits</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{Math.round(entry.lifetimeCo2SavedKg || 0)} kg CO2 saved</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Transaction History ── */}
        <div className="glass-panel p-6 relative overflow-hidden">
          <h2 className="font-bold mb-6 uppercase tracking-widest text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Transaction History
          </h2>
          <div className="space-y-3">
            {history.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] py-6 text-center">No redemptions yet.</p>
            )}
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
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl text-sm font-semibold flex items-center gap-2"
          style={
            toast.error
              ? { background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }
              : { background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#34d399' }
          }
        >
          {toast.error ? '⚠' : '✅'} {toast.message}
        </div>
      )}
    </div>
  );
};

export default GreenCreditsPage;
