import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Upload, Eye, ChevronDown, FileText, Check, Download, Users, RefreshCw } from 'lucide-react';

function InvoiceCreationFlow({ onClose, onCancel, onInvoiceCreated, onComplete, recipients, userData }) {
  // Support both prop naming conventions
  const handleClose = onCancel || onClose;
  const handleCreated = onComplete || onInvoiceCreated;
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [itemCounter, setItemCounter] = useState(1);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});

  // Filter to US clients only
  const usClients = recipients.filter(r => r.country === 'USA' || r.country === 'US' || r.country === 'United States');

  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    serviceCharge: '',
    tax: '',
    discount: '',
    notes: '',
    isRecurring: false,
    recurringFrequency: 'monthly',
    customFrequencyValue: '',
    customFrequencyUnit: 'days'
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { id: itemCounter, name: '', qty: '', price: '' }]);
    setItemCounter(itemCounter + 1);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.csv')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;

      const newItems = [];
      let currentCounter = itemCounter;

      dataLines.forEach(line => {
        const values = line.split(',').map(v => v.trim());
        if (values.length >= 3) {
          newItems.push({
            id: currentCounter++,
            name: values[0],
            qty: parseFloat(values[1]) || 1,
            price: parseFloat(values[2]) || 0
          });
        }
      });

      if (newItems.length > 0) {
        setLineItems([...lineItems, ...newItems]);
        setItemCounter(currentCounter);
        setShowCsvModal(false);
      }
    };
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const csvContent = 'Name,Quantity,Price\nWeb Design Services,1,2500.00\nLogo Design,2,750.00';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'line_items_template.csv';
    a.click();
  };

  const parseAmount = (value) => parseFloat(value) || 0;
  const calculateSubtotal = () => lineItems.reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)), 0);
  const calculateTotal = () => calculateSubtotal() + parseAmount(formData.serviceCharge) + parseAmount(formData.tax) - parseAmount(formData.discount);

  const validateForm = () => {
    const newErrors = {};
    if (!selectedClient) newErrors.client = 'Please select a client';
    if (!formData.title.trim()) newErrors.title = 'Invoice title is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (lineItems.length === 0) newErrors.lineItems = 'Add at least one line item';
    
    // Check if any line item is incomplete
    const incompleteItems = lineItems.some(item => !item.name.trim() || (parseFloat(item.qty) || 0) <= 0 || (parseFloat(item.price) || 0) <= 0);
    if (incompleteItems) newErrors.lineItems = 'Complete all line item details (name, quantity, and price)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendInvoice = () => {
    if (!validateForm()) return;


    const invoice = {
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      dueDate: new Date(formData.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      invoiceNumber: formData.number,
      pdf: 'has-pdf',
      businessName: selectedClient.name,
      zypId: selectedClient.id.toString(),
      recipientUserId: selectedClient.zypUserId || null,  // The actual Zyp user ID for cross-user visibility
      type: 'Receivable',
      amount: `$${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      invoiceData: {
        ...formData,
        customer: selectedClient.name,
        customerEmail: selectedClient.email,
        customerLocation: `${selectedClient.bank || selectedClient.bankName} •••• ${selectedClient.accountNumber?.slice(-4) || '****'}`,
        lineItems: lineItems.map(item => ({ ...item, qty: parseFloat(item.qty) || 0, price: parseFloat(item.price) || 0 })),
        subtotal: calculateSubtotal(),
        total: calculateTotal()
      }
    };

    handleCreated(invoice);
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setShowPreview(true);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-t-lg sm:rounded-xl w-full sm:max-w-4xl sm:mx-4 border border-gray-200 dark:border-gray-700 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-lg sm:text-lg font-semibold">Create Invoice</h2>
          <button onClick={handleClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Client Selector - Simple Dropdown */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Select Client <span className="text-red-700">*</span></label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowClientDropdown(!showClientDropdown)}
                className={`w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border rounded-lg text-left flex items-center justify-between transition-colors${
                  errors.client ? 'border-red-500 ring-2 ring-red-500/20' : showClientDropdown ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                }`}
              >
                {selectedClient ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center">
                      <span className="text-emerald-700 font-semibold text-sm">{selectedClient.name.charAt(0)}</span>
                    </div>
                    <span className="font-medium">{selectedClient.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Choose a client...</span>
                )}
                <ChevronDown className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform${showClientDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showClientDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    {usClients.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No US clients yet</p>
                        <p className="text-sm">Add US clients in the Clients tab</p>
                      </div>
                    ) : (
                      usClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowClientDropdown(false);
                            setErrors({ ...errors, client: null });
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left${
                            selectedClient?.id === client.id ? 'bg-emerald-200' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center">
                            <span className="text-emerald-700 font-semibold text-sm">{client.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{client.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{client.email}</div>
                          </div>
                          {selectedClient?.id === client.id && (
                            <Check className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.client && <p className="text-red-700 text-sm mt-1">{errors.client}</p>}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Invoice Title <span className="text-red-700">*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => { setFormData({...formData, title: e.target.value}); setErrors({...errors, title: null}); }}
                placeholder="e.g., BPO Services - November 2025"
                className={`w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border rounded-md text-gray-900 dark:text-white focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600${
                  errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
              />
              {errors.title && <p className="text-red-700 text-sm mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Invoice Number</label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({...formData, number: e.target.value})}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Due Date <span className="text-red-700">*</span></label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => { setFormData({...formData, dueDate: e.target.value}); setErrors({...errors, dueDate: null}); }}
                className={`w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border rounded-md text-gray-900 dark:text-white focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600${
                  errors.dueDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
              />
              {errors.dueDate && <p className="text-red-700 text-sm mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-500 dark:text-gray-400">Line Items <span className="text-red-700">*</span></label>
              <button type="button" onClick={() => setShowCsvModal(true)} className="text-sm text-blue-700 hover:text-blue-600">
                <Upload className="w-4 h-4 inline mr-1" /> Import CSV
              </button>
            </div>

            {errors.lineItems && <p className="text-red-700 text-sm mb-2">{errors.lineItems}</p>}

            <div className="space-y-3 mb-4">
              {lineItems.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center p-3 sm:p-0 bg-gray-50/30 sm:bg-transparent rounded-lg sm:rounded-lg">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                    placeholder="Item name"
                    className={`flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600${
                      errors.lineItems && !item.name.trim() ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                    }`}
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      type="text" inputMode="decimal"
                      value={item.qty}
                      onChange={(e) => updateLineItem(item.id, 'qty', e.target.value)}
                      placeholder="Qty"
                      className={`w-16 sm:w-20 px-3 py-2 bg-gray-100 dark:bg-gray-800 border rounded-md text-gray-900 dark:text-white text-center text-sm focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600${
                        errors.lineItems && (parseFloat(item.qty) || 0) <= 0 ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                      }`}
                    />
                    <div className="relative flex-1 sm:w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                      <input
                        type="text" inputMode="decimal"
                        value={item.price}
                        onChange={(e) => updateLineItem(item.id, 'price', e.target.value)}
                        placeholder="Price"
                        className={`w-full pl-7 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600${
                          errors.lineItems && (parseFloat(item.price) || 0) <= 0 ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                        }`}
                      />
                    </div>
                    <div className="w-20 text-right font-medium text-sm">${((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</div>
                    <button type="button" onClick={() => removeLineItem(item.id)} className="text-red-700 hover:text-red-600 p-1"><X className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addLineItem} className="text-emerald-700 hover:text-emerald-600 text-sm">
              <Plus className="w-4 h-4 inline mr-1" /> Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Service Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.serviceCharge}
                    onChange={(e) => setFormData({...formData, serviceCharge: e.target.value})}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tax</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.tax}
                    onChange={(e) => setFormData({...formData, tax: e.target.value})}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Discount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="text" inputMode="decimal"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: e.target.value})}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-lg font-semibold">
              <span>Total</span>
              <span className="text-gray-900 dark:text-white">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              placeholder="Payment terms, additional info..."
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white focus:outline-none focus:outline-none focus:border-gray-200 dark:focus:border-gray-600"
            />
          </div>

          {/* Recurring Invoice */}
          <div className={`border rounded-lg p-4${formData.isRecurring ? 'border-emerald-300 bg-emerald-100/50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className={`w-5 h-5${formData.isRecurring ? 'text-emerald-700' : 'text-gray-500 dark:text-gray-400'}`} />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Recurring Invoice</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Automatically send this invoice on a schedule</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.isRecurring}
                onClick={() => setFormData({...formData, isRecurring: !formData.isRecurring})}
                className={`relative w-11 h-6 rounded-full transition-colors${formData.isRecurring ? 'bg-emerald-1000' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-gray-900 rounded-full shadow transition-transform${formData.isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {formData.isRecurring && (
              <div className="mt-4 pt-4 border-t border-emerald-300">
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Frequency</label>
                <div className="flex gap-2">
                  {[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'custom', label: 'Custom' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({...formData, recurringFrequency: option.value})}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors${
                        formData.recurringFrequency === option.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {formData.recurringFrequency === 'custom' && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Every</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.customFrequencyValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          setFormData({...formData, customFrequencyValue: val});
                        }
                      }}
                      placeholder="e.g. 14"
                      className="w-20 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:border-gray-400"
                    />
                    <select
                      value={formData.customFrequencyUnit}
                      onChange={(e) => setFormData({...formData, customFrequencyUnit: e.target.value})}
                      className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:border-gray-400"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 rounded-b-none">
          <button type="button" onClick={handleClose} className="sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm sm:text-base order-3 sm:order-1">Cancel</button>
          <button type="button" onClick={handlePreview} className="sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-emerald-500 text-emerald-700 rounded-md hover:bg-emerald-200 text-sm sm:text-base order-2">Preview</button>
          <button type="button" onClick={sendInvoice} className="sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 text-sm sm:text-base order-1 sm:order-3">Send Invoice</button>
        </div>

        {/* CSV Upload Modal */}
        {showCsvModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Import Line Items</h3>
                <button onClick={() => setShowCsvModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><X className="w-6 h-6" /></button>
              </div>
              <div className="bg-blue-200 border border-blue-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700 mb-2">CSV Format: Name, Quantity, Price</p>
                <code className="text-xs text-gray-500 dark:text-gray-400">Web Design,1,2500.00</code>
              </div>
              <button onClick={downloadCsvTemplate} className="w-full p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-700 mb-4">
                <Download className="w-5 h-5 inline mr-2" /> Download Template
              </button>
              <label className="block w-full p-4 bg-white dark:bg-gray-900 text-black font-semibold rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                <Upload className="w-5 h-5 inline mr-2" /> Upload CSV
              </label>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && selectedClient && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 mb-2">ZYP</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      <p>123 Business Street</p>
                      <p>New York, NY 10001</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">INVOICE</h1>
                    <p className="text-gray-500 dark:text-gray-400">{formData.number}</p>
                  </div>
                </div>

                {/* Dates & Client */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Bill To</h3>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedClient.name}</p>
                    <p className="text-gray-500 dark:text-gray-400">{selectedClient.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Issue Date: </span>
                      <span className="text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Due Date: </span>
                      <span className="text-gray-900 dark:text-white">{formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Invoice Title */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{formData.title}</h2>
                </div>

                {/* Line Items Table */}
                <table className="w-full mb-6">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 text-gray-500 dark:text-gray-400 font-medium">Description</th>
                      <th className="text-center py-3 text-gray-500 dark:text-gray-400 font-medium w-20">Qty</th>
                      <th className="text-right py-3 text-gray-500 dark:text-gray-400 font-medium w-28">Price</th>
                      <th className="text-right py-3 text-gray-500 dark:text-gray-400 font-medium w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 text-gray-900 dark:text-white">{item.name}</td>
                        <td className="py-3 text-center text-gray-500 dark:text-gray-400">{item.qty}</td>
                        <td className="py-3 text-right text-gray-500 dark:text-gray-400">${(parseFloat(item.price) || 0).toFixed(2)}</td>
                        <td className="py-3 text-right text-gray-900 dark:text-white font-medium">${((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64">
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                        <span className="text-gray-900 dark:text-white">${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      {parseAmount(formData.serviceCharge) > 0 && (
                        <div className="flex justify-between py-2">
                          <span className="text-gray-500 dark:text-gray-400">Service Charge</span>
                          <span className="text-gray-900 dark:text-white">${parseAmount(formData.serviceCharge).toFixed(2)}</span>
                        </div>
                      )}
                      {parseAmount(formData.tax) > 0 && (
                        <div className="flex justify-between py-2">
                          <span className="text-gray-500 dark:text-gray-400">Tax</span>
                          <span className="text-gray-900 dark:text-white">${parseAmount(formData.tax).toFixed(2)}</span>
                        </div>
                      )}
                      {parseAmount(formData.discount) > 0 && (
                        <div className="flex justify-between py-2">
                          <span className="text-gray-500 dark:text-gray-400">Discount</span>
                          <span className="text-gray-900 dark:text-white">-${parseAmount(formData.discount).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-3 border-t-2 border-gray-900 mt-2">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {formData.notes && (
                  <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Notes</h3>
                    <p className="text-gray-500 dark:text-gray-400">{formData.notes}</p>
                  </div>
                )}
              </div>

              {/* Preview Actions */}
              <div className="bg-gray-100 dark:bg-gray-700 px-8 py-4 flex gap-3 rounded-b-none">
                <button onClick={() => setShowPreview(false)} className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">Back to Edit</button>
                <button onClick={() => { setShowPreview(false); sendInvoice(); }} className="flex-1 px-6 py-3 bg-emerald-1000 text-white font-semibold rounded-lg hover:bg-emerald-600">Send Invoice</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default InvoiceCreationFlow;
