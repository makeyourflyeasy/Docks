import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  X, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { sharePdfFile } from '../services/pdfExportService';

export interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  filename: string;
  title?: string;
  fileType?: 'pdf' | 'image' | 'auto';
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  filename,
  title,
  fileType = 'auto'
}) => {
  const [loadError, setLoadError] = useState(false);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isImage = useMemo(() => {
    if (!pdfUrl) return false;
    if (fileType === 'image') return true;
    if (fileType === 'pdf') return false;
    const lowerUrl = (pdfUrl || '').toLowerCase();
    const lowerName = (filename || '').toLowerCase();
    return (
      lowerUrl.startsWith('data:image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.gif') ||
      lowerName.endsWith('.svg') ||
      lowerUrl.includes('.jpg') ||
      lowerUrl.includes('.jpeg') ||
      lowerUrl.includes('.png') ||
      lowerUrl.includes('.webp')
    );
  }, [pdfUrl, filename, fileType]);

  if (!isOpen || !pdfUrl) return null;

  const handleShare = async () => {
    if (pdfUrl) {
      await sharePdfFile(pdfUrl, filename, title || filename);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename || 'document.pdf';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 300);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
      id="document-preview-modal-overlay"
    >
      {/* Top Header Toolbar with Prominent Print & Download Controls */}
      <div className="h-16 px-3 sm:px-6 bg-slate-900 border-b border-white/10 flex items-center justify-between gap-2 sm:gap-4 shadow-xl shrink-0">
        
        {/* Left: Back button & Document Metadata */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs sm:text-sm font-semibold border border-white/20 transition-all shadow-sm shrink-0"
            title="Back to Application"
            id="btn-viewer-back"
          >
            <ArrowLeft size={17} className="text-amber-400 shrink-0" />
            <span>Back</span>
          </button>

          <div className="truncate min-w-0">
            <h3 className="text-xs sm:text-base font-bold text-white truncate leading-tight">
              {title || 'Document Preview'}
            </h3>
            <p className="text-[11px] text-gray-400 font-mono truncate hidden sm:block">
              {filename}
            </p>
          </div>
        </div>

        {/* Right: Actions Bar (Print, Download, Share, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Zoom controls for images */}
          {isImage && (
            <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl px-1.5 py-1 gap-1">
              <button
                type="button"
                onClick={() => setImageZoom(z => Math.max(0.5, z - 0.25))}
                className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="text-[11px] font-mono text-gray-300 px-1">{Math.round(imageZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setImageZoom(z => Math.min(3, z + 0.25))}
                className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => setImageZoom(1)}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          )}

          {/* DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={handleDownload}
            className="px-3 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
            title="Download Document"
            id="btn-viewer-download"
          >
            <Download size={16} className="text-white shrink-0" />
            <span>Download PDF</span>
          </button>

          {/* Optional Web Share */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleShare}
              className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border border-white/15 transition-all"
              title="Share Document"
            >
              <Share2 size={16} className="text-white" />
              <span className="hidden md:inline">Share</span>
            </button>
          )}

          {/* Close Modal (X) */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 active:scale-90 transition-all"
            title="Close Preview"
            id="btn-viewer-close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Document Display Body Area */}
      <div className="flex-1 w-full bg-slate-950 relative overflow-auto flex items-center justify-center p-2 sm:p-4">
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
            <img
              src={pdfUrl}
              alt={title || filename}
              style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
              className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl transition-transform duration-150 border border-white/10 bg-white/5"
            />
          </div>
        ) : !loadError ? (
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title={title || filename}
            className="w-full h-full border-0 bg-white rounded-lg shadow-2xl"
            onError={() => setLoadError(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-300 space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <FileText size={32} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-bold text-white">Document Ready</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Use the buttons above to open, print, or download this document.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <Download size={15} /> Download PDF
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs sm:text-sm font-medium border border-white/20"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
