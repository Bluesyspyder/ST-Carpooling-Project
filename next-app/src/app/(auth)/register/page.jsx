"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { lookupVehicleByPlate } from '@/services/vehicleService';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapPreview from '@/components/MapPreview';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'passenger',
    vehicleName: '',
    vehiclePlateNumber: '',
    vehicleType: 'diesel',
    mileage: '',
    seatCount: 4,
    emergencyContact: '',
    bio: '',
  });

  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [vehicleImage, setVehicleImage] = useState(null);
  const [vehicleImagePreview, setVehicleImagePreview] = useState(null);
  const [addressLoc, setAddressLoc] = useState({ address: '', latitude: null, longitude: null, verified: false });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLookingUpPlate, setIsLookingUpPlate] = useState(false);
  const [plateLookupError, setPlateLookupError] = useState('');

  const emailRef = useRef(null);
  const addressRef = useRef(null);
  const profileImageRef = useRef(null);
  const vehicleImageRef = useRef(null);

  const { register } = useAuth();
  const navigate = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlateLookup = async () => {
    if (!formData.vehiclePlateNumber || formData.vehiclePlateNumber.length < 4) return;
    setIsLookingUpPlate(true);
    setPlateLookupError('');
    try {
      const vehicle = await lookupVehicleByPlate(formData.vehiclePlateNumber);
      if (vehicle) {
        setFormData(prev => ({
          ...prev,
          vehicleName: vehicle.vehicleName || prev.vehicleName,
          vehicleType: vehicle.vehicleType || prev.vehicleType,
          mileage: vehicle.mileage || prev.mileage,
          seatCount: vehicle.seatCount || prev.seatCount,
        }));
      }
    } catch (err) {
      console.log('Vehicle lookup failed', err);
      setPlateLookupError('Unable to auto-fill vehicle details. Please enter manually.');
    } finally {
      setIsLookingUpPlate(false);
    }
  };

  const handleImageChange = (e, imageType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(`${imageType === 'profile' ? 'Profile' : 'Vehicle'} image must be less than 5MB`);
      if (imageType === 'profile') profileImageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else vehicleImageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (imageType === 'profile') {
        setProfileImagePreview(reader.result);
        setProfileImage(reader.result);
      } else {
        setVehicleImagePreview(reader.result);
        setVehicleImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.toLowerCase().endsWith('@st.com')) {
      setError('Registration is restricted to ST employees. Email must end with @st.com');
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!formData.address) {
      setError('Home / Office Address is required');
      addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (formData.role === 'hybrid' && !vehicleImage) {
      setError('Vehicle image is required for Riders');
      vehicleImageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData };

      if (payload.role === 'hybrid') {
        payload.mileage = parseFloat(payload.mileage) || 0;
        payload.seatCount = Number(payload.seatCount) || 4;
        if (vehicleImage) payload.vehicleImage = vehicleImage;
      } else {
        delete payload.vehicleName;
        delete payload.vehiclePlateNumber;
        delete payload.vehicleType;
        delete payload.mileage;
        delete payload.seatCount;
      }

      if (profileImage) payload.profileImage = profileImage;
      if (!payload.emergencyContact) delete payload.emergencyContact;
      if (!payload.bio) delete payload.bio;

      await register(payload);
      window.alert('Account was created successfully!');
      navigate.push('/');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed. Please check your information.';
      setError(errMsg);
      if (errMsg.toLowerCase().includes('email')) {
        emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'form-input';
  const labelClass = 'block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2';

  return (
    <div className="min-h-[calc(100vh-73px)] relative py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--primary-base)]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        <p className="text-[var(--primary-base)] font-bold uppercase tracking-widest text-[10px] mb-3 text-center">Registration</p>
        <h1 className="text-center text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Create your account
        </h1>
        <p className="text-center text-sm text-[var(--text-secondary)] font-medium mb-8">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[var(--primary-base)] hover:text-[var(--primary-hover)] transition-colors">
            Sign in
          </Link>
        </p>

        <div className="glass-panel p-8 sm:p-10 shadow-xl shadow-[var(--border-glow)] relative z-10">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 text-red-500 p-4 text-sm font-semibold flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name row */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={labelClass}>First Name</label>
                <input
                  id="firstName" name="firstName" type="text" required
                  value={formData.firstName} onChange={handleChange}
                  className={inputClass} placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>Last Name</label>
                <input
                  id="lastName" name="lastName" type="text" required
                  value={formData.lastName} onChange={handleChange}
                  className={inputClass} placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div ref={emailRef}>
              <label htmlFor="email" className={labelClass}>
                Work Email <span className="text-[var(--text-muted)] text-xs font-medium lowercase">(must be @st.com)</span>
              </label>
              <input
                id="email" name="email" type="email" required
                value={formData.email} onChange={handleChange}
                className={inputClass} placeholder="employee@st.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} required
                  value={formData.password} onChange={handleChange}
                  className={`${inputClass} pr-10`} placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>Phone Number</label>
              <input
                id="phone" name="phone" type="text" required
                value={formData.phone} onChange={handleChange}
                className={inputClass} placeholder="+92 300 0000000"
              />
            </div>

            {/* Address */}
            <div ref={addressRef}>
              <AddressAutocomplete
                value={formData.address}
                onChange={(loc) => {
                  setFormData((prev) => ({ ...prev, address: loc.address }));
                  setAddressLoc({ ...loc, verified: false });
                }}
                placeholder="Search your home or office address…"
                label="Home / Office Address"
                showCurrentLocation
              />
              {addressLoc.latitude && (
                <div className="mt-2">
                  <MapPreview
                    location={addressLoc}
                    onLocationChange={(loc) => {
                      setAddressLoc((prev) => ({ ...prev, ...loc, verified: false }));
                      setFormData((prev) => ({ ...prev, address: loc.address || prev.address }));
                    }}
                    height="200px"
                    interactive
                    onConfirm={() => setAddressLoc((prev) => ({ ...prev, verified: true }))}
                    onUnconfirm={() => setAddressLoc((prev) => ({ ...prev, verified: false }))}
                    confirmed={addressLoc.verified}
                    markerColor="var(--primary-base)"
                  />
                </div>
              )}
            </div>

            {/* Profile Photo */}
            <div ref={profileImageRef}>
              <label className={labelClass}>
                Profile Photo <span className="text-[var(--text-muted)] text-xs font-medium lowercase">(Optional)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile preview" className="h-20 w-20 object-cover rounded-full border-2 border-[var(--primary-base)]/30" />
                  ) : (
                    <div className="h-20 w-20 bg-[var(--bg-surface)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--border-subtle)]">
                      <svg className="h-7 w-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  id="profileImage" name="profileImage" type="file" accept="image/*"
                  onChange={(e) => handleImageChange(e, 'profile')}
                  className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary-base)]/10 file:text-[var(--primary-base)] hover:file:bg-[var(--primary-base)]/20 transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Account Type */}
            <div>
              <label htmlFor="role" className={labelClass}>Account Type</label>
              <select
                id="role" name="role" value={formData.role} onChange={handleChange}
                className="form-input"
              >
                <option value="passenger">Co-Rider — I need a ride</option>
                <option value="hybrid">Rider — I can drive &amp; take rides</option>
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">
                {formData.role === 'hybrid'
                  ? '🚗 As a Rider, you can both offer rides and book seats in other cars.'
                  : '🧑‍💼 As a Co-Rider, you can search and book available rides.'}
              </p>
            </div>

            {/* Vehicle Details — Riders only */}
            {formData.role === 'hybrid' && (
              <div className="space-y-4 border border-[var(--border-subtle)] rounded-xl p-6 bg-[var(--bg-surface)] mt-6">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <span>🚗</span> Vehicle Details
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleName" className={labelClass}>Vehicle Name</label>
                    <input
                      id="vehicleName" name="vehicleName" type="text" required
                      value={formData.vehicleName} onChange={handleChange}
                      className={inputClass} placeholder="e.g. Toyota Corolla"
                    />
                  </div>
                  <div>
                    <label htmlFor="vehiclePlateNumber" className={labelClass}>Plate Number</label>
                    <div className="relative">
                      <input
                        id="vehiclePlateNumber" name="vehiclePlateNumber" type="text" required
                        value={formData.vehiclePlateNumber} onChange={handleChange} onBlur={handlePlateLookup}
                        className={inputClass} placeholder="e.g. ABC-1234"
                      />
                      {isLookingUpPlate && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--primary-base)] animate-pulse font-semibold">Looking up...</span>}
                    </div>
                    {plateLookupError && <p className="text-amber-500 text-[10px] mt-1 font-medium">{plateLookupError}</p>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="vehicleType" className={labelClass}>Fuel Type</label>
                    <select
                      id="vehicleType" name="vehicleType" value={formData.vehicleType} onChange={handleChange}
                      className="form-input"
                    >
                      <option value="diesel">Diesel</option>
                      <option value="petrol">Petrol</option>
                      <option value="ev">Electric (EV)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="mileage" className={labelClass}>Mileage (km/l)</label>
                    <input
                      id="mileage" name="mileage" type="number" step="0.1" required
                      value={formData.mileage} onChange={handleChange}
                      className={inputClass} placeholder="e.g. 15.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="seatCount" className={labelClass}>Seat Count</label>
                    <input
                      id="seatCount" name="seatCount" type="number" min="1" max="10" required
                      value={formData.seatCount} onChange={handleChange}
                      className={inputClass} placeholder="4"
                    />
                  </div>
                </div>

                {/* Vehicle Photo */}
                <div ref={vehicleImageRef}>
                  <label className={labelClass}>
                    Vehicle Photo <span className="text-red-500 text-xs font-medium lowercase">(Required)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {vehicleImagePreview ? (
                        <img src={vehicleImagePreview} alt="Vehicle preview" className="h-20 w-32 object-cover rounded-xl border-2 border-[var(--primary-base)]/20" />
                      ) : (
                        <div className="h-20 w-32 bg-[var(--bg-base)] rounded-xl flex items-center justify-center border-2 border-dashed border-[var(--border-subtle)]">
                          <svg className="h-7 w-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <input
                      id="vehicleImage" name="vehicleImage" type="file" accept="image/*" required
                      onChange={(e) => handleImageChange(e, 'vehicle')}
                      className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary-base)]/10 file:text-[var(--primary-base)] hover:file:bg-[var(--primary-base)]/20 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optional fields */}
            <div className="space-y-4 border border-[var(--border-subtle)] rounded-xl p-6 bg-[var(--bg-surface)] mt-6">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Additional Info (Optional)</h3>
              <div>
                <label htmlFor="emergencyContact" className={labelClass}>Emergency Contact Phone</label>
                <input
                  id="emergencyContact" name="emergencyContact" type="text"
                  value={formData.emergencyContact} onChange={handleChange}
                  className={inputClass} placeholder="+92 300 0000000"
                />
              </div>
              <div>
                <label htmlFor="bio" className={labelClass}>Short Bio</label>
                <textarea
                  id="bio" name="bio" rows="2"
                  value={formData.bio} onChange={handleChange}
                  className={inputClass} placeholder="Tell colleagues a bit about yourself..."
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <span className="flex justify-center items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    CREATING ACCOUNT...
                  </span>
                ) : 'CREATE ACCOUNT'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
