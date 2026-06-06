import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

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
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e, imageType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(`${imageType === 'profile' ? 'Profile' : 'Vehicle'} image must be less than 5MB`);
      return;
    }

    // Read file as data URL for preview
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

    // Client-side domain validation
    if (!formData.email.toLowerCase().endsWith('@st.com')) {
      setError('Registration is restricted to employees. Email must end with @st.com');
      return;
    }

    // Validate vehicle image for drivers
    if (formData.role === 'hybrid' && !vehicleImage) {
      setError('Vehicle image is required for drivers');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData };

      if (payload.role === 'hybrid') {
        payload.mileage = parseFloat(payload.mileage) || 0;
        payload.seatCount = Number(payload.seatCount) || 4;
        if (vehicleImage) {
          payload.vehicleImage = vehicleImage;
        }
      } else {
        delete payload.vehicleName;
        delete payload.vehiclePlateNumber;
        delete payload.vehicleType;
        delete payload.mileage;
        delete payload.seatCount;
      }

      // Add optional profile image
      if (profileImage) {
        payload.profileImage = profileImage;
      }

      if (!payload.emergencyContact) delete payload.emergencyContact;
      if (!payload.bio) delete payload.bio;

      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Check your data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-5xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-5xl">
        <div className="glass-panel py-8 px-4 shadow-2xl rounded-2xl sm:px-10 max-h-[calc(100vh-190px)] overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form className="grid gap-6 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid sm:grid-cols-2 gap-4 lg:col-span-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-300">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-300">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email address (Must be @st.com)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="employee@st.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                required
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-300">
                Home / Office Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={formData.address}
                onChange={handleChange}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                placeholder="123 Corporate Way, Suite 400"
              />
            </div>

            {/* Profile Image Upload */}
            <div className="lg:col-span-2">
              <label htmlFor="profileImage" className="block text-sm font-medium text-slate-300 mb-2">
                Profile Photo <span className="text-slate-400 text-xs">(Optional)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="h-20 w-20 object-cover rounded-full border-2 border-emerald-500/20"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-slate-800/50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-600">
                      <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  id="profileImage"
                  name="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, 'profile')}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="role" className="block text-sm font-medium text-slate-300">
                Your Type of Account
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-800 focus:outline-none focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm rounded-lg bg-slate-900 text-slate-100"
              >
                <option value="passenger">Passenger</option>
                <option value="hybrid">Driver</option>
              </select>
            </div>

            {formData.role === 'hybrid' && (
              <div className="space-y-4 border-t border-slate-800 pt-4 lg:col-span-2">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Vehicle Details
                </h3>
                
                <div>
                  <label htmlFor="vehicleName" className="block text-sm font-medium text-slate-300">
                    Vehicle Name
                  </label>
                  <input
                    id="vehicleName"
                    name="vehicleName"
                    type="text"
                    required
                    value={formData.vehicleName}
                    onChange={handleChange}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                    placeholder="e.g. Toyota Prius"
                  />
                </div>

                <div>
                  <label htmlFor="vehiclePlateNumber" className="block text-sm font-medium text-slate-300">
                    Vehicle Plate Number
                  </label>
                  <input
                    id="vehiclePlateNumber"
                    name="vehiclePlateNumber"
                    type="text"
                    required
                    value={formData.vehiclePlateNumber}
                    onChange={handleChange}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                    placeholder="e.g. ABC-1234"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleType" className="block text-sm font-medium text-slate-300">
                      Fuel Type
                    </label>
                    <select
                      id="vehicleType"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-800 focus:outline-none focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm rounded-lg bg-slate-900 text-slate-100"
                    >
                      <option value="diesel">Diesel</option>
                      <option value="petrol">Petrol</option>
                      <option value="ev">EV</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-slate-300">
                      Mileage (km/l)
                    </label>
                    <input
                      id="mileage"
                      name="mileage"
                      type="number"
                      step="0.1"
                      required
                      value={formData.mileage}
                      onChange={handleChange}
                      className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                      placeholder="e.g. 15.5"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="seatCount" className="block text-sm font-medium text-slate-300">
                    Seat Count
                  </label>
                  <input
                    id="seatCount"
                    name="seatCount"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.seatCount}
                    onChange={handleChange}
                    className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                    placeholder="e.g. 4"
                  />
                </div>

                {/* Vehicle Image Upload */}
                <div className="border-t border-slate-800 pt-4">
                  <label htmlFor="vehicleImage" className="block text-sm font-medium text-slate-300 mb-2">
                    Vehicle Photo <span className="text-red-400 text-xs">(Required)</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {vehicleImagePreview ? (
                        <img
                          src={vehicleImagePreview}
                          alt="Vehicle preview"
                          className="h-20 w-32 object-cover rounded-lg border-2 border-emerald-500/20"
                        />
                      ) : (
                        <div className="h-20 w-32 bg-slate-800/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
                          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <input
                      id="vehicleImage"
                      name="vehicleImage"
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => handleImageChange(e, 'vehicle')}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 border-t border-slate-800 pt-4 lg:col-span-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Additional Info (Optional)
              </h3>
              
              <div>
                <label htmlFor="emergencyContact" className="block text-sm font-medium text-slate-300">
                  Emergency Contact Phone
                </label>
                <input
                  id="emergencyContact"
                  name="emergencyContact"
                  type="text"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-slate-300">
                  Short Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows="2"
                  value={formData.bio}
                  onChange={handleChange}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
                  placeholder="Tell co-workers about yourself..."
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// export default Register;
// {
//   return (
//     <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative">
//       <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>

//       <div className="sm:mx-auto sm:w-full sm:max-w-5xl">
//         <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
//           Create your account
//         </h2>
//         <p className="mt-2 text-center text-sm text-slate-400">
//           Already have an account?{' '}
//           <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
//             Sign in
//           </Link>
//         </p>
//       </div>

//       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-5xl">
//         <div className="glass-panel py-8 px-4 shadow-2xl rounded-2xl sm:px-10 max-h-[calc(100vh-190px)] overflow-y-auto">
//           {error && (
//             <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
//               {error}
//             </div>
//           )}

//           <form className="grid gap-6 lg:grid-cols-2" onSubmit={handleSubmit}>
//             <div className="grid sm:grid-cols-2 gap-4 lg:col-span-2">
//               <div>
//                 <label htmlFor="firstName" className="block text-sm font-medium text-slate-300">
//                   First Name
//                 </label>
//                 <input
//                   id="firstName"
//                   name="firstName"
//                   type="text"
//                   required
//                   value={formData.firstName}
//                   onChange={handleChange}
//                   className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                   placeholder="John"
//                 />
//               </div>
//               <div>
//                 <label htmlFor="lastName" className="block text-sm font-medium text-slate-300">
//                   Last Name
//                 </label>
//                 <input
//                   id="lastName"
//                   name="lastName"
//                   type="text"
//                   required
//                   value={formData.lastName}
//                   onChange={handleChange}
//                   className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                   placeholder="Doe"
//                 />
//               </div>
//             </div>

//             <div>
//               <label htmlFor="email" className="block text-sm font-medium text-slate-300">
//                 Email address (Must be @st.com)
//               </label>
//               <input
//                 id="email"
//                 name="email"
//                 type="email"
//                 required
//                 value={formData.email}
//                 onChange={handleChange}
//                 className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                 placeholder="employee@st.com"
//               />
//             </div>

//             <div>
//               <label htmlFor="password" className="block text-sm font-medium text-slate-300">
//                 Password
//               </label>
//               <input
//                 id="password"
//                 name="password"
//                 type="password"
//                 required
//                 value={formData.password}
//                 onChange={handleChange}
//                 className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                 placeholder="Min 6 characters"
//               />
//             </div>

//             <div>
//               <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
//                 Phone Number
//               </label>
//               <input
//                 id="phone"
//                 name="phone"
//                 type="text"
//                 required
//                 value={formData.phone}
//                 onChange={handleChange}
//                 className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                 placeholder="+1 (555) 000-0000"
//               />
//             </div>

//             <div>
//               <label htmlFor="address" className="block text-sm font-medium text-slate-300">
//                 Home / Office Address
//               </label>
//               <input
//                 id="address"
//                 name="address"
//                 type="text"
//                 required
//                 value={formData.address}
//                 onChange={handleChange}
//                 className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                 placeholder="123 Corporate Way, Suite 400"
//               />
//             </div>

//             <div className="lg:col-span-2">
//               <label htmlFor="role" className="block text-sm font-medium text-slate-300">
//                 Your Type of Account
//               </label>
//               <select
//                 id="role"
//                 name="role"
//                 value={formData.role}
//                 onChange={handleChange}
//                 className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-800 focus:outline-none focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm rounded-lg bg-slate-900 text-slate-100"
//               >
//                 <option value="passenger">Passenger</option>
//                 <option value="driver">Driver</option>
//               </select>
//             </div>

//             {formData.role === 'driver' && (
//               <div className="space-y-4 border-t border-slate-800 pt-4 lg:col-span-2">
//                 <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
//                   Vehicle Details
//                 </h3>
                
//                 <div>
//                   <label htmlFor="vehicleName" className="block text-sm font-medium text-slate-300">
//                     Vehicle Name
//                   </label>
//                   <input
//                     id="vehicleName"
//                     name="vehicleName"
//                     type="text"
//                     required
//                     value={formData.vehicleName}
//                     onChange={handleChange}
//                     className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                     placeholder="e.g. Toyota Prius"
//                   />
//                 </div>

//                 <div>
//                   <label htmlFor="vehiclePlateNumber" className="block text-sm font-medium text-slate-300">
//                     Vehicle Plate Number
//                   </label>
//                   <input
//                     id="vehiclePlateNumber"
//                     name="vehiclePlateNumber"
//                     type="text"
//                     required
//                     value={formData.vehiclePlateNumber}
//                     onChange={handleChange}
//                     className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                     placeholder="e.g. ABC-1234"
//                   />
//                 </div>

//                 <div className="grid sm:grid-cols-2 gap-4">
//                   <div>
//                     <label htmlFor="vehicleType" className="block text-sm font-medium text-slate-300">
//                       Fuel Type
//                     </label>
//                     <select
//                       id="vehicleType"
//                       name="vehicleType"
//                       value={formData.vehicleType}
//                       onChange={handleChange}
//                       className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-800 focus:outline-none focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm rounded-lg bg-slate-900 text-slate-100"
//                     >
//                       <option value="diesel">Diesel</option>
//                       <option value="petrol">Petrol</option>
//                       <option value="ev">EV</option>
//                     </select>
//                   </div>

//                   <div>
//                     <label htmlFor="mileage" className="block text-sm font-medium text-slate-300">
//                       Mileage (km/l)
//                     </label>
//                     <input
//                       id="mileage"
//                       name="mileage"
//                       type="number"
//                       step="0.1"
//                       required
//                       value={formData.mileage}
//                       onChange={handleChange}
//                       className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                       placeholder="e.g. 15.5"
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <label htmlFor="seatCount" className="block text-sm font-medium text-slate-300">
//                     Seat Count
//                   </label>
//                   <input
//                     id="seatCount"
//                     name="seatCount"
//                     type="number"
//                     min="1"
//                     max="10"
//                     required
//                     value={formData.seatCount}
//                     onChange={handleChange}
//                     className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                     placeholder="e.g. 4"
//                   />
//                 </div>
//               </div>
//             )}

//             <div className="space-y-4 border-t border-slate-800 pt-4 lg:col-span-2">
//               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
//                 Additional Info (Optional)
//               </h3>
              
//               <div>
//                 <label htmlFor="emergencyContact" className="block text-sm font-medium text-slate-300">
//                   Emergency Contact Phone
//                 </label>
//                 <input
//                   id="emergencyContact"
//                   name="emergencyContact"
//                   type="text"
//                   value={formData.emergencyContact}
//                   onChange={handleChange}
//                   className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                   placeholder="+1 (555) 000-0000"
//                 />
//               </div>

//               <div>
//                 <label htmlFor="bio" className="block text-sm font-medium text-slate-300">
//                   Short Bio
//                 </label>
//                 <textarea
//                   id="bio"
//                   name="bio"
//                   rows="2"
//                   value={formData.bio}
//                   onChange={handleChange}
//                   className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 placeholder-slate-500 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm"
//                   placeholder="Tell co-workers about yourself..."
//                 />
//               </div>
//             </div>

//             <div className="lg:col-span-2">
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
//               >
//                 {isSubmitting ? 'Registering...' : 'Register'}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

export default Register;

