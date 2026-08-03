/**
 * Country detection via third-party IP geolocation.
 * Only call after an explicit user action — IP is sent to these providers.
 */

export type DetectCountryOptions = {
  /** Browser geolocation requires a second permission prompt; off by default. */
  allowGeolocation?: boolean;
};

/**
 * Get user's country code based on their IP address.
 * Uses third-party geolocation APIs (ipapi.co, ip-api.com, ipgeolocation.io, ipwho.is).
 */
export const detectCountryFromIP = async (): Promise<string | null> => {
  const services = [
    async () => {
      try {
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            return String(data.country_code).toUpperCase();
          }
        }
      } catch {
        // Ignore and try next service
      }
      return null;
    },

    async () => {
      try {
        const response = await fetch('https://ip-api.com/json/?fields=status,countryCode', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.countryCode) {
            return String(data.countryCode).toUpperCase();
          }
        }
      } catch {
        // Ignore and try next service
      }
      return null;
    },

    async () => {
      try {
        const response = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=free', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country_code2) {
            return String(data.country_code2).toUpperCase();
          }
        }
      } catch {
        // Ignore and try next service
      }
      return null;
    },

    async () => {
      try {
        const response = await fetch('https://ipwho.is/', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.country_code) {
            return String(data.country_code).toUpperCase();
          }
        }
      } catch {
        // Ignore
      }
      return null;
    },
  ];

  for (const service of services) {
    try {
      const country = await service();
      if (country && /^[A-Z]{2}$/.test(country)) {
        return country;
      }
    } catch {
      continue;
    }
  }

  return null;
};

/**
 * Get user's country code using browser geolocation API.
 * More accurate but requires user permission.
 * Coordinates may be sent to BigDataCloud / geocode.xyz for reverse geocoding.
 */
export const detectCountryFromGeolocation = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 8000);

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(timeoutId);
          try {
            const { latitude, longitude } = position.coords;

            const services = [
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
              `https://geocode.xyz/${latitude},${longitude}?json=1&geoit=json`,
            ];

            for (const url of services) {
              try {
                const response = await fetch(url, {
                  method: 'GET',
                  headers: { Accept: 'application/json' },
                });

                if (response.ok) {
                  const data = await response.json();
                  if (data.countryCode || data.prov) {
                    const countryCode = String(data.countryCode || data.prov).toUpperCase();
                    if (/^[A-Z]{2}$/.test(countryCode)) {
                      resolve(countryCode);
                      return;
                    }
                  }
                }
              } catch {
                continue;
              }
            }

            resolve(null);
          } catch {
            resolve(null);
          }
        },
        () => {
          clearTimeout(timeoutId);
          resolve(null);
        },
        {
          timeout: 7000,
          enableHighAccuracy: false,
          maximumAge: 300000,
        }
      );
    } catch {
      clearTimeout(timeoutId);
      resolve(null);
    }
  });
};

/**
 * Detect user's country. Defaults to IP-only (no browser permission prompt).
 * Pass allowGeolocation: true only after the user opts in.
 */
export const detectUserCountry = async (
  options: DetectCountryOptions = {}
): Promise<string | null> => {
  const ipCountry = await detectCountryFromIP();
  if (ipCountry) {
    return ipCountry;
  }

  if (options.allowGeolocation) {
    return detectCountryFromGeolocation();
  }

  return null;
};
