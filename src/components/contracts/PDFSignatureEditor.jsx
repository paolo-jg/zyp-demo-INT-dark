import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Plus, Calendar } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const SCALE = 1.5;

const SIGNATURE_PATTERNS = [
  /signature/i,
  /sign\s*here/i,
  /x_{2,}/i,
  /authorized\s*by/i,
  /signed\s*by/i,
  /print\s*name/i,
  /witness/i,
  /acknowledged\s*by/i,
  /party/i,
];

// Patterns that hint at a specific signee role
const ROLE_PATTERNS = [
  { pattern: /client|customer|buyer|lessee|tenant|party\s*(?:b|2|two|ii)/i, type: 'client' },
  { pattern: /provider|vendor|seller|lessor|landlord|company|party\s*(?:a|1|one|i\b)/i, type: 'sender' },
];

const DATE_PATTERNS = [
  /\bdate\b/i,
  /\bdated\b/i,
  /\bday\s*of\b/i,
  /\beffective\s*date\b/i,
  /\bexecution\s*date\b/i,
  /mm\s*\/\s*dd/i,
];

function generateFieldId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function inferSigneeType(text, nearbyText, fieldIndex) {
  // Check the matched text and nearby context for role hints
  const combined = `${text} ${nearbyText}`.toLowerCase();
  for (const { pattern, type } of ROLE_PATTERNS) {
    if (pattern.test(combined)) return type;
  }
  // Default: alternate sender/client
  return fieldIndex % 2 === 0 ? 'sender' : 'client';
}

async function scanForSignatureFields(pdf) {
  const sigFields = [];
  const dateFields = [];
  const totalPages = pdf.numPages;
  const seenPositions = new Set();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });
    const textContent = await page.getTextContent();
    const allTexts = textContent.items;

    for (let i = 0; i < allTexts.length; i++) {
      const item = allTexts[i];
      const text = item.str;
      const x = item.transform[4] * SCALE;
      const y = viewport.height - item.transform[5] * SCALE;

      // Check for signature fields
      const sigMatched = SIGNATURE_PATTERNS.some((pattern) => pattern.test(text));
      if (sigMatched) {
        const posKey = `sig-${pageNum}-${Math.round(x / 30)}-${Math.round(y / 30)}`;
        if (!seenPositions.has(posKey)) {
          seenPositions.add(posKey);

          const nearbyText = allTexts
            .slice(Math.max(0, i - 3), Math.min(allTexts.length, i + 4))
            .map(t => t.str)
            .join(' ');

          const type = inferSigneeType(text, nearbyText, sigFields.length);
          const signeeNumber = sigFields.filter(f => f.type === type).length + 1;

          sigFields.push({
            id: generateFieldId(),
            fieldType: 'signature',
            type,
            label: type === 'sender'
              ? (signeeNumber > 1 ? `Your Signature (${signeeNumber})` : 'Your Signature')
              : (signeeNumber > 1 ? `Client Signature (${signeeNumber})` : 'Client Signature'),
            signee: type === 'sender' ? `Signee ${signeeNumber}` : `Client Signee ${signeeNumber}`,
            page: pageNum,
            x: Math.max(0, x - 10),
            y: Math.max(0, y - 10),
            width: 200,
            height: 60,
            signed: false,
            signatureData: null,
            dateValue: null,
          });
        }
      }

      // Check for date fields
      const dateMatched = DATE_PATTERNS.some((pattern) => pattern.test(text));
      if (dateMatched) {
        const posKey = `date-${pageNum}-${Math.round(x / 30)}-${Math.round(y / 30)}`;
        if (!seenPositions.has(posKey)) {
          seenPositions.add(posKey);

          dateFields.push({
            id: generateFieldId(),
            fieldType: 'date',
            type: 'date',
            label: 'Date',
            page: pageNum,
            x: Math.max(0, x - 10),
            y: Math.max(0, y - 10),
            width: 120,
            height: 30,
            signed: false,
            signatureData: null,
            dateValue: null,
          });
        }
      }
    }
  }

  return [...sigFields, ...dateFields];
}

