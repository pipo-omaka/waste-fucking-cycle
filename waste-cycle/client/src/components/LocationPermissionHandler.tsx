import { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { getUserLocation, geocodeAddress, type Location } from '../utils/locationUtils';

interface LocationPermissionHandlerProps {
  onLocationReady: (location: Location) => void;
  geocoder?: google.maps.Geocoder;
  isLoading?: boolean;
}

export function LocationPermissionHandler({
  onLocationReady,
  geocoder,
  isLoading = false,
}: LocationPermissionHandlerProps) {
  const [locationState, setLocationState] = useState<
    'idle' | 'requesting' | 'success' | 'denied' | 'error' | 'manual'
  >('idle');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Request location permission on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    setLocationState('requesting');
    setGeocodeError(null);

    try {
      const location = await getUserLocation();
      setUserLocation(location);
      setLocationState('success');
      onLocationReady(location);
    } catch (error: any) {
      console.error('Location error:', error);
      
      if (error.message.includes('permission denied')) {
        setLocationState('denied');
      } else {
        setLocationState('error');
      }
    }
  };

  const handleManualLocation = async () => {
    if (!manualAddress.trim()) {
      setGeocodeError('กรุณากรอกที่อยู่');
      return;
    }

    if (!geocoder) {
      setGeocodeError('Geocoding service is not available');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await geocodeAddress(manualAddress, geocoder);
      setUserLocation(result.location);
      setLocationState('success');
      onLocationReady(result.location);
    } catch (error: any) {
      console.error('Geocoding error:', error);
      setGeocodeError(error.message || 'ไม่สามารถค้นหาที่อยู่ได้');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseManualInput = () => {
    setLocationState('manual');
    setGeocodeError(null);
  };

  if (locationState === 'success' && userLocation) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <MapPin className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>ตำแหน่งปัจจุบัน:</strong> {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
        </AlertDescription>
      </Alert>
    );
  }

  if (locationState === 'requesting') {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">กำลังขออนุญาตเข้าถึงตำแหน่ง...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locationState === 'manual' || locationState === 'denied' || locationState === 'error') {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            {locationState === 'denied'
              ? 'ไม่สามารถเข้าถึงตำแหน่งได้'
              : locationState === 'error'
              ? 'เกิดข้อผิดพลาดในการค้นหาตำแหน่ง'
              : 'ระบุตำแหน่งเริ่มต้น'}
          </CardTitle>
          <CardDescription>
            {locationState === 'denied'
              ? 'กรุณาระบุตำแหน่งเริ่มต้นด้วยตนเอง'
              : 'กรุณากรอกที่อยู่หรือชื่อสถานที่'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-address">ที่อยู่หรือชื่อสถานที่</Label>
            <Input
              id="manual-address"
              type="text"
              placeholder="เช่น เชียงใหม่, สยามพารากอน, หรือที่อยู่"
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                setGeocodeError(null);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isGeocoding) {
                  handleManualLocation();
                }
              }}
              disabled={isGeocoding || isLoading}
            />
          </div>

          {geocodeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{geocodeError}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleManualLocation}
              disabled={isGeocoding || isLoading || !manualAddress.trim()}
              className="flex-1"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังค้นหา...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  ใช้ตำแหน่งนี้
                </>
              )}
            </Button>
            {locationState !== 'manual' && (
              <Button variant="outline" onClick={requestLocation} disabled={isLoading}>
                ลองอีกครั้ง
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-center justify-center space-x-2">
          <Button variant="outline" onClick={requestLocation} disabled={isLoading}>
            <MapPin className="w-4 h-4 mr-2" />
            ขออนุญาตเข้าถึงตำแหน่ง
          </Button>
          <Button variant="ghost" onClick={handleUseManualInput} disabled={isLoading}>
            ระบุด้วยตนเอง
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

