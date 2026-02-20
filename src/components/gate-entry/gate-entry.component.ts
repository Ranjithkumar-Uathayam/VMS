import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy, ElementRef, viewChild, effect, ViewChild } from '@angular/core';
import { MaterialEntryService } from '../../services/material-entry.service';
import { MaterialEntry } from '../../models/material-entry.model';
import { AuthService } from '../../services/auth.service';

// Declare the jsQR library to avoid TypeScript errors.
declare const Swal: any;
declare var jsQR: any;

@Component({
  standalone: true,
  selector: 'gate-entry',
  templateUrl: './gate-entry.component.html',
  styleUrl: './gate-entry.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GateEntryComponent implements OnDestroy {
    private materialEntryService = inject(MaterialEntryService);
    private authService = inject(AuthService);
    
    dispatchedEntries = this.materialEntryService.dispatchedEntries;

    // Component State
    scannedEntry = signal<MaterialEntry | null>(null);
    isScannerActive = signal(false);
    scanResult = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    scanError = signal<string | null>(null);
    isConfirming = signal(false);
    isConfirmed = signal(false);

    // Scanner Internals
    private videoElement = viewChild<ElementRef<HTMLVideoElement>>('scannerVideo');
    private canvasElement = viewChild<ElementRef<HTMLCanvasElement>>('scannerCanvas');
    private stream: MediaStream | null = null;
    private animationFrameId: number | null = null;

    @ViewChild('dispatchedScroll', { read: ElementRef })
    dispatchedScroll!: ElementRef<HTMLDivElement>;
    @ViewChild('scanInput') scanInput!: ElementRef<HTMLInputElement>;
    scanBuffer = '';

    scrollDispatched(dir: number) {
        const el = this.dispatchedScroll.nativeElement;
        el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }

    constructor() {
        effect(() => {
            const videoEl = this.videoElement()?.nativeElement;
            if (videoEl && this.stream) {
                videoEl.srcObject = this.stream;
            }
        });
    }

    ngOnDestroy(): void {
        this.stopScan();
    }

    // async openScanner(): Promise<void> {
    //     this.scannedEntry.set(null);
    //     this.isScannerActive.set(true);
    //     this.scanResult.set(null);
    //     this.scanError.set(null);
    //     this.isConfirmed.set(false);
    //     this.isConfirming.set(false);

    //     await this.startScan();
    // }
    startPhysicalScan() {
        this.scanBuffer = '';
        this.scannedEntry.set(null);
        this.scanResult.set(null);
        this.scanError.set(null);
        this.isScannerActive.set(true)
        this.isConfirmed.set(false);
        this.isConfirming.set(false)

        // focus hidden input so scanner can type
        setTimeout(() => {
            this.scanInput.nativeElement.focus();
        }, 50);
    }

    
  closeScanner(): void {
    this.stopScan();
    this.isScannerActive.set(false);
    this.scannedEntry.set(null);
    this.scanBuffer = '';
    this.scannedEntry.set(null);
    this.scanResult.set(null);
    this.scanError.set(null);
    this.isConfirmed.set(false);
    this.isConfirming.set(false)
  }

  private async startScan(): Promise<void> {
    if (typeof jsQR === 'undefined') {
        this.scanError.set('QR code scanning library could not be loaded. Check your connection or ad-blocker.');
        return;
    }

    try {
        this.stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        const videoEl = this.videoElement()?.nativeElement;
        if(videoEl) {
            videoEl.srcObject = this.stream;
            // Required for iOS to play video inline
            videoEl.setAttribute('playsinline', 'true');
            await videoEl.play();
        }

        // this.scanResult.set({ message: 'Point camera at QR code...', type: 'info' });
        this.animationFrameId = requestAnimationFrame(() => this.tick());

    } catch (err: any) {
        let message = 'Could not access camera.';
        if (err.name === 'NotAllowedError') {
            message = 'Camera permission was denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
            message = 'No camera found. Please ensure a camera is connected.';
        }
        this.scanError.set(message);
    }
  }
  
  private stopScan(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  private tick(): void {
      if (!this.isScannerActive() || this.scannedEntry()) {
        return;
      }
      const videoEl = this.videoElement()?.nativeElement;
      const canvasEl = this.canvasElement()?.nativeElement;

      if (videoEl && canvasEl && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
          const canvasCtx = canvasEl.getContext('2d');
          if (canvasCtx) {
              canvasEl.height = videoEl.videoHeight;
              canvasEl.width = videoEl.videoWidth;
              canvasCtx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
              
              const imageData = canvasCtx.getImageData(0, 0, canvasEl.width, canvasEl.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'dontInvert',
              });

              if (code) {
                  this.processScan(code.data);
                  // Stop scanning after a successful detection
                  return;
              }
          }
      }
      
      // Continue scanning
      this.animationFrameId = requestAnimationFrame(() => this.tick());
  }
  
  private processScan(qrData: string): void {
      if (this.scanResult() && this.scanResult()?.type !== 'info') return;
      
      try {
        const parsedData = JSON.parse(qrData);
        if (!parsedData.id) {
          throw new Error('Invalid QR data content');
        }

        const matchedEntry = this.dispatchedEntries().find(e => e.EntryId === parsedData.id);

        if (matchedEntry) {
            this.scanResult.set({ message: 'Match Found!', type: 'success' });
            this.scannedEntry.set(matchedEntry);
            this.stopScan(); // Stop camera to show result
        } else {
            this.scanResult.set({ message: 'QR code does not correspond to a dispatched item.', type: 'error' });
            this.stopScan();
            setTimeout(() => this.closeScanner(), 9000);
        }
      } catch (e) {
        this.scanResult.set({ message: 'Invalid QR code format.', type: 'error' });
        this.stopScan();
        setTimeout(() => this.closeScanner(), 9000);
      }
  }

    async confirmReceipt(): Promise<void> {
        const entry = this.scannedEntry();
        if (!entry) return;

        this.isConfirming.set(true);
        try {
            const gateInwardDate = new Date().toISOString().split('T')[0];
            const authorizedBy = this.authService.currentUser()?.name || 'Gate Watchman';
            await this.materialEntryService.confirmGateReceipt(
                entry.EntryId,
                authorizedBy
            );
            this.scanResult.set({ message: 'Material Receipt Confirmed!', type: 'success' });
            this.isConfirmed.set(true);
            await this.materialEntryService.fetchEntries();
            setTimeout(() => this.closeScanner(), 60000);
        } 
        catch (error) 
        {
            this.scanResult.set({ message: 'Failed to confirm receipt on server.', type: 'error' });
        } 
        finally {
            this.isConfirming.set(false);
        }
    }

    onScanComplete(input: HTMLInputElement) {
        const scannedValue = input.value
        if (!scannedValue) return;

        this.scanInput.nativeElement.blur();
        this.scanBuffer = '';
        input.value = '';

        // reuse your existing QR handling logic
        this.processScannedCode(scannedValue);
    }

    processScannedCode(scanData: any) {
        const cleaned = this.cleanJsonString(scanData);
        const parsedData = JSON.parse(cleaned);
        if (!parsedData.id) 
        {
            this.scanResult.set({ message: 'Invalid QR code format.', type: 'error' });
            this.stopScan();
            setTimeout(() => this.closeScanner(), 9000);
        }
        // same logic you used after camera scan success
        const match = this.dispatchedEntries().find(e => e.EntryId === parsedData.id);
        if (match)
        {
            this.scannedEntry.set(match);
            this.scanResult.set({ type: 'success', message: 'Match Found!' });
            this.stopScan();
            setTimeout(() => this.closeScanner(), 9000)
        }
        else 
        {
            this.scanResult.set({ type: 'error', message: 'No matching entry found' });
            this.stopScan()
            setTimeout(() => this.closeScanner(), 9000)
        }
    }

    cleanJsonString(value: string): string {
    return value
        .trim()
        .replace(/[\u0000-\u001F]+/g, ''); // removes control chars
    }

}
