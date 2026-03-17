import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const FONT_OPTIONS = [
  'Dancing Script',
  'Great Vibes',
  'Sacramento',
  'Pacifico',
];

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Dancing+Script&family=Great+Vibes&family=Pacifico&family=Sacramento&display=swap';

const PEN_COLOR = '#1e3a5f';

export default function SignaturePad({ isOpen, onClose, onSign, signerName, fieldLabel }) {
  const [mode, setMode] = useState('draw');
  const [hasSignature, setHasSignature] = useState(false);
  const [typedName, setTypedName] = useState(signerName || '');
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Load Google Fonts on mount
  useEffect(() => {
    const existingLink = document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('draw');
      setHasSignature(false);
      setTypedName(signerName || '');
      setSelectedFont(FONT_OPTIONS[0]);
    }
  }, [isOpen, signerName]);

  // Initialize / resize canvas when mode is draw and modal is open
  useEffect(() => {
    if (!isOpen || mode !== 'draw') return;

    const initCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 200;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Small delay to allow DOM to settle after render
    const timer = setTimeout(initCanvas, 0);
    return () => clearTimeout(timer);
  }, [isOpen, mode]);

  // Reset hasSignature when switching modes
  useEffect(() => {
    setHasSignature(mode === 'type' ? typedName.trim().length > 0 : false);
  }, [mode]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    lastPos.current = pos;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getCanvasPos]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);

    ctx.strokeStyle = PEN_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
    setHasSignature(true);
  }, [getCanvasPos]);

  const stopDrawing = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = false;
  }, []);

  const handleClear = () => {
    if (mode === 'draw') {
      clearCanvas();
    } else {
      setTypedName('');
      setHasSignature(false);
    }
  };

  const handleApply = () => {
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSign(dataUrl);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `36px "${selectedFont}"`;
      ctx.fillStyle = PEN_COLOR;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 10, canvas.height / 2);

      const dataUrl = canvas.toDataURL('image/png');
      onSign(dataUrl);
    }
  };

  const handleTypedNameChange = (e) => {
    const value = e.target.value;
    setTypedName(value);
    setHasSignature(value.trim().length > 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{fieldLabel}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              mode === 'draw'
                ? 'border-b-2 border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium text-center ${
              mode === 'type'
                ? 'border-b-2 border-gray-900 dark:border-white text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            onClick={() => setMode('type')}
          >
            Type
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === 'draw' ? (
            <div ref={containerRef}>
              <canvas
                ref={canvasRef}
                className="signature-canvas border border-gray-200 dark:border-gray-700 rounded-lg w-full"
                style={{ height: 200, touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={typedName}
                onChange={handleTypedNameChange}
                placeholder="Type your name"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500"
              />

              <div className="grid grid-cols-2 gap-2">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font}
                    onClick={() => setSelectedFont(font)}
                    className={`p-3 border rounded-lg cursor-pointer text-left ${
                      selectedFont === font
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span
                      style={{ fontFamily: `"${font}", cursive`, fontSize: 20, color: PEN_COLOR }}
                    >
                      {typedName || signerName || 'Preview'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Preview area */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 min-h-[60px] flex items-center">
                <span
                  style={{
                    fontFamily: `"${selectedFont}", cursive`,
                    fontSize: 36,
                    color: PEN_COLOR,
                  }}
                >
                  {typedName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            disabled={!hasSignature}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
          >
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
}
