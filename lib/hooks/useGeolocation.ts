import { useState, useEffect } from 'react';
import { getCountryByCode, type Country } from '@/lib/passport/countries';

interface GeolocationResult {
  countryCode: string;
  countryName: string;
  flag: string;
  region: string;
  continent: string;
  latitude: number;
  longitude: number;
}

interface UseGeolocationReturn {
  location: GeolocationResult | null;
  loading: boolean;
  error: string | null;
}

interface BigDataCloudResponse {
  countryCode: string;
  countryName: string;
  continent: string;
  continentCode: string;
  locality: string;
  city: string;
  principalSubdivision: string;
  localityInfo?: {
    administrative?: Array<{
      name: string;
      description: string;
      order: number;
    }>;
  };
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function detectLocation() {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        setLoading(false);
        return;
      }

      try {
        // Get coordinates from browser
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000, // Cache for 5 minutes
            });
          }
        );

        if (cancelled) return;

        const { latitude, longitude } = position.coords;

        // Reverse geocode via BigDataCloud (free, no API key needed)
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}`
        );

        if (!response.ok) {
          throw new Error(`Reverse geocoding failed: ${response.status}`);
        }

        const data: BigDataCloudResponse = await response.json();

        if (cancelled) return;

        if (!data.countryCode) {
          throw new Error('Could not determine country from coordinates');
        }

        // Map to our countries database for consistent naming
        const country: Country | undefined = getCountryByCode(data.countryCode);

        if (country) {
          setLocation({
            countryCode: country.code,
            countryName: country.name,
            flag: country.flag,
            region: country.region,
            continent: country.continent,
            latitude,
            longitude,
          });
        } else {
          // Country code not in our database - use API data as fallback
          setLocation({
            countryCode: data.countryCode,
            countryName: data.countryName,
            flag: '',
            region: '',
            continent: data.continent || '',
            latitude,
            longitude,
          });
        }

        setError(null);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof GeolocationPositionError) {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location permission denied. Please select your country manually.');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location information unavailable. Please select your country manually.');
              break;
            case err.TIMEOUT:
              setError('Location request timed out. Please select your country manually.');
              break;
            default:
              setError('Unable to detect location. Please select your country manually.');
          }
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to detect location. Please select your country manually.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    detectLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, loading, error };
}
