import { useState, useMemo, useEffect, useRef } from 'react';
import { type User, type Post } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Map, ShoppingBag, Plus, Settings, MessageSquare, Edit, Trash, Eye, Navigation } from 'lucide-react';
import { GoogleMap, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { LocationPermissionHandler } from './LocationPermissionHandler';
import { openNavigation, type Location } from '../utils/locationUtils';

interface DashboardProps {
  user: User;
  onNavigate: (page: string) => void;
  posts: Post[];
  allPosts: Post[];
  onViewDetail: (postId: string) => void;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onChat: (postId: string) => void;
  isLoaded: boolean;
  loadError: Error | undefined;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: 18.7883, // Chiang Mai
  lng: 98.9853
};

export function Dashboard({
  user,
  onNavigate,
  posts,
  allPosts,
  onViewDetail,
  onEdit,
  onDelete,
  onChat: _onChat,
  isLoaded,
  loadError,
}: DashboardProps) {
  const [selectedMarker, setSelectedMarker] = useState<Post | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<Location>(defaultCenter);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Initialize Geocoder when map is loaded
  useEffect(() => {
    if (isLoaded && window.google) {
      setGeocoder(new window.google.maps.Geocoder());
    }
  }, [isLoaded]);

  // Update map center when user location is available
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
      // Pan map to user location
      if (mapRef.current) {
        mapRef.current.panTo(userLocation);
      }
    }
  }, [userLocation]);

  // Filter posts with valid coordinates
  const postsWithCoords = useMemo(() => {
    return allPosts.filter(post => post.location && typeof post.location.lat === 'number' && typeof post.location.lng === 'number');
  }, [allPosts]);

  const handleLocationReady = (location: Location) => {
    setUserLocation(location);
  };

  const handleNavigate = (destination: Location) => {
    if (!userLocation) {
      // If user location is not available, use map center as fallback
      const origin = mapCenter;
      openNavigation(origin, destination);
    } else {
      openNavigation(userLocation, destination);
    }
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const handleMarkerClick = (post: Post) => {
    setSelectedMarker(post);
    if (post.location) {
      setMapCenter(post.location);
      if (mapRef.current && typeof mapRef.current.panTo === 'function') {
        mapRef.current.panTo(post.location);
      }
    }

    // If the clicked post exists in the user's posts list, scroll its card into view
    const cardEl = postRefs.current[post.id];
    if (cardEl && typeof cardEl.scrollIntoView === 'function') {
      // small delay to allow layout/selection changes
      setTimeout(() => cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  };

  const renderMap = () => {
    if (loadError) return <div className="text-red-500">Error loading maps. Please check your API key.</div>;
    if (!isLoaded) return <div>Loading map...</div>;

    return (
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={userLocation ? 13 : 12}
        onLoad={handleMapLoad}
      >
        {/* User location marker */}
        {userLocation && (
          <MarkerF
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            }}
            title="ตำแหน่งของคุณ"
          />
        )}

        {/* Farm/post markers */}
        {postsWithCoords.map((post) => (
          <MarkerF
            key={post.id}
            position={post.location}
            onClick={() => handleMarkerClick(post)}
            title={post.title}
          />
        ))}

        {/* Info Window for selected marker */}
        {selectedMarker && (
          <InfoWindowF
            position={selectedMarker.location}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 max-w-xs">
              <h4 className="font-bold text-sm mb-1">{selectedMarker.title}</h4>
              <p className="text-xs mb-1 text-gray-600">{selectedMarker.address}</p>
              <p className="text-xs mb-2 font-semibold text-green-600">
                {selectedMarker.price} บาท / {selectedMarker.unit}
              </p>
              <div className="flex space-x-2">
                <Button 
                  size="xs" 
                  variant="outline"
                  onClick={() => onViewDetail(selectedMarker.id)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  ดูรายละเอียด
                </Button>
                <Button 
                  size="xs" 
                  onClick={() => handleNavigate(selectedMarker.location)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  นำทาง
                </Button>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">ยินดีต้อนรับ, {user.name}</h1>
      <p className="text-lg text-gray-600 mb-8">นี่คือภาพรวมระบบของคุณ</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <ActionButton icon={ShoppingBag} label="ตลาด" onClick={() => onNavigate('marketplace')} />
        <ActionButton icon={Plus} label="สร้างโพสต์" onClick={() => onNavigate('create-post')} />
        <ActionButton icon={MessageSquare} label="แชท" onClick={() => onNavigate('chat')} />
        <ActionButton icon={Map} label="แผนที่" onClick={() => onNavigate('circular-view')} />
        <ActionButton icon={Settings} label="โปรไฟล์" onClick={() => onNavigate('profile')} />
      </div>

      {/* Location Permission Handler */}
      {isLoaded && (
        <LocationPermissionHandler
          onLocationReady={handleLocationReady}
          geocoder={geocoder || undefined}
          isLoading={!isLoaded}
        />
      )}

      {/* Google Map Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Map className="w-5 h-5 mr-2" />
            แผนที่โพสต์ทั้งหมด
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMap()}
        </CardContent>
      </Card>
      
      {/* My Posts Section */}
      <Card>
        <CardHeader>
          <CardTitle>โพสต์ของฉัน</CardTitle>
        </CardHeader>
        <CardContent>
          {/* If selected marker is not in the user's posts, show a transient preview with mini-map */}
          {selectedMarker && !posts.find(p => p.id === selectedMarker.id) && (
            <div className="mb-4">
              <Card className="">
                <CardHeader>
                  <CardTitle>พรีวิวโพสต์</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{selectedMarker.title}</h3>
                      <p className="text-sm text-gray-600">{selectedMarker.address}</p>
                      <p className="text-sm font-semibold text-green-600">{selectedMarker.price} บาท / {selectedMarker.unit}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetail(selectedMarker.id)}>ดูรายละเอียด</Button>
                      <Button size="sm" onClick={() => handleNavigate(selectedMarker.location)} className="bg-blue-600 hover:bg-blue-700">นำทาง</Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedMarker(null)}>ปิด</Button>
                    </div>
                  </div>

                  <div className="mt-3 h-40 w-full rounded overflow-hidden">
                    {loadError ? (
                      <div className="text-red-500">Error loading maps. Please check your API key.</div>
                    ) : (!isLoaded ? (
                      <div>Loading map...</div>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={selectedMarker.location}
                        zoom={15}
                        options={{ disableDefaultUI: true }}
                      >
                        <MarkerF position={selectedMarker.location} />
                      </GoogleMap>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {posts.length === 0 ? (
            <p className="text-gray-500">คุณยังไม่มีโพสต์</p>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div
                  key={post.id}
                  ref={(el) => { postRefs.current[post.id] = el; }}
                  className="flex flex-col p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{post.title}</h3>
                      <p className="text-sm text-gray-600">{post.price} บาท / {post.unit} ({post.address})</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => onViewDetail(post.id)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => onEdit(post.id)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(post.id)}><Trash className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {/* Inline map preview when this post is selected */}
                  {selectedMarker?.id === post.id && (
                    <div className="mt-3 h-40 w-full rounded overflow-hidden relative">
                      <button
                        onClick={() => setSelectedMarker(null)}
                        className="absolute right-2 top-2 z-10 bg-white rounded-full p-1 shadow"
                        aria-label="Close preview"
                      >
                        ×
                      </button>

                      {loadError ? (
                        <div className="text-red-500">Error loading maps. Please check your API key.</div>
                      ) : (!isLoaded ? (
                        <div>Loading map...</div>
                      ) : (
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={post.location}
                          zoom={15}
                          options={{ disableDefaultUI: true }}
                        >
                          <MarkerF position={post.location} />
                        </GoogleMap>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

const ActionButton = ({ icon: Icon, label, onClick }: { icon: React.ElementType, label: string, onClick: () => void }) => (
  <Button variant="outline" className="flex flex-col h-24 items-center justify-center space-y-2" onClick={onClick}>
    <Icon className="w-6 h-6" />
    <span>{label}</span>
  </Button>
);
