import React, { useState, useRef } from 'react';
import {
  Plus, Search, Check, Clock, AlertCircle,
  Trash2, FileText, Send, X,
  ChevronLeft, ChevronRight, AlertTriangle, Upload,
  FileSignature, Users
} from 'lucide-react';
import PDFSignatureEditor from '../contracts/PDFSignatureEditor';
import ContractSigningView from '../contracts/ContractSigningView';

const STATUS_COLORS = {
  Draft: 'bg-gray-50 dark:bg-gray-800 text-gray-600 border border-gray-200',
  Sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  Signed: 'bg-violet-50 text-violet-700 border border-violet-200',
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Expired: 'bg-red-50 text-red-700 border border-red-200',
};

const TYPE_COLORS = {
  MSA: 'bg-blue-50 text-blue-700 border border-blue-200',
  SOW: 'bg-violet-50 text-violet-700 border border-violet-200',
  'Service Agreement': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  NDA: 'bg-amber-50 text-amber-700 border border-amber-200',
  Other: 'bg-gray-50 dark:bg-gray-800 text-gray-600 border border-gray-200',
};

const VALID_TRANSITIONS = {
  Draft: ['Sent'],
  Sent: ['Signed', 'Draft'],
  Signed: ['Active'],
  Active: ['Expired'],
  Expired: ['Draft'],
};

