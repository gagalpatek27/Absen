import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Video,
  VideoOff,
  AlertTriangle,
  RotateCw,
  Sliders,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Upload,
  Keyboard,
  Sparkles,
  Info,
  ExternalLink
} from 'lucide-react';
import jsQR from 'jsqr';

interface CameraDevice {
  deviceId: string;
  label: string;
  isUsb?: boolean;
}

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  isScanningPaused: boolean;
  onCameraActiveChange?: (active: boolean) => void;
  onError?: (errMessage: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScan,
  isScanningPaused,
  onCameraActiveChange,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [permissionState, setPermissionState] = useState<'idle' | 'prompt' | 'granted' | 'denied'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [manualInput, setManualInput] = useState<string>('');

  // Scan cooldown handler to prevent double scanning
  const lastScanTimestamp = useRef<number>(0);
  const SCAN_COOLDOWN_MS = 1800; // 1.8s delay between reading

  // Helper to prioritize USB cameras
  const isUsbLabel = (label: string): boolean => {
    const l = label.toLowerCase();
    return l.includes('usb') || l.includes('external') || l.includes('uvc') || l.includes('webcam');
  };

  // Stop current active camera stream
  const stopCameraStream = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    onCameraActiveChange?.(false);
  }, [onCameraActiveChange]);

  // Enumerate video devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');

      const mapped: CameraDevice[] = videoInputs.map((d, index) => {
        const label = d.label || `Kamera ${index + 1}`;
        return {
          deviceId: d.deviceId,
          label: label,
          isUsb: isUsbLabel(label),
        };
      });

      // Sort: Put USB cameras first!
      mapped.sort((a, b) => (b.isUsb ? 1 : 0) - (a.isUsb ? 1 : 0));
      setCameraDevices(mapped);

      return mapped;
    } catch (err) {
      console.warn('Gagal membaca daftar perangkat kamera:', err);
      return [];
    }
  }, []);

  // Start camera with specified device
  const startCamera = async (targetDeviceId?: string) => {
    setIsInitializing(true);
    setErrorMessage(null);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Browser ini tidak mendukung API kamera (getUserMedia). Pastikan Anda menggunakan browser modern dan mengakses lewat HTTPS.';
      setErrorMessage(msg);
      setPermissionState('denied');
      setIsInitializing(false);
      return;
    }

    try {
      // Basic initial constraint
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionState('granted');
      setErrorMessage(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      onCameraActiveChange?.(true);

      // Now query device labels (they will be populated after permission granted)
      const devs = await refreshDevices();
      const activeTrack = stream.getVideoTracks()[0];
      const activeSettings = activeTrack.getSettings();

      if (activeSettings.deviceId) {
        setSelectedDeviceId(activeSettings.deviceId);
      } else if (devs.length > 0 && !targetDeviceId) {
        // Pick top (USB prioritized)
        setSelectedDeviceId(devs[0].deviceId);
      }
    } catch (err: any) {
      // Log as warning rather than uncaught error
      console.warn('Camera access status:', err?.name || err);
      let friendlyMsg = 'Gagal mengakses kamera.';

      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.name === 'SecurityError' ||
        String(err?.message || '').toLowerCase().includes('permission denied');

      if (isPermissionDenied) {
        setPermissionState('denied');
        friendlyMsg = 'Izin kamera ditolak oleh browser. Anda dapat mengizinkan akses kamera di ikon gembok URL atau menggunakan opsi Barcode Scanner USB / Input Manual di bawah.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        friendlyMsg = 'Kamera tidak ditemukan. Pastikan kamera USB terhubung dengan baik ke komputer.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        friendlyMsg = 'Kamera sedang digunakan oleh aplikasi lain (misal Zoom, Meet, atau kamera Windows/Mac). Tutup aplikasi tersebut dan coba lagi.';
      } else if (err?.name === 'OverconstrainedError') {
        friendlyMsg = 'Kamera yang dipilih tidak mendukung resolusi yang diminta. Silakan coba perangkat kamera lainnya.';
      }

      setErrorMessage(friendlyMsg);
      onError?.(friendlyMsg);
      setIsCameraActive(false);
      onCameraActiveChange?.(false);
    } finally {
      setIsInitializing(false);
    }
  };

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Main scanning loop with jsQR
  useEffect(() => {
    if (!isCameraActive || isScanningPaused) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const tick = () => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (videoWidth > 0 && videoHeight > 0) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

            // Read image data from canvas
            const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);

            // Run jsQR decoder
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data && code.data.trim()) {
              const now = Date.now();
              const decodedData = code.data.trim();

              // Check cooldown
              if (
                now - lastScanTimestamp.current > SCAN_COOLDOWN_MS ||
                decodedData !== lastScannedCode
              ) {
                lastScanTimestamp.current = now;
                setLastScannedCode(decodedData);
                setCooldownRemaining(SCAN_COOLDOWN_MS);

                // Send to parent component
                onScan(decodedData);
              }
            }
          }
        }
      }

      if (isSubscribed && isCameraActive && !isScanningPaused) {
        animationFrameId.current = requestAnimationFrame(tick);
      }
    };

    animationFrameId.current = requestAnimationFrame(tick);

    return () => {
      isSubscribed = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isCameraActive, isScanningPaused, lastScannedCode, onScan]);

  // Handle uploaded QR image decoding
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height);

        if (qr && qr.data && qr.data.trim()) {
          onScan(qr.data.trim());
        } else {
          onError?.('Tidak ditemukan QR Code yang valid pada gambar tersebut.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  // Handle manual input or USB Barcode gun submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onScan(manualInput.trim());
    setManualInput('');
  };

  // Switch device handler
  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDevId = e.target.value;
    setSelectedDeviceId(newDevId);
    await startCamera(newDevId);
  };

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Viewport Frame */}
      <div className="relative w-full max-w-lg aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl flex items-center justify-center">
        {/* Real video feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0 absolute'
          }`}
          muted
          playsInline
        />

        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Target Area Scanning Reticle when camera is ON */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Reticle Box */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Laser scan line animation (when not cooling down) */}
              {cooldownRemaining === 0 && !isScanningPaused ? (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse top-1/2 -translate-y-1/2" />
              ) : (
                <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                  <span className="text-[11px] font-bold text-white bg-slate-900/80 px-2.5 py-1 rounded-full border border-emerald-400/50">
                    Memproses...
                  </span>
                </div>
              )}

              {/* Label inside reticle */}
              <span className="absolute -bottom-7 left-0 right-0 text-center text-[11px] font-semibold text-emerald-300 drop-shadow-md">
                Arahkan QR Code Siswa ke Sini
              </span>
            </div>
          </div>
        )}

        {/* State: Camera OFF or Permission Denied */}
        {!isCameraActive && (
          <div className="absolute inset-0 p-5 sm:p-6 flex flex-col items-center justify-center text-center text-slate-300 bg-slate-900/95 z-10">
            {permissionState === 'denied' ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                  <ShieldAlert className="w-7 h-7" />
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                  Akses Kamera Dibatasi / Ditolak
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                  Browser belum mengizinkan akses ke kamera. Silakan klik ikon gembok pada bilah alamat web dan ubah izin kamera ke <strong>"Izinkan" (Allow)</strong>, atau gunakan opsi alternatif di bawah.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isInitializing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
                    <span>Coba Minta Izin Lagi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unggah Foto QR</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                  <Camera className="w-7 h-7" />
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                  Kamera USB Belum Aktif
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed">
                  Hubungkan kamera USB atau gunakan webcam bawaan komputer untuk mulai melakukan absensi otomatis lewat QR Code.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    disabled={isInitializing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    {isInitializing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Membuka Kamera...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        <span>AKTIFKAN KAMERA</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Unggah QR</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* State: Camera active badge */}
        {isCameraActive && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-emerald-400">Kamera aktif</span>
          </div>
        )}
      </div>

      {/* Hidden file input for QR code photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Error / Permission Alert banner */}
      {errorMessage && (
        <div className="w-full max-w-lg mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <strong>Pemberitahuan Kamera:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Camera Selection Controls Below Video */}
      <div className="w-full max-w-lg mt-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Device Select */}
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pilih Perangkat Kamera:</span>
          </label>
          <select
            value={selectedDeviceId}
            onChange={handleDeviceChange}
            disabled={!isCameraActive || cameraDevices.length === 0}
            className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 disabled:opacity-60"
          >
            {cameraDevices.length === 0 ? (
              <option value="">Deteksi kamera otomatis...</option>
            ) : (
              cameraDevices.map(dev => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.isUsb ? '📹 [USB] ' : '💻 '}
                  {dev.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Toggle / Restart Camera Button */}
        <div className="flex items-end">
          {isCameraActive ? (
            <button
              type="button"
              onClick={stopCameraStream}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              <VideoOff className="w-3.5 h-3.5 text-rose-600" />
              <span>Matikan Kamera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startCamera(selectedDeviceId)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nyalakan</span>
            </button>
          )}
        </div>
      </div>

      {/* Manual / Barcode Gun Input (Acts as Keyboard HID Wedge or Manual Fallback) */}
      <div className="w-full max-w-lg mt-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Keyboard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Input ID Siswa atau Scan via Barcode Gun USB (contoh: S001)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Absen
          </button>
        </form>
        <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Mendukung alat Barcode Scanner USB genggam (langsung ketik & tekan Enter)</span>
        </p>
      </div>
    </div>
  );
};
