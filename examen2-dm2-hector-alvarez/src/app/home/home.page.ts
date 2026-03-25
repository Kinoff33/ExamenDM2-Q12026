import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline, locationSharp } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonTextarea,
    IonTitle,
    IonToolbar,
  ],
})
export class HomePage {
  @ViewChild('imagePicker') private imagePicker?: ElementRef<HTMLInputElement>;

  protected readonly thoughtPrompt = '¿Qué estas pensando hoy?';
  protected imageUrl: string | null = null;
  protected locationLabel: string | null = null;

  constructor() {
    addIcons({ imageOutline, locationSharp });
  }

  protected async selectImage(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      this.openFilePicker();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      });

      this.imageUrl = photo.dataUrl ?? null;
    } catch {
      this.openFilePicker();
    }
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.imageUrl = await this.readFileAsDataUrl(file);
    input.value = '';
  }

  protected async loadCurrentLocation(): Promise<void> {
    if (!navigator.geolocation) {
      this.locationLabel = 'No se pudo obtener la ubicacion.';
      return;
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    }).catch(() => null);

    if (!position) {
      this.locationLabel = 'Permiso de ubicacion no concedido.';
      return;
    }

    this.locationLabel = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
  }

  private openFilePicker(): void {
    this.imagePicker?.nativeElement.click();
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('No se pudo leer la imagen.'));
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