function ContractsView({
  contracts = [],
  setContracts,
  recipients = [],
  userData,
  onAddContract,
  onUpdateContract,
  onDeleteContract,
  activeView = 'manage',
  setActiveView,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);

  // Create flow multi-step state
  const [createStep, setCreateStep] = useState(1);
  const [createFormData, setCreateFormData] = useState(null);
  const [createPdfData, setCreatePdfData] = useState(null);
  const [createPdfFileName, setCreatePdfFileName] = useState(null);
  const [createSignatureFields, setCreateSignatureFields] = useState([]);

  // Signing view state
  const [signingContract, setSigningContract] = useState(null);

  // Simulate client signing state
  const [simulatingClient, setSimulatingClient] = useState(false);

  // Computed stats
  const activeContracts = contracts.filter(c => c.status === 'Active');
  const pendingSignature = contracts.filter(c => c.status === 'Sent' || c.status === 'Draft');
  const today = new Date();
  const expiringSoon = contracts.filter(c => {
    if (!c.renewalDate) return false;
    const renewal = new Date(c.renewalDate);
    const daysUntil = Math.floor((renewal - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30 && c.status === 'Active';
  });

  const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
  const activeValue = activeContracts.reduce((sum, c) => sum + (c.value || 0), 0);

  // Filter contracts
  const filtered = contracts.filter(c => {
    const matchesSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val) => {
    if (val == null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openDetail = (contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  const openDelete = (contract) => {
    setSelectedContract(contract);
    setShowDeleteModal(true);
  };

  const handleDelete = () => {
    if (!selectedContract) return;
    onDeleteContract(selectedContract.id);
    setShowDeleteModal(false);
    setShowDetailModal(false);
    setSelectedContract(null);
  };

  // Open document viewer (clicking contract name)
  const openDocument = (contract) => {
    if (contract.pdfData) {
      setSigningContract(contract);
    } else {
      openDetail(contract);
    }
  };

  // Start signing a contract
  const openSigning = (contract) => {
    setShowDetailModal(false);
    setSigningContract(contract);
  };

  // Send contract to client
  const handleSendToClient = (contract) => {
    const updatedHistory = [
      ...(contract.statusHistory || []),
      { status: 'Sent', date: new Date().toISOString().split('T')[0], updatedBy: 'Carlos Rivera' },
    ];
    onUpdateContract(contract.id, { status: 'Sent', statusHistory: updatedHistory });
    setSelectedContract(prev => prev ? { ...prev, status: 'Sent', statusHistory: updatedHistory } : null);
  };

  // Simulate client signature
  const handleSimulateClientSignature = (contract) => {
    setSimulatingClient(true);

    setTimeout(() => {
      const dateValue = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });

      // Generate a script-style signature image for the client
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '36px "Dancing Script", cursive';
      ctx.fillStyle = '#1e3a5f';
      ctx.textBaseline = 'middle';
      ctx.fillText(contract.clientName || 'Client', 10, canvas.height / 2);
      const clientSigData = canvas.toDataURL('image/png');

      // Pair each client signature with its nearest date field
      const allFields = contract.signatureFields || [];
      const unsignedClientFields = allFields.filter(f => f.type === 'client' && !f.signed);
      const dateFieldIdsToFill = new Set();

      for (const cf of unsignedClientFields) {
        const candidates = allFields.filter(
          f => f.fieldType === 'date' && !f.signed && f.page === cf.page && !dateFieldIdsToFill.has(f.id)
        );
        if (candidates.length > 0) {
          let nearest = null;
          let minDist = Infinity;
          for (const df of candidates) {
            const dx = df.x - cf.x;
            const dy = df.y - cf.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              nearest = df;
            }
          }
          if (nearest) dateFieldIdsToFill.add(nearest.id);
        }
      }

      const updatedFields = allFields.map(f => {
        if (f.type === 'client' && !f.signed) {
          return { ...f, signed: true, signatureData: clientSigData, dateValue };
        }
        // Only fill date fields associated with client signatures
        if (dateFieldIdsToFill.has(f.id)) {
          return { ...f, signed: true, dateValue };
        }
        return f;
      });

      const allClientSigned = updatedFields.filter(f => f.type === 'client').every(f => f.signed);
      const allSenderSigned = updatedFields.filter(f => f.type === 'sender').every(f => f.signed);
      const bothSigned = allClientSigned && allSenderSigned;

      const updates = {
        signatureFields: updatedFields,
        clientSigned: allClientSigned,
      };

      // Auto-transition to Active if all parties have signed
      if (bothSigned) {
        updates.status = 'Active';
      }

      onUpdateContract(contract.id, updates);
      setSelectedContract(prev => prev ? { ...prev, ...updates } : null);
      setSimulatingClient(false);
    }, 2000);
  };

  // Mark as active
  const handleMarkActive = (contract) => {
    const updatedHistory = [
      ...(contract.statusHistory || []),
      { status: 'Active', date: new Date().toISOString().split('T')[0], updatedBy: 'Carlos Rivera' },
    ];
    onUpdateContract(contract.id, { status: 'Active', statusHistory: updatedHistory });
    setSelectedContract(prev => prev ? { ...prev, status: 'Active', statusHistory: updatedHistory } : null);
  };

  // Recent contracts for overview
  const recentContracts = [...contracts]
    .sort((a, b) => {
      const aDate = a.statusHistory?.length ? new Date(a.statusHistory[a.statusHistory.length - 1].date) : new Date(a.startDate);
      const bDate = b.statusHistory?.length ? new Date(b.statusHistory[b.statusHistory.length - 1].date) : new Date(b.startDate);
      return bDate - aDate;
    })
    .slice(0, 5);

  const clientsWithContracts = [...new Set(contracts.map(c => c.clientName))];

  // Reset create flow state
  const resetCreateFlow = () => {
    setCreateStep(1);
    setCreateFormData(null);
    setCreatePdfData(null);
    setCreatePdfFileName(null);
    setCreateSignatureFields([]);
    setSelectedContract(null);
  };

  // Render based on active view
  const renderContent = () => {
    // If signing a contract, show signing view
    if (signingContract) {
      // Get the fresh contract data
      const freshContract = contracts.find(c => c.id === signingContract.id) || signingContract;
      return (
        <ContractSigningView
          contract={freshContract}
          onUpdateContract={onUpdateContract}
          onClose={() => setSigningContract(null)}
          userData={userData}
        />
      );
    }

    switch (activeView) {
      case 'manage':
        return renderManageView();
      case 'create':
        return renderCreateView();
      default:
        return renderOverview();
    }
  };

  // ==================== OVERVIEW ====================
  const renderOverview = () => (
    <div className="p-4 md:p-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-gray-400">
          <p className="text-xs text-gray-500 mb-1">Total Contracts</p>
          <p className="text-2xl font-semibold">{contracts.length}</p>
          <p className="text-xs text-gray-400 mt-1">{activeContracts.length} active</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-semibold text-emerald-700">{activeContracts.length}</p>
          <p className="text-xs text-gray-400 mt-1">{pendingSignature.length} pending</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-gray-500 mb-1">Pending Signature</p>
          <p className="text-2xl font-semibold text-amber-700">{pendingSignature.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-red-500">
          <p className="text-xs text-gray-500 mb-1">Expiring Soon</p>
          <p className="text-2xl font-semibold text-red-700">{expiringSoon.length}</p>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-amber-800">Contracts expiring within 30 days</span>
          </div>
          <div className="space-y-1">
            {expiringSoon.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span
                  className="text-amber-900 cursor-pointer hover:underline"
                  onClick={() => openDetail(c)}
                >
                  {c.title} — {c.clientName}
                </span>
                <span className="text-amber-700">Renews {formatDate(c.renewalDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: Recent Activity + By Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Contracts */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-medium text-sm">Recent Activity</h2>
            <button
              onClick={() => setActiveView && setActiveView('manage')}
              className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentContracts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm">No contracts yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentContracts.map(contract => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => openDetail(contract)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{contract.title}</p>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${TYPE_COLORS[contract.type]}`}>
                        {contract.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{contract.clientName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${STATUS_COLORS[contract.status]}`}>
                      {contract.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{contract.endDate ? formatDate(contract.endDate) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contracts by Client */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-medium text-sm">By Client</h2>
          </div>
          {clientsWithContracts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm">No clients yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {clientsWithContracts.map(clientName => {
                const clientContracts = contracts.filter(c => c.clientName === clientName);
                const clientActive = clientContracts.filter(c => c.status === 'Active').length;
                return (
                  <div key={clientName} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{clientName}</p>
                      <p className="text-xs text-gray-500">{clientContracts.length} contract{clientContracts.length !== 1 ? 's' : ''} · {clientActive} active</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick action */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Upload a new document</p>
            <p className="text-xs text-gray-500 mt-1">Upload, sign, and send contracts to your clients</p>
          </div>
          <button
            onClick={() => { resetCreateFlow(); setActiveView && setActiveView('create'); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );

  // ==================== MANAGE VIEW ====================
  const renderManageView = () => (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">All Contracts</h1>
          <p className="text-sm text-gray-500 mt-1">{contracts.length} total · {activeContracts.length} active</p>
        </div>
        <button
          onClick={() => { resetCreateFlow(); setActiveView && setActiveView('create'); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contract
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Signed">Signed</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="MSA">MSA</option>
          <option value="SOW">SOW</option>
          <option value="Service Agreement">Service Agreement</option>
          <option value="NDA">NDA</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Desktop */}
        <table className="w-full hidden md:table">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contract</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase w-44 text-center">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">End Date</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase w-28">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                  <p>No contracts found</p>
                </td>
              </tr>
            ) : (
              paginated.map(contract => (
                <tr
                  key={contract.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => openDetail(contract)}
                >
                  <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); openDocument(contract); }}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline">{contract.title}</p>
                      {contract.pdfData && <FileText className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{contract.clientName}</td>
                  <td className="px-4 py-3 w-44 text-center">
                    <span className={`inline-block text-center w-36 py-0.5 text-xs font-medium rounded-lg ${TYPE_COLORS[contract.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-600'}`}>
                      {contract.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {contract.endDate ? formatDate(contract.endDate) : 'No expiry'}
                  </td>
                  <td className="px-4 py-3 w-28">
                    <span className={`inline-block text-center w-20 py-0.5 text-xs font-medium rounded-lg ${STATUS_COLORS[contract.status]}`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {contract.pdfData && (contract.signatureFields || []).length > 0 && !contract.senderSigned ? (
                        <button onClick={() => openSigning(contract)}
                          className="text-xs px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-medium">
                          Sign
                        </button>
                      ) : (
                        <span className="text-xs px-3 py-1.5 invisible">Sign</span>
                      )}
                      <button onClick={() => openDelete(contract)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {paginated.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No contracts found</p>
            </div>
          ) : (
            paginated.map(contract => (
              <div
                key={contract.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => openDetail(contract)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{contract.title}</p>
                    <p className="text-xs text-gray-500">{contract.clientName}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${STATUS_COLORS[contract.status]}`}>
                    {contract.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${TYPE_COLORS[contract.type]}`}>{contract.type}</span>
                    <span>{contract.endDate ? formatDate(contract.endDate) : 'No expiry'}</span>
                  </div>
                  {contract.pdfData && (contract.signatureFields || []).length > 0 && !contract.senderSigned && (
                    <button onClick={(e) => { e.stopPropagation(); openSigning(contract); }}
                      className="text-xs px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-medium">
                      Sign
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 text-sm rounded-md ${currentPage === i + 1 ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== CREATE VIEW (MULTI-STEP) ====================
  const renderCreateView = () => {
    // Step 2: PDF Signature Field Placement
    if (createStep === 2 && createPdfData) {
      return (
        <div className="h-full">
          <PDFSignatureEditor
            pdfData={createPdfData}
            signatureFields={createSignatureFields}
            onFieldsChange={setCreateSignatureFields}
            onConfirm={() => {
              // If there are client signees, auto-send to their accounts
              const hasClientFields = createSignatureFields.some(f => f.type === 'client');

              const contractData = {
                ...createFormData,
                endDate: createFormData.endDate || null,
                status: hasClientFields ? 'Sent' : 'Draft',
                pdfData: createPdfData,
                pdfFileName: createPdfFileName,
                signatureFields: createSignatureFields,
                senderSigned: false,
                clientSigned: false,
              };

              onAddContract(contractData);
              resetCreateFlow();
              if (setActiveView) setActiveView('manage');
            }}
            onBack={() => setCreateStep(1)}
          />
        </div>
      );
    }

    // Step 1: Contract form + PDF upload
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Upload Document</h1>
            <p className="text-sm text-gray-500 mt-1">Upload your contract PDF and fill in the details</p>
          </div>
          <CreateEditForm
            recipients={recipients}
            pdfData={createPdfData}
            pdfFileName={createPdfFileName}
            onPdfUpload={(data, fileName) => {
              setCreatePdfData(data);
              setCreatePdfFileName(fileName);
            }}
            onRemovePdf={() => {
              setCreatePdfData(null);
              setCreatePdfFileName(null);
              setCreateSignatureFields([]);
            }}
            onSave={(data) => {
              if (createPdfData) {
                // Has PDF — go to step 2 for field placement
                setCreateFormData(data);
                setCreateStep(2);
              } else {
                // No PDF — create directly
                const contractData = {
                  ...data,
                  endDate: data.endDate || null,
                  status: 'Draft',
                  pdfData: null,
                  pdfFileName: null,
                  signatureFields: [],
                  senderSigned: false,
                  clientSigned: false,
                };

                onAddContract(contractData);
                resetCreateFlow();
                if (setActiveView) setActiveView('manage');
              }
            }}
            onCancel={() => {
              resetCreateFlow();
              if (setActiveView) setActiveView('manage');
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 min-h-full">
      {renderContent()}

      {/* ==================== MODALS ==================== */}

      {/* Detail Modal */}
      {showDetailModal && selectedContract && (
        <DetailModal
          contract={selectedContract}
          onClose={() => { setShowDetailModal(false); setSelectedContract(null); }}
          onDelete={() => { setShowDetailModal(false); openDelete(selectedContract); }}
          onSign={() => openSigning(selectedContract)}
          onSendToClient={() => handleSendToClient(selectedContract)}
          onSimulateClient={() => handleSimulateClientSignature(selectedContract)}
          simulatingClient={simulatingClient}
          formatDate={formatDate}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedContract && (
        <DeleteModal
          contract={selectedContract}
          onDelete={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

// ==================== CREATE / EDIT FORM WITH PDF UPLOAD ====================
function CreateEditForm({ recipients, pdfData, pdfFileName, onPdfUpload, onRemovePdf, onSave, onCancel }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    clientId: '',
    clientName: '',
    type: 'MSA',
    endDate: '',
    notes: '',
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const client = recipients.find(r => r.id === clientId);
    setForm(prev => ({ ...prev, clientId, clientName: client?.name || client?.company || '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const handleFileSelect = (file) => {
    if (!file || file.type !== 'application/pdf') return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onPdfUpload(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* PDF Upload — prominent at top */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contract PDF</label>
          {pdfData ? (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-sm font-medium text-emerald-900">{pdfFileName}</span>
                  <p className="text-xs text-emerald-600">PDF uploaded successfully</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemovePdf}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                isDragOver ? 'border-gray-900 bg-gray-100 dark:bg-gray-700' : 'border-gray-300 hover:border-gray-400 bg-gray-50 dark:bg-gray-800'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Drop your contract PDF here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Title *</label>
          <input
            required
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:border-gray-400"
            placeholder="e.g. Master Service Agreement"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <select
            required
            value={form.clientId}
            onChange={handleClientChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:border-gray-400"
          >
            <option value="">Select a client</option>
            {recipients.map(r => (
              <option key={r.id} value={r.id}>{r.name || r.company}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none"
            >
              <option value="MSA">MSA</option>
              <option value="SOW">SOW</option>
              <option value="Service Agreement">Service Agreement</option>
              <option value="NDA">NDA</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none resize-none"
            placeholder="Internal notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
            {pdfData ? 'Next: Place Signature Fields' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==================== DETAIL MODAL ====================
function DetailModal({ contract, onClose, onDelete, onSign, onSendToClient, onSimulateClient, simulatingClient, formatDate }) {
  const hasPdf = !!contract.pdfData;
  const hasFields = (contract.signatureFields || []).length > 0;
  const senderSigned = contract.senderSigned;
  const clientSigned = contract.clientSigned;

  // Determine available actions based on contract state
  const getActions = () => {
    const actions = [];

    if (hasPdf && hasFields && !senderSigned) {
      actions.push({ label: 'Sign Contract', action: onSign, style: 'primary' });
    }

    if (senderSigned && !clientSigned && contract.status !== 'Sent') {
      actions.push({ label: 'Send to Client', action: onSendToClient, style: 'primary' });
    }

    if (senderSigned && !clientSigned && contract.status === 'Sent') {
      actions.push({ label: 'Simulate Client Signature', action: onSimulateClient, style: 'primary', loading: simulatingClient });
    }

    return actions;
  };

  const contextActions = getActions();

  // Signature status summary
  const senderFieldCount = (contract.signatureFields || []).filter(f => f.type === 'sender').length;
  const clientFieldCount = (contract.signatureFields || []).filter(f => f.type === 'client').length;
  const senderSignedCount = (contract.signatureFields || []).filter(f => f.type === 'sender' && f.signed).length;
  const clientSignedCount = (contract.signatureFields || []).filter(f => f.type === 'client' && f.signed).length;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold">{contract.title}</h2>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-lg ${TYPE_COLORS[contract.type]}`}>{contract.type}</span>
            </div>
            <p className="text-sm text-gray-500">{contract.clientName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><X className="w-5 h-5" /></button>
        </div>

        {/* Details Grid */}
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-lg ${STATUS_COLORS[contract.status]}`}>
              {contract.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">End Date</p>
            <p className="text-sm">{contract.endDate ? formatDate(contract.endDate) : 'No expiry'}</p>
          </div>
          {contract.pdfFileName && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Document</p>
              <div className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-sm truncate">{contract.pdfFileName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Signature Status — interleaved: signature, date, signature, date */}
        {hasFields && (() => {
          const allFields = contract.signatureFields || [];
          const sigFields = allFields.filter(f => f.fieldType !== 'date');
          const dateFields = [...allFields.filter(f => f.fieldType === 'date')];
          const ordered = [];
          const usedDateIds = new Set();

          for (const sig of sigFields) {
            ordered.push(sig);
            // Find nearest unused date field on the same page
            let nearest = null;
            let minDist = Infinity;
            for (const df of dateFields) {
              if (usedDateIds.has(df.id) || df.page !== sig.page) continue;
              const dx = df.x - sig.x;
              const dy = df.y - sig.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) { minDist = dist; nearest = df; }
            }
            if (nearest) {
              ordered.push(nearest);
              usedDateIds.add(nearest.id);
            }
          }
          // Append any remaining unpaired date fields
          for (const df of dateFields) {
            if (!usedDateIds.has(df.id)) ordered.push(df);
          }

          return (
            <div className="px-5 pb-4">
              <p className="text-xs text-gray-500 mb-2">Signatures</p>
              <div className="space-y-2">
                {ordered.map((field) => (
                  <div key={field.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{field.signee || field.label}</span>
                    <Check className={`w-4 h-4 ${field.signed ? 'text-emerald-500' : 'text-gray-300'}`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Description & Notes */}
        {(contract.description || contract.notes) && (
          <div className="px-5 pb-4 space-y-3">
            {contract.description && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{contract.description}</p>
              </div>
            )}
            {contract.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{contract.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-5 border-t border-gray-200">
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete
          </button>
          <div className="flex items-center gap-3">
            {contextActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                disabled={action.loading}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  action.style === 'primary'
                    ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50'
                    : 'border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {action.loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing...
                  </span>
                ) : action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DELETE MODAL ====================
function DeleteModal({ contract, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-lg border border-gray-200">
        <div className="p-5 text-center">
          <h3 className="text-lg font-semibold mb-2">Delete Contract</h3>
          <p className="text-sm text-gray-500 mb-1">Are you sure you want to delete</p>
          <p className="text-sm font-medium mb-4">"{contract.title}"?</p>
          <p className="text-xs text-gray-400 mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
            <button onClick={onDelete} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractsView;
