import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  Camera, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Image as ImageIcon,
  FileCheck
} from 'lucide-react';
import { CaseStepDetail, StepFileItem } from '../types';

interface WorkflowMultiUploaderProps {
  label: string;
  sublabel?: string;
  urlField: keyof CaseStepDetail;
  nameField: keyof CaseStepDetail;
  accept?: string;
  allowCamera?: boolean;
  isPhotoOnly?: boolean;
  required?: boolean;
  formData: CaseStepDetail;
  setFormData: React.Dispatch<React.SetStateAction<CaseStepDetail>>;
  onPreview: (preview: { url: string; title: string }) => void;
  compact?: boolean;
  maxFiles?: number;
  badge?: string;
  onChange?: (url: string, files: StepFileItem[]) => void;
  isReadOnly?: boolean;
}

export const WorkflowMultiUploader: React.FC<WorkflowMultiUploaderProps> = ({
  label,
  sublabel,
  urlField,
  nameField,
  accept = 'image/*,.pdf',
  allowCamera = true,
  isPhotoOnly = false,
  required = false,
  formData,
  setFormData,
  onPreview,
  compact = false,
  maxFiles = 10,
  badge,
  onChange,
  isReadOnly = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // Live webcam modal state
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Get current files list for this field
  const currentFiles: StepFileItem[] = useMemo(() => {
    const multiMap = formData.multiFiles || {};
    const key = urlField as string;
    if (multiMap[key] && Array.isArray(multiMap[key]) && multiMap[key].length > 0) {
      return multiMap[key];
    }
    const singleUrl = formData[urlField] as string | undefined;
    const singleName = (formData[nameField] as string | undefined) || '';
    if (singleUrl && typeof singleUrl === 'string' && singleUrl.trim()) {
      const isPdf = singleUrl.startsWith('data:application/pdf') || singleName.toLowerCase().endsWith('.pdf');
      return [{
        id: 'file-default-1',
        url: singleUrl,
        name: singleName || 'Document Page 1',
        type: isPdf ? 'pdf' : 'image',
        uploadedAt: new Date().toISOString()
      }];
    }
    return [];
  }, [formData, urlField, nameField]);

  // Update helper: synchronizes both the primary URL/name fields and the multiFiles map
  const syncFiles = (newFiles: StepFileItem[]) => {
    setFormData(prev => {
      const currentMulti = { ...(prev.multiFiles || {}) };
      const key = urlField as string;

      if (newFiles.length === 0) {
        delete currentMulti[key];
        return {
          ...prev,
          [urlField]: '',
          [nameField]: '',
          multiFiles: currentMulti
        };
      }

      currentMulti[key] = newFiles;
      const primary = newFiles[0];
      const displayName = newFiles.length > 1 
        ? `${primary.name} (+${newFiles.length - 1} more)` 
        : primary.name;

      return {
        ...prev,
        [urlField]: primary.url,
        [nameField]: displayName,
        multiFiles: currentMulti
      };
    });
    if (onChange && newFiles.length > 0) {
      onChange(newFiles[0].url, newFiles);
    }
  };

  // Process raw files into StepFileItem
  const processFiles = (files: FileList | File[], isReplacing: boolean = false, targetIdx?: number) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const readPromises = fileList.map(file => {
      return new Promise<StepFileItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          resolve({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: result,
            name: file.name,
            type: isPdf ? 'pdf' : 'image',
            uploadedAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newItems => {
      if (isReplacing && targetIdx !== undefined && targetIdx !== null && targetIdx >= 0) {
        const updated = [...currentFiles];
        updated[targetIdx] = newItems[0];
        syncFiles(updated);
        setReplaceIndex(null);
      } else {
        const combined = [...currentFiles, ...newItems].slice(0, maxFiles);
        syncFiles(combined);
      }
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, false);
      e.target.value = '';
    }
  };

  const handleReplaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && replaceIndex !== null) {
      processFiles(e.target.files, true, replaceIndex);
      e.target.value = '';
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, replaceIndex !== null, replaceIndex ?? undefined);
      e.target.value = '';
    }
  };

  // Remove single file
  const handleRemoveFile = (indexToRemove: number) => {
    const updated = currentFiles.filter((_, idx) => idx !== indexToRemove);
    syncFiles(updated);
  };

  // Remove all files
  const handleRemoveAll = () => {
    syncFiles([]);
  };

  // Trigger file replacement
  const triggerReplace = (index: number) => {
    setReplaceIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  // Start Live Webcam Stream
  const startLiveWebcam = async () => {
    setWebcamError(null);
    setIsCameraStarting(true);
    setShowWebcamModal(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is not supported in this browser environment. Using native camera capture instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraStarting(false);
    } catch (err: any) {
      console.warn('Live webcam error:', err);
      setIsCameraStarting(false);
      setWebcamError(err.message || 'Unable to access camera.');
      // Automatically fallback to camera file input after 1.5s
      setTimeout(() => {
        closeLiveWebcam();
        if (cameraInputRef.current) {
          cameraInputRef.current.click();
        }
      }, 1200);
    }
  };

  // Close Live Webcam Stream
  const closeLiveWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowWebcamModal(false);
    setWebcamError(null);
    setIsCameraStarting(false);
  };

  // Capture photo from Live Webcam Video
  const captureWebcamPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const newItem: StepFileItem = {
      id: `cam-${Date.now()}`,
      url: dataUrl,
      name: `Camera_Capture_${currentFiles.length + 1}_${new Date().toLocaleTimeString().replace(/:/g, '-')}.jpg`,
      type: 'image',
      uploadedAt: new Date().toISOString()
    };

    if (replaceIndex !== null && replaceIndex >= 0) {
      const updated = [...currentFiles];
      updated[replaceIndex] = newItem;
      syncFiles(updated);
      setReplaceIndex(null);
    } else {
      syncFiles([...currentFiles, newItem]);
    }

    closeLiveWebcam();
  };

  // Unified Camera Trigger:
  // On mobile/touch devices, directly launches the native camera app for snapping a document or taking a live picture/selfie.
  // On desktop, launches the live webcam modal or camera selector.
  const handleCameraClick = () => {
    setReplaceIndex(null);
    const isTouchOrMobile = (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) 
      || /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isTouchOrMobile) {
      cameraInputRef.current?.click();
    } else {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        startLiveWebcam();
      } else {
        cameraInputRef.current?.click();
      }
    }
  };

  const hasFiles = currentFiles.length > 0;

  return (
    <div className={`rounded-2xl border transition-all ${
      hasFiles 
        ? 'bg-slate-900/80 border-white/15 p-3.5 sm:p-4' 
        : 'bg-white/[0.02] border-white/10 hover:border-white/20 p-3.5 sm:p-4'
    }`}>
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={isPhotoOnly ? 'image/*' : accept}
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={isPhotoOnly ? 'image/*' : accept}
        className="hidden"
        onChange={handleReplaceInputChange}
      />
      {/* Native device camera input (triggers native camera app on mobile/tablets) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraInputChange}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {label}
              {required && <span className="text-amber-400 ml-1 font-mono">*</span>}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {badge}
              </span>
            )}
            {hasFiles && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={11} />
                {currentFiles.length} {currentFiles.length === 1 ? 'Page / File' : 'Pages / Files'}
              </span>
            )}
          </div>
          {sublabel && (
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              {sublabel}
            </p>
          )}
        </div>

        {/* Top Actions when files exist */}
        {hasFiles && !isReadOnly && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {/* Single Camera Button - Only Camera Icon */}
            {allowCamera && (
              <button
                type="button"
                onClick={handleCameraClick}
                className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-colors shadow-sm"
                title="Open Camera"
                aria-label="Open Camera"
              >
                <Camera size={15} />
              </button>
            )}

            {/* Add More Pages / Files Button */}
            {currentFiles.length < maxFiles && (
              <button
                type="button"
                onClick={() => {
                  setReplaceIndex(null);
                  fileInputRef.current?.click();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Add additional pages or documents"
              >
                <Plus size={13} />
                <span>+ Add Page</span>
              </button>
            )}

            {/* Clear / Remove All Button */}
            <button
              type="button"
              onClick={handleRemoveAll}
              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition-colors"
              title="Remove / Clear all uploaded documents"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Empty State: Upload & Camera Options */}
      {!hasFiles ? (
        isReadOnly ? (
          <div className="py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/5 text-gray-500 text-xs italic">
            No document attached (Locked / Read-Only).
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            {/* Main Browse / Upload Button */}
            <button
              type="button"
              onClick={() => {
                setReplaceIndex(null);
                fileInputRef.current?.click();
              }}
              className="flex-1 py-2.5 px-3.5 rounded-xl border border-dashed border-white/20 hover:border-brand-400/80 bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all group"
            >
              <Upload size={15} className="text-brand-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Upload Document</span>
            </button>

            {/* Single Camera Button - Only Camera Icon */}
            {allowCamera && (
              <button
                type="button"
                onClick={handleCameraClick}
                className="py-2.5 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 border border-amber-500/30 hover:border-amber-500/50 flex items-center justify-center transition-all shadow-sm shrink-0"
                title="Open Camera"
                aria-label="Open Camera"
              >
                <Camera size={18} />
              </button>
            )}
          </div>
        )
      ) : (
        /* Populated State: Itemized Pages & File List */
        <div className="space-y-2 mt-2">
          {currentFiles.map((file, idx) => {
            const isPdf = file.type === 'pdf' || file.name.toLowerCase().endsWith('.pdf');
            const pageLabel = currentFiles.length > 1 ? `Page ${idx + 1}` : 'Document';

            return (
              <div 
                key={file.id || idx}
                className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-white/10 hover:border-white/20 transition-all text-xs"
              >
                {/* File Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-slate-700/80 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {isPdf ? (
                      <FileText size={16} className="text-rose-400" />
                    ) : (
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }} 
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-mono text-[10px] font-bold shrink-0">
                        {pageLabel}
                      </span>
                      <p className="text-white font-medium truncate text-xs" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {isPdf ? 'PDF Document' : 'Photo / Scanned Image'}
                    </span>
                  </div>
                </div>

                {/* Actions Per File */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* View / Download */}
                  <button
                    type="button"
                    onClick={() => onPreview({ url: file.url, title: `${label} - ${pageLabel}` })}
                    className="px-2 py-1 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border border-brand-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    title="View Document Preview"
                  >
                    <Eye size={12} />
                    <span className="hidden sm:inline">View</span>
                  </button>

                  {!isReadOnly && (
                    <>
                      {/* Replace Document */}
                      <button
                        type="button"
                        onClick={() => triggerReplace(idx)}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Replace with another file"
                      >
                        <RefreshCw size={11} />
                        <span className="hidden sm:inline">Replace</span>
                      </button>

                      {/* Remove Document */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                        title="Remove this document (if uploaded mistakenly)"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Quick Add More Footer inside list */}
          {currentFiles.length < maxFiles && !isReadOnly && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setReplaceIndex(null);
                  fileInputRef.current?.click();
                }}
                className="flex-1 py-1.5 px-3 rounded-lg border border-dashed border-white/15 hover:border-brand-400 text-gray-400 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={12} />
                <span>Attach Page {currentFiles.length + 1} / Extra Document</span>
              </button>

              {allowCamera && (
                <button
                  type="button"
                  onClick={handleCameraClick}
                  className="py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 border border-amber-500/30 flex items-center justify-center transition-colors shrink-0"
                  title="Open Camera"
                  aria-label="Open Camera"
                >
                  <Camera size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Live Webcam Modal */}
      {showWebcamModal && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-white/15 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-amber-400" />
                <h4 className="text-white font-bold text-sm">
                  Live Camera Capture: {label}
                </h4>
              </div>
              <button
                type="button"
                onClick={closeLiveWebcam}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Video Stream */}
            <div className="p-4 flex flex-col items-center justify-center bg-black min-h-[280px] relative">
              {webcamError ? (
                <div className="text-center p-6 space-y-2">
                  <AlertCircle size={32} className="text-amber-400 mx-auto" />
                  <p className="text-white text-xs font-semibold">{webcamError}</p>
                  <p className="text-gray-400 text-[11px]">
                    Opening native device camera selector...
                  </p>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full max-h-[380px] object-cover rounded-xl border border-white/10 shadow-inner"
                  />
                  {isCameraStarting && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center flex-col gap-2">
                      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-white text-xs">Initializing camera viewfinder...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-3">
              {/* Fallback to native camera file picker */}
              <button
                type="button"
                onClick={() => {
                  closeLiveWebcam();
                  cameraInputRef.current?.click();
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Camera size={14} className="text-emerald-400" />
                <span>Device Camera</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeLiveWebcam}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-medium transition-colors"
                >
                  Cancel
                </button>

                {!webcamError && (
                  <button
                    type="button"
                    disabled={isCameraStarting}
                    onClick={captureWebcamPhoto}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <Camera size={15} />
                    <span>Capture Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
