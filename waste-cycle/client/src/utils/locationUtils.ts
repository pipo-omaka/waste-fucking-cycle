/**
 * Location utility functions for navigation and geocoding
 */

export interface Location {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  location: Location;
  formattedAddress: string;
}

/**
 * Get user's current location using browser Geolocation API
 * @returns Promise<Location> - User's current GPS coordinates
 */
export const getUserLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

/**
 * Geocode an address string to coordinates using Google Geocoding API
 * @param address - Address string to geocode
 * @param geocoder - Google Maps Geocoder instance
 * @returns Promise<GeocodeResult> - Geocoded location and formatted address
 */
export const geocodeAddress = (
  address: string,
  geocoder: google.maps.Geocoder
): Promise<GeocodeResult> => {
  return new Promise((resolve, reject) => {
    if (!address || address.trim() === '') {
      reject(new Error('Address cannot be empty'));
      return;
    }

    geocoder.geocode(
      { address: address.trim() },
      (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          resolve({
            location: {
              lat: location.lat(),
              lng: location.lng(),
            },
            formattedAddress: results[0].formatted_address,
          });
        } else {
          let errorMessage = 'Geocoding failed';
          
          switch (status) {
            case 'ZERO_RESULTS':
              errorMessage = 'No results found for this address';
              break;
            case 'OVER_QUERY_LIMIT':
              errorMessage = 'Geocoding quota exceeded';
              break;
            case 'REQUEST_DENIED':
              errorMessage = 'Geocoding request denied';
              break;
            case 'INVALID_REQUEST':
              errorMessage = 'Invalid geocoding request';
              break;
          }
          
          reject(new Error(errorMessage));
        }
      }
    );
  });
};

/**
 * Open Google Maps navigation in a new tab/window
 * Works on both mobile and desktop
 * @param origin - Starting location coordinates
 * @param destination - Destination location coordinates
 */
export const openNavigation = (origin: Location, destination: Location): void => {
  const originStr = `${origin.lat},${origin.lng}`;
  const destinationStr = `${destination.lat},${destination.lng}`;
  
  const url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}`;
  
  // Open in new tab/window
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Format location coordinates as a readable string
 * @param location - Location coordinates
 * @returns Formatted string
 */
export const formatLocation = (location: Location): string => {
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
};

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 - First location
 * @param point2 - Second location
 * @returns Distance in kilometers
 */
export const calculateDistance = (point1: Location, point2: Location): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLon = (point2.lng - point1.lng) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
      Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

