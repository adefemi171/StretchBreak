import { useState } from 'react';
import { detectUserCountry } from '../services/locationService';

export const useLocation = () => {
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const detectLocation = async () => {
    setIsDetecting(true);
    setError(null);
    
    try {
      const country = await detectUserCountry();
      setDetectedCountry(country);
      
      if (!country) {
        setError('Could not detect your location');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect location');
      setDetectedCountry(null);
    } finally {
      setIsDetecting(false);
    }
  };
  
  return {
    detectedCountry,
    isDetecting,
    error,
    detectLocation,
  };
};

