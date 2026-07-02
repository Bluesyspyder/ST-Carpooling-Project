export const validatePolyline = (points) => {
  if (!points || !Array.isArray(points) || points.length === 0) return [];

  const cleaned = [];
  let prev = null;

  for (const pt of points) {
    // Validate coordinate structure
    if (!pt || typeof pt.lat !== 'number' || typeof pt.lng !== 'number') continue;
    
    // Skip if exactly the same as previous point (consecutive duplicate)
    if (prev && prev.lat === pt.lat && prev.lng === pt.lng) continue;

    cleaned.push(pt);
    prev = pt;
  }
  
  return cleaned;
};
