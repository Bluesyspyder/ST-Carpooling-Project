import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import AddressAutocomplete from '../../components/AddressAutocomplete.jsx';
import MapPreview from '../../components/MapPreview.jsx';

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

  const emailRef = useRef(null);
  const addressRef = useRef(null);
  const profileImageRef = useRef(null);
  const vehicleImageRef = useRef(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      navigate('/');
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

  const inputClass = 'mt-1 appearance-none block w-full px-3 py-2.5 border border-slate-800 rounded-xl bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 sm:text-sm transition-all duration-200';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1';

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h1 className="text-center text-3xl font-extrabold text-slate-100 mb-1">
          Create your account
        </h1>
        <p className="text-center text-sm text-slate-400 mb-8">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>
        </p>

        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/60">
          {error && (
            <div className="mb-6 bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-2">
              <span>⚠</span> {error}
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
                Work Email <span className="text-slate-500 text-xs">(must be @st.com)</span>
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
              <input
                id="password" name="password" type="password" required
                value={formData.password} onChange={handleChange}
                className={inputClass} placeholder="Min 6 characters"
              />
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
                    markerColor="#7c3aed"
                  />
                </div>
              )}
            </div>

            {/* Profile Photo */}
            <div ref={profileImageRef}>
              <label className={labelClass}>
                Profile Photo <span className="text-slate-500 text-xs">(Optional)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile preview" className="h-20 w-20 object-cover rounded-full border-2 border-emerald-500/30" />
                  ) : (
                    <div className="h-20 w-20 bg-slate-800/50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-700">
                      <svg className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  id="profileImage" name="profileImage" type="file" accept="image/*"
                  onChange={(e) => handleImageChange(e, 'profile')}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Account Type */}
            <div>
              <label htmlFor="role" className={labelClass}>Account Type</label>
              <select
                id="role" name="role" value={formData.role} onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              >
                <option value="passenger">Co-Rider — I need a ride</option>
                <option value="hybrid">Rider — I can drive &amp; take rides</option>
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                {formData.role === 'hybrid'
                  ? '🚗 As a Rider, you can both offer rides and book seats in other cars.'
                  : '🧑‍💼 As a Co-Rider, you can search and book available rides.'}
              </p>
            </div>

            {/* Vehicle Details — Riders only */}
            {formData.role === 'hybrid' && (
              <div className="space-y-4 border border-slate-800/60 rounded-2xl p-5 bg-slate-900/30">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
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
                    <input
                      id="vehiclePlateNumber" name="vehiclePlateNumber" type="text" required
                      value={formData.vehiclePlateNumber} onChange={handleChange}
                      className={inputClass} placeholder="e.g. ABC-1234"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="vehicleType" className={labelClass}>Fuel Type</label>
                    <select
                      id="vehicleType" name="vehicleType" value={formData.vehicleType} onChange={handleChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-800 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
                    Vehicle Photo <span className="text-red-400 text-xs">(Required)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {vehicleImagePreview ? (
                        <img src={vehicleImagePreview} alt="Vehicle preview" className="h-20 w-32 object-cover rounded-xl border-2 border-emerald-500/20" />
                      ) : (
                        <div className="h-20 w-32 bg-slate-800/50 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-700">
                          <svg className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <input
                      id="vehicleImage" name="vehicleImage" type="file" accept="image/*" required
                      onChange={(e) => handleImageChange(e, 'vehicle')}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optional fields */}
            <div className="border border-slate-800/40 rounded-2xl p-5 bg-slate-900/20 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Info (Optional)</h3>
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
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
