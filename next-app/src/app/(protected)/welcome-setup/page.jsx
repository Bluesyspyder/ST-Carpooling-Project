"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapPreview from '@/components/MapPreview';
import { addSavedAddress } from '@/services/locationService';

const STEPS = [
  { id: 'welcome', title: 'Welcome!' },
  { id: 'home', title: 'Add Home Address', icon: '🏠', label: 'Home' },
  { id: 'office', title: 'Add College / Office', icon: '🏫', label: 'College' },
  { id: 'done', title: "You're all set!" },
];

const WelcomeSetup = () => {
  const navigate = useRouter();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(null);
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEPS[step];
  const isLocationStep = currentStep.id === 'home' || currentStep.id === 'office';

  const handleSelect = (loc) => {
    setLocation(loc);
    setVerified(false);
    setError('');
  };

  const handleMapChange  = (loc) => { setLocation(loc); setVerified(false); };
  const handleConfirm    = () => setVerified(true);
  const handleUnconfirm  = () => setVerified(false);

  const handleSave = async () => {
    if (!location?.latitude) { setError('Please select an address.'); return; }
    setSaving(true);
    setError('');
    try {
      await addSavedAddress({
        label: currentStep.label,
        icon: currentStep.icon,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        verified,
      });
      setLocation(null);
      setVerified(false);
      setStep((s) => s + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  const skip = () => { setLocation(null); setVerified(false); setStep((s) => s + 1); };
  const finish = () => navigate('/');

  return (
    <div className="min-h-screen bg-[var(--bg-default)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-violet-500 w-8' : 'bg-slate-700 w-4'}`} />
          ))}
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-8 shadow-2xl">
          {/* Welcome */}
          {currentStep.id === 'welcome' && (
            <div className="text-center">
              <div className="text-6xl mb-4">🚗</div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Welcome to ST Carpooling!</h1>
              <p className="text-[var(--text-secondary)] mb-8">Let's set up your frequently used locations for faster ride creation and booking.</p>
              <button onClick={() => setStep(1)} className="w-full bg-violet-600 hover:bg-violet-500 text-[var(--text-primary)] font-medium py-3 rounded-xl transition-colors">
                Get Started
              </button>
              <button onClick={finish} className="mt-3 w-full text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors">
                Skip setup
              </button>
            </div>
          )}

          {/* Location steps */}
          {isLocationStep && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">{currentStep.icon}</span>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{currentStep.title}</h2>
              </div>

              <AddressAutocomplete
                value={location?.address || ''}
                onChange={handleSelect}
                placeholder={`Search for your ${currentStep.label.toLowerCase()}…`}
                showCurrentLocation
              />

              {location?.latitude && (
                <div className="mt-4">
                  <MapPreview
                    location={location}
                    onLocationChange={handleMapChange}
                    height="240px"
                    interactive
                    onConfirm={handleConfirm}
                    onUnconfirm={handleUnconfirm}
                    confirmed={verified}
                    markerColor="#7c3aed"
                  />
                </div>
              )}

              {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button onClick={skip} className="flex-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm py-2.5 rounded-xl border border-[var(--border-default)] transition-colors">
                  Skip
                </button>
                <button onClick={handleSave} disabled={saving || !location?.latitude}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-[var(--text-primary)] font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save & Continue'}
                </button>
              </div>
            </>
          )}

          {/* Done */}
          {currentStep.id === 'done' && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">You're all set!</h2>
              <p className="text-[var(--text-secondary)] mb-8">Your locations are saved. You can manage them anytime from your Profile page.</p>
              <button onClick={finish} className="w-full bg-violet-600 hover:bg-violet-500 text-[var(--text-primary)] font-medium py-3 rounded-xl transition-colors">
                Go to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeSetup;
