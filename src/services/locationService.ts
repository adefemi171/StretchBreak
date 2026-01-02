/**
 * Get user's country code based on their IP address
 * Uses free geolocation APIs with CORS support
 */
export const detectCountryFromIP = async (): Promise<string | null> => {
  // Try multiple services in order until one works
  const services = [
    // Service 1: ipapi.co (with CORS proxy if needed)
    async () => {
      try {
        // Try direct first
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            return data.country_code.toUpperCase();
          }
        }
      } catch (e) {
        // Ignore and try next service
      }
      return null;
    },
    
    // Service 2: ip-api.com (free tier, supports CORS)
    async () => {
      try {
        const response = await fetch('https://ip-api.com/json/?fields=status,countryCode', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.countryCode) {
            return data.countryCode.toUpperCase();
          }
        }
      } catch (e) {
        // Ignore and try next service
      }
      return null;
    },
    
    // Service 3: ipgeolocation.io (free tier, CORS enabled)
    async () => {
      try {
        const response = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=free', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country_code2) {
            return data.country_code2.toUpperCase();
          }
        }
      } catch (e) {
        // Ignore and try next service
      }
      return null;
    },
    
    // Service 4: ipwho.is (free, CORS enabled)
    async () => {
      try {
        const response = await fetch('https://ipwho.is/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            return data.country_code.toUpperCase();
          }
        }
      } catch (e) {
        // Ignore
      }
      return null;
    },
  ];
  
  // Try each service sequentially
  for (const service of services) {
    try {
      const country = await service();
      if (country) {
        return country;
      }
    } catch (error) {
      // Continue to next service
      continue;
    }
  }
  
  return null;
};

/**
 * Get user's country code using browser geolocation API
 * More accurate but requires user permission
 * Note: This may be blocked by browser extensions or privacy settings
 */
export const detectCountryFromGeolocation = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }
    
    // Set a timeout to avoid hanging
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 8000);
    
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          try {
            const { latitude, longitude } = position.coords;
            
            // Use reverse geocoding to get country from coordinates
            // Try multiple services
            const services = [
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
              `https://geocode.xyz/${latitude},${longitude}?json=1&geoit=json`,
            ];
            
            for (const url of services) {
              try {
                const response = await fetch(url, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                  },
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.countryCode || data.prov) {
                    const countryCode = (data.countryCode || data.prov)?.toUpperCase();
                    if (countryCode && countryCode.length === 2) {
                      resolve(countryCode);
                      return;
                    }
                  }
                }
              } catch (e) {
                // Try next service
                continue;
              }
            }
            
            resolve(null);
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            resolve(null);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          // Don't log errors from browser extensions or user denial
          if (error.code !== error.PERMISSION_DENIED) {
            console.warn('Geolocation error:', error);
          }
          resolve(null);
        },
        {
          timeout: 7000,
          enableHighAccuracy: false,
          maximumAge: 300000, // Cache for 5 minutes
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Geolocation not available:', error);
      resolve(null);
    }
  });
};

/**
 * Detect user's country using the best available method
 * Tries IP-based detection first (faster, no permission), then geolocation if needed
 */
export const detectUserCountry = async (): Promise<string | null> => {
  // Try IP-based detection first (faster, no permission needed)
  const ipCountry = await detectCountryFromIP();
  if (ipCountry) {
    return ipCountry;
  }
  
  // Fallback to geolocation (more accurate, but requires permission and is slower)
  const geoCountry = await detectCountryFromGeolocation();
  if (geoCountry) {
    return geoCountry;
  }
  
  return null;
};