export default function PDFSignatureEditor({
  pdfData,
  signatureFields,
  onFieldsChange,
  onConfirm,
  onBack,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const [isScanning, setIsScanning] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);

  const [dragging, setDragging] = useState(null);

  // Load PDF document when pdfData changes
  useEffect(() => {
    if (!pdfData) return;

    let cancelled = false;

    async function loadPdf() {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfData);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);

        // Start scanning flow
        setIsScanning(true);
        setDetectionResult(null);

        // Show scanning overlay for 2 seconds, then run detection
        setTimeout(async () => {
          if (cancelled) return;

          const detected = await scanForSignatureFields(pdf);

          if (cancelled) return;

          setIsScanning(false);

          if (detected.length > 0) {
            onFieldsChange(detected);
            const sigCount = detected.filter(f => f.fieldType !== 'date').length;
            const dateCount = detected.filter(f => f.fieldType === 'date').length;
            setDetectionResult({
              type: 'success',
              sigCount,
              dateCount,
            });
          } else {
            setDetectionResult({
              type: 'empty',
            });
          }
        }, 2000);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        if (!cancelled) {
          setIsScanning(false);
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: SCALE });

        if (cancelled) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setPageDimensions({
          width: viewport.width,
          height: viewport.height,
        });

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (err) {
        console.error('Failed to render page:', err);
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage]);

  // Page navigation
  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  // Add field helpers
  const addSenderField = useCallback(() => {
    const centerX = Math.max(0, (pageDimensions.width - 200) / 2);
    const centerY = Math.max(0, (pageDimensions.height - 60) / 2);
    const senderCount = signatureFields.filter(f => f.type === 'sender').length + 1;

    const newField = {
      id: generateFieldId(),
      type: 'sender',
      label: senderCount > 1 ? `Your Signature (${senderCount})` : 'Your Signature',
      signee: `Signee ${senderCount}`,
      page: currentPage,
      x: centerX,
      y: centerY,
      width: 200,
      height: 60,
      signed: false,
      signatureData: null,
      dateValue: null,
    };

    onFieldsChange([...signatureFields, newField]);
  }, [signatureFields, onFieldsChange, currentPage, pageDimensions]);

  const addClientField = useCallback(() => {
    const centerX = Math.max(0, (pageDimensions.width - 200) / 2);
    const centerY = Math.max(0, (pageDimensions.height - 60) / 2);
    const clientCount = signatureFields.filter(f => f.type === 'client').length + 1;

    const newField = {
      id: generateFieldId(),
      type: 'client',
      label: clientCount > 1 ? `Client Signature (${clientCount})` : 'Client Signature',
      signee: `Client Signee ${clientCount}`,
      page: currentPage,
      x: centerX,
      y: centerY,
      width: 200,
      height: 60,
      signed: false,
      signatureData: null,
      dateValue: null,
    };

    onFieldsChange([...signatureFields, newField]);
  }, [signatureFields, onFieldsChange, currentPage, pageDimensions]);

  const addDateField = useCallback(() => {
    const centerX = Math.max(0, (pageDimensions.width - 120) / 2);
    const centerY = Math.max(0, (pageDimensions.height - 30) / 2) + 80;

    const newField = {
      id: generateFieldId(),
      fieldType: 'date',
      type: 'date',
      label: 'Date',
      page: currentPage,
      x: centerX,
      y: centerY,
      width: 120,
      height: 30,
      signed: false,
      signatureData: null,
      dateValue: null,
    };

    onFieldsChange([...signatureFields, newField]);
  }, [signatureFields, onFieldsChange, currentPage, pageDimensions]);

  // Remove a field
  const removeField = useCallback(
    (fieldId) => {
      onFieldsChange(signatureFields.filter((f) => f.id !== fieldId));
    },
    [signatureFields, onFieldsChange]
  );

  // Dragging logic
  const handleMouseDown = useCallback(
    (e, field) => {
      e.preventDefault();
      e.stopPropagation();

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const offsetX = e.clientX - containerRect.left - field.x;
      const offsetY = e.clientY - containerRect.top - field.y;

      setDragging({
        fieldId: field.id,
        offsetX,
        offsetY,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newX = e.clientX - containerRect.left - dragging.offsetX;
      let newY = e.clientY - containerRect.top - dragging.offsetY;

      const field = signatureFields.find((f) => f.id === dragging.fieldId);
      if (!field) return;

      // Clamp within canvas bounds
      newX = Math.max(0, Math.min(newX, pageDimensions.width - field.width));
      newY = Math.max(0, Math.min(newY, pageDimensions.height - field.height));

      const updatedFields = signatureFields.map((f) =>
        f.id === dragging.fieldId ? { ...f, x: newX, y: newY } : f
      );

      onFieldsChange(updatedFields);
    },
    [dragging, signatureFields, onFieldsChange, pageDimensions]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Attach global mouse listeners while dragging
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => handleMouseMove(e);
    const onUp = () => handleMouseUp();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Fields on the currently displayed page
  const fieldsOnCurrentPage = signatureFields.filter(
    (f) => f.page === currentPage
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      {/* Toolbar - sticky */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addSenderField}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Your Signature
            </button>
            <button
              onClick={addClientField}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Client Signature
            </button>
            <button
              onClick={addDateField}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" /> Date Field
            </button>
          </div>
        </div>
      </div>

      {/* Detection banner */}
      {detectionResult && detectionResult.type === 'success' && (
        <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-800">
            Detected {detectionResult.sigCount} signature and {detectionResult.dateCount} date field(s).
            Review placement below, or add more fields manually.
          </p>
        </div>
      )}
      {detectionResult && detectionResult.type === 'empty' && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800">
            No fields detected. Please add signature and date fields manually
            using the buttons above.
          </p>
        </div>
      )}

      {/* PDF container with overlays */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          ref={containerRef}
          className="relative inline-block"
          style={{
            width: pageDimensions.width || 'auto',
            height: pageDimensions.height || 'auto',
          }}
          onMouseMove={dragging ? handleMouseMove : undefined}
          onMouseUp={dragging ? handleMouseUp : undefined}
        >
          <canvas ref={canvasRef} className="block shadow-lg" />

          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
              <div className="w-12 h-12 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-semibold">Analyzing document...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Scanning for signature fields
              </p>
            </div>
          )}

          {/* Field overlays for the current page */}
          {!isScanning &&
            fieldsOnCurrentPage.map((field) => {
              const isDate = field.fieldType === 'date';
              const isSender = field.type === 'sender';

              let borderColor, bgColor, textColor;
              if (isDate) {
                borderColor = 'border-gray-400 dark:border-gray-500';
                bgColor = 'bg-gray-50/60 dark:bg-gray-800/60';
                textColor = 'text-gray-600 dark:text-gray-300';
              } else if (isSender) {
                borderColor = 'border-emerald-500';
                bgColor = 'bg-emerald-50/60';
                textColor = 'text-emerald-700';
              } else {
                borderColor = 'border-blue-500';
                bgColor = 'bg-blue-50/60';
                textColor = 'text-blue-700';
              }

              return (
                <div
                  key={field.id}
                  className={`absolute border-2 border-dashed ${borderColor} ${bgColor} rounded cursor-move select-none group`}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field)}
                >
                  <div className={`flex items-center justify-center h-full px-2 ${textColor}`}>
                    <span className="text-xs font-medium truncate">
                      {field.label}
                    </span>
                  </div>

                  <button
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                  >
                    <X className="w-3 h-3 text-gray-500 dark:text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {signatureFields.length} field(s) placed
        </p>
        <button
          onClick={onConfirm}
          disabled={signatureFields.length === 0}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Placement
        </button>
      </div>
    </div>
  );
}
