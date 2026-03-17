import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import SignaturePad from './SignaturePad';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PDF_SCALE = 1.5;

export default function ContractSigningView({ contract, onUpdateContract, onClose, userData }) {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [signingField, setSigningField] = useState(null);
  const [fields, setFields] = useState(contract?.signatureFields || []);

  // Load PDF document
  useEffect(() => {
    if (!contract?.pdfData) return;

    let cancelled = false;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(contract.pdfData);
        const pdf = await loadingTask.promise;
        if (!cancelled) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
        }
      } catch (err) {
        console.error('Failed to load PDF:', err);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [contract?.pdfData]);

  // Render current page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: PDF_SCALE });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');
        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to render page:', err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage]);

  // Sync fields from contract prop
  useEffect(() => {
    if (contract?.signatureFields) {
      setFields(contract.signatureFields);
    }
  }, [contract?.signatureFields]);

  // Page navigation
  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  // Signing progress
  const senderFields = fields.filter((f) => f.type === 'sender');
  const signedCount = senderFields.filter((f) => f.signed).length;
  const totalSenderFields = senderFields.length;
  const allSenderSigned = totalSenderFields > 0 && signedCount === totalSenderFields;

  // Fields for the current page
  const currentPageFields = fields.filter((f) => f.page === currentPage);

  // Find the nearest unsigned date field to a signature field on the same page
  const findNearestDateField = useCallback((sigField, allFields, excludeIds = new Set()) => {
    const candidates = allFields.filter(
      (f) => f.fieldType === 'date' && !f.signed && f.page === sigField.page && !excludeIds.has(f.id)
    );
    if (candidates.length === 0) return null;

    let nearest = null;
    let minDist = Infinity;
    for (const df of candidates) {
      const dx = df.x - sigField.x;
      const dy = df.y - sigField.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = df;
      }
    }
    return nearest;
  }, []);

  // Handle signing a field
  const handleSign = useCallback(
    (dataUrl) => {
      if (!signingField) return;

      const dateValue = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });

      // Find the nearest date field to this signature (only fill that one)
      const nearestDate = findNearestDateField(signingField, fields);

      const updatedFields = fields.map((f) => {
        if (f.id === signingField.id) {
          return { ...f, signed: true, signatureData: dataUrl, dateValue };
        }
        // Only fill the nearest date field, not all of them
        if (nearestDate && f.id === nearestDate.id) {
          return { ...f, signed: true, dateValue };
        }
        return f;
      });

      const allSenderDone = updatedFields
        .filter((f) => f.type === 'sender')
        .every((f) => f.signed);
      const allClientDone = updatedFields
        .filter((f) => f.type === 'client')
        .every((f) => f.signed);
      const allDone = allSenderDone && allClientDone;

      setFields(updatedFields);
      setSigningField(null);

      const updates = {
        signatureFields: updatedFields,
        senderSigned: allSenderDone,
        clientSigned: allClientDone,
      };

      // Auto-transition to Active if all signatures received
      if (allDone) {
        updates.status = 'Active';
      }

      onUpdateContract(contract.id, updates);
    },
    [signingField, fields, contract?.id, onUpdateContract, findNearestDateField]
  );

  // Handle clicking an unsigned sender field
  const handleFieldClick = useCallback((field) => {
    if (field.type === 'sender' && !field.signed) {
      setSigningField(field);
    }
  }, []);

  // Render a field overlay (signature or date)
  const renderFieldOverlay = (field) => {
    const isDate = field.fieldType === 'date';
    const isSender = field.type === 'sender';
    const isSigned = field.signed;

    const fieldStyle = {
      position: 'absolute',
      left: field.x,
      top: field.y,
      width: field.width,
      height: field.height,
    };

    let fieldClassName = '';
    let fieldContent = null;

    if (isDate) {
      // Date field
      fieldClassName = isSigned
        ? 'rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center px-1'
        : 'rounded border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-center';
      fieldContent = isSigned
        ? <span className="text-xs text-gray-600 dark:text-gray-300">{field.dateValue}</span>
        : <span className="text-xs text-gray-400 dark:text-gray-500 select-none">Date</span>;
    } else if (isSigned) {
      fieldClassName = `rounded ${
        isSender ? 'border-2 border-emerald-500' : 'border-2 border-blue-500'
      } overflow-hidden`;
      fieldContent = (
        <img src={field.signatureData} alt="Signature" className="w-full h-full object-contain" />
      );
    } else if (isSender) {
      fieldClassName =
        'rounded border-2 border-dashed border-emerald-400 bg-emerald-50/50 cursor-pointer hover:bg-emerald-50 transition-colors flex items-center justify-center signature-field-unsigned';
      fieldContent = (
        <span className="text-xs text-emerald-600 font-medium select-none">Click to sign</span>
      );
    } else {
      fieldClassName =
        'rounded border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-center';
      fieldContent = (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium select-none">Awaiting client</span>
      );
    }

    return (
      <div
        key={field.id}
        style={fieldStyle}
        className={fieldClassName}
        onClick={() => handleFieldClick(field)}
      >
        {fieldContent}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-semibold">{contract?.title}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Signing progress */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {signedCount} of {totalSenderFields} signed
          </div>
          {/* Page nav */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage}/{totalPages}
            </span>
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF + overlays */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div className="relative inline-block">
          <canvas ref={canvasRef} />
          {/* Field overlays for current page */}
          {currentPageFields.map((field) => renderFieldOverlay(field))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {allSenderSigned ? 'All fields signed' : 'Click signature fields to sign'}
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          {allSenderSigned ? 'Done' : 'Save & Close'}
        </button>
      </div>

      {/* Signature pad modal */}
      <SignaturePad
        isOpen={!!signingField}
        onClose={() => setSigningField(null)}
        onSign={handleSign}
        signerName={`${userData?.first_name || ''} ${userData?.last_name || ''}`}
        fieldLabel={signingField?.label || 'Signature'}
      />
    </div>
  );
}
