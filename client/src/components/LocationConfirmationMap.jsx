import { useEffect, useState, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = { lat: 28.5355, lng: 77.3910 }; // Noida/Delhi area default

const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#10b981;color:#fff;border:2px solid #fff;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.35)"><span style="transform:rotate(45deg)">P</span></div>`,
  iconAnchor: [16, 32],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#3b82f6;color:#fff;border:2px solid #fff;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.35)"><span style="transform:rotate(45deg)">D</span></div>`,
  iconAnchor: [16, 32],
});

// Helper component to center map on coordinates when they change
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
};

// Helper component to handle click events for placing manual pins
const MapEventsHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

const LocationConfirmationMap = ({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  interactive = true,
  manualMode = false,
  activeField = 'pickup', // 'pickup' or 'destination' for manual placement
}) => {
  const mapCenter = useMemo(() => {
    if (pickup?.lat && pickup?.lng) {
      return { lat: pickup.lat, lng: pickup.lng };
    }
    if (destination?.lat && destination?.lng) {
      return { lat: destination.lat, lng: destination.lng };
    }
    return DEFAULT_CENTER;
  }, [pickup, destination]);

  const handlePickupDragEnd = (e) => {
    if (onPickupChange) {
      const latLng = e.target.getLatLng();
      onPickupChange({ lat: latLng.lat, lng: latLng.lng });
    }
  };

  const handleDestinationDragEnd = (e) => {
    if (onDestinationChange) {
      const latLng = e.target.getLatLng();
      onDestinationChange({ lat: latLng.lat, lng: latLng.lng });
    }
  };

  const handleMapClick = (latlng) => {
    if (!manualMode) return;
    if (activeField === 'pickup' && onPickupChange) {
      onPickupChange({ lat: latlng.lat, lng: latlng.lng });
    } else if (activeField === 'destination' && onDestinationChange) {
      onDestinationChange({ lat: latlng.lat, lng: latlng.lng });
    }
  };

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-900">
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {pickup?.lat && pickup?.lng && (
          <Marker
            position={{ lat: pickup.lat, lng: pickup.lng }}
            icon={pickupIcon}
            draggable={interactive}
            eventHandlers={{ dragend: handlePickupDragEnd }}
          />
        )}

        {destination?.lat && destination?.lng && (
          <Marker
            position={{ lat: destination.lat, lng: destination.lng }}
            icon={destinationIcon}
            draggable={interactive}
            eventHandlers={{ dragend: handleDestinationDragEnd }}
          />
        )}

        <MapController center={mapCenter} />
        {manualMode && <MapEventsHandler onMapClick={handleMapClick} />}
      </MapContainer>
      
      {manualMode && (
        <div className="absolute bottom-4 left-4 right-4 z-[999] bg-slate-950/90 border border-emerald-500/20 px-4 py-2 rounded-lg text-xs text-slate-200 backdrop-blur-sm pointer-events-none text-center shadow-lg">
          Click anywhere on the map to place the <span className="font-bold text-emerald-400 uppercase">{activeField}</span> pin.
        </div>
      )}
    </div>
  );
};

export default LocationConfirmationMap;
