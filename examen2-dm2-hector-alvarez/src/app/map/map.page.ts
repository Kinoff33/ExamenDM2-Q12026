import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    initGoogleMaps?: () => void;
  }
}

interface GoogleMapsNamespace {
  maps: {
    Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMapInstance;
    Marker: new (options: GoogleMarkerOptions) => void;
    Size: new (width: number, height: number) => GoogleMapSize;
  };
}

interface GoogleMapOptions {
  center: GoogleLatLngLiteral;
  zoom: number;
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
  gestureHandling?: string;
}

interface GoogleMapInstance {
  setCenter(position: GoogleLatLngLiteral): void;
}

interface GoogleMapSize {}

interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

interface GoogleMarkerOptions {
  position: GoogleLatLngLiteral;
  map: GoogleMapInstance;
  title?: string;
  icon?: {
    url: string;
    scaledSize: GoogleMapSize;
  };
}

@Component({
  selector: 'app-map',
  templateUrl: 'map.page.html',
  styleUrls: ['map.page.scss'],
  imports: [
    CommonModule,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class MapPage implements AfterViewInit {
  @ViewChild('mapCanvas', { static: false }) private mapCanvas?: ElementRef<HTMLElement>;

  protected isLoading = true;
  protected errorMessage = '';
  protected coordinatesLabel = '';

  private readonly mapsApiKey = 'AIzaSyAQOEnpMZo51o4OC8IfGmYMT6jXOxlYqfs';
  private readonly markerAssetPath = 'assets/gas.png';

  async ngAfterViewInit(): Promise<void> {
    await this.initializeMapFlow();
  }

  private async initializeMapFlow(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    const position = await this.getCurrentPosition();
    if (!position) {
      this.isLoading = false;
      return;
    }

    this.coordinatesLabel = `Latitud: ${position.lat.toFixed(5)} | Longitud: ${position.lng.toFixed(5)}`;

    try {
      await this.loadGoogleMapsScript();
      this.renderMap(position);
    } catch {
      this.errorMessage = 'No se pudo cargar Google Maps. Verifica internet o la API KEY.';
    } finally {
      this.isLoading = false;
    }
  }

  private async getCurrentPosition(): Promise<GoogleLatLngLiteral | null> {
    try {
      const permissions = await Geolocation.checkPermissions().catch(() => null);
      const locationState = permissions?.location ?? permissions?.coarseLocation ?? 'prompt';

      if (locationState !== 'granted') {
        const requested = await Geolocation.requestPermissions().catch(() => null);
        const granted = requested?.location === 'granted' || requested?.coarseLocation === 'granted';

        if (!granted) {
          this.errorMessage = 'Se necesitan permisos de ubicacion para mostrar el mapa.';
          return null;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch {
      this.errorMessage = 'No fue posible obtener la ubicacion actual.';
      return null;
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
    if (window.google?.maps) {
      return Promise.resolve();
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader="true"]');
    if (existingScript) {
      return new Promise((resolve, reject) => {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Google Maps error')), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      window.initGoogleMaps = () => resolve();

      const script = document.createElement('script');
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${this.mapsApiKey}&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.dataset['googleMapsLoader'] = 'true';
      script.onerror = () => reject(new Error('Google Maps error'));
      document.head.appendChild(script);
    });
  }

  private renderMap(position: GoogleLatLngLiteral): void {
    const mapElement = this.mapCanvas?.nativeElement;
    const googleMaps = window.google?.maps;

    if (!mapElement || !googleMaps) {
      this.errorMessage = 'No se pudo renderizar el mapa.';
      return;
    }

    const map = new googleMaps.Map(mapElement, {
      center: position,
      zoom: 17,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
    });

    new googleMaps.Marker({
      position,
      map,
      title: 'Ubicacion actual',
      icon: {
        url: this.markerAssetPath,
        scaledSize: new googleMaps.Size(56, 56),
      },
    });

    map.setCenter(position);
  }
}
