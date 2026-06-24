const apiKey = 'vwJ3eDhtcXs7m6sbReBSzLTL7ZOMMSDy1Nd7ilDU';
const OLA_BASE = 'https://api.olamaps.io';

async function testOla() {
  const origin = { lat: 28.4725, lng: 77.48889 };
  const destination = { lat: 28.5355, lng: 77.3910 };

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    api_key: apiKey,
    mode: 'driving',
    overview: 'full',
    route_preference: 'fastest',
  });

  try {
    const postRes = await fetch(`${OLA_BASE}/routing/v1/directions?${params}`, { method: 'POST' });
    const data = await postRes.json();
    console.log(typeof data.routes[0].overview_polyline);
    console.log(data.routes[0].overview_polyline.substring ? data.routes[0].overview_polyline.substring(0, 20) : Object.keys(data.routes[0].overview_polyline));
  } catch (e) {
    console.log('POST ERR', e.message);
  }
}

testOla();
