import api from './api.js';

export const fetchVehicles = async () => {
  const res = await api.get('/vehicles');
  return res.data.data.vehicles;
};

export const addVehicle = async (data) => {
  const res = await api.post('/vehicles', data);
  return res.data.data; // { vehicle, user? } — user present only when this promoted a passenger to hybrid
};

export const updateVehicle = async (id, data) => {
  const res = await api.patch(`/vehicles/${id}`, data);
  return res.data.data.vehicle;
};

export const deleteVehicle = async (id) => {
  await api.delete(`/vehicles/${id}`);
};

export const uploadVehicleImage = async (id, vehicleImage) => {
  const res = await api.post(`/vehicles/${id}/upload-image`, { vehicleImage });
  return res.data.data.vehicle;
};

// Looks up a vehicle's registration details from its plate number so a form
// can auto-fill vehicleName/vehicleType/seatCount instead of the user typing them.
export const lookupVehicleByPlate = async (plateNumber) => {
  const res = await api.get('/vehicles/lookup', { params: { vehiclePlateNumber: plateNumber } });
  return res.data.data.vehicle;
};
