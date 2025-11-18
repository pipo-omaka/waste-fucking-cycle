import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

/**
 * PostLocationMap Component
 * 
 * Displays a Google Map centered at the post's location with a marker pin.
 * 
 * @param {Object} props - Component props
 * @param {number} props.lat - Latitude coordinate of the post location
 * @param {number} props.lng - Longitude coordinate of the post location
 * 
 * @example
 * <PostLocationMap lat={18.7883} lng={98.9853} />
 */
export function PostLocationMap({ lat, lng }) {
  // Get Google Maps API key from environment variable
  // Vite loads environment variables prefixed with VITE_ from .env file
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  // Load Google Maps API using useJsApiLoader
  // This hook detects if the script is already loaded and won't reload it
  // This prevents the "google api is already presented" error
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places'],
  });

  // Validate that lat and lng are provided and are valid numbers
  if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
    return (
      <div className="w-full h-[320px] rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">ไม่พบข้อมูลแผนที่</p>
      </div>
    );
  }

  // Map center coordinates - set to the provided lat/lng
  // This determines where the map is initially centered
  const center = { lat, lng };

  // Map zoom level - 15 provides a good street-level view
  // You can adjust this value (1-20) to zoom in/out:
  // - Lower values (1-10) = zoomed out (country/city level)
  // - Higher values (15-20) = zoomed in (street/building level)
  const zoom = 15;

  // Map container styling
  // width: 100% makes it responsive to container width
  // height: 320px matches the screenshot requirement
  // border-radius: 8px for rounded corners
  // overflow: hidden ensures content doesn't overflow rounded corners
  const mapContainerStyle = {
    width: '100%',
    height: '320px',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  // Map options configuration
  // disableDefaultUI: false - shows default UI controls (zoom, street view, etc.)
  // clickableIcons: false - prevents clicking on map icons (businesses, etc.)
  const mapOptions = {
    disableDefaultUI: false,
    clickableIcons: false,
  };

  // If API key is missing, show error message
  if (!googleMapsApiKey) {
    return (
      <div className="w-full h-[320px] rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-red-500">ไม่สามารถโหลดแผนที่ได้: ไม่พบ API Key</p>
      </div>
    );
  }

  // If map failed to load, show error message
  if (loadError) {
    return (
      <div className="w-full h-[320px] rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-red-500">เกิดข้อผิดพลาดในการโหลดแผนที่</p>
      </div>
    );
  }

  // Show loading state while Google Maps API is loading
  if (!isLoaded) {
    return (
      <div className="w-full h-[320px] rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลดแผนที่...</p>
      </div>
    );
  }

  // Render the map once the API is loaded
  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={mapOptions}
    >
      {/* Marker pin placed at the exact lat/lng coordinates */}
      {/* The Marker component automatically displays a red pin icon */}
      <Marker position={{ lat, lng }} />
    </GoogleMap>
  );
}

