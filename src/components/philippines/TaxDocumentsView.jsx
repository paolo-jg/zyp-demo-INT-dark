import React, { useState } from 'react';
import { ArrowLeft, FileText, Download, Upload, CheckCircle, Clock, AlertCircle, Search, Filter, Plus, Eye, MoreVertical, Calendar, Building2, Globe } from 'lucide-react';

function TaxDocumentsView({ userData, onBack, embedded = false }) {
  const [activeTab, setActiveTab] = useState('forms');
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy data for tax documents
  const taxForms = [
    {
      id: 1,
      name: 'W-8BEN',
      description: 'Certificate of Foreign Status for US Tax Withholding',
      status: 'pending',
      dueDate: '2026-03-15',
      type: 'Required'
    },
    {
      id: 2,
      name: 'W-8BEN-E',
      description: 'Certificate of Foreign Status for Entity',
      status: 'not_started',
      dueDate: '2026-03-15',
      type: 'Optional'
    },
    {
      id: 3,
      name: 'Certificate of Residence',
      description: 'Tax residency certificate from your home country',
      status: 'completed',
      dueDate: null,
      type: 'Uploaded'
    }
  ];

  const taxHistory = [
    {
      id: 1,
      year: '2025',
      document: 'W-8BEN',
      submittedDate: '2025-02-15',
      expiryDate: '2028-02-15',
      status: 'active'
    },
    {
      id: 2,
      year: '2024',
      document: 'W-8BEN',
      submittedDate: '2024-01-20',
      expiryDate: '2027-01-20',
      status: 'active'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'active':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-1000/20 text-emerald-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-1000/20 text-yellow-700 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'not_started':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-500/20 text-gray-500 rounded-full text-xs font-medium"><AlertCircle className="w-3 h-3" /> Not Started</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-gray-50 dark:bg-gray-800 text-gray-900`}>
      {/* Header */}
      <header className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!embedded && onBack && (
                <>
                  <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                  </button>
                  <div className="h-6 w-px bg-gray-100 dark:bg-gray-700" />
                </>
              )}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none bg-blue-200 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-700" />
                </div>
                <h1 className="text-lg font-semibold">Tax Documents</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-200 border border-blue-500/20 rounded-none">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-700 mb-1">International Tax Compliance</h3>
              <p className="text-sm text-gray-500">As a Philippine-based business receiving payments from US clients, you may need to complete tax forms to ensure proper withholding and compliance.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('forms')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'forms' 
                ? 'border-blue-500 text-blue-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Required Forms
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history' 
                ? 'border-blue-500 text-blue-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Document History
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'certificates' 
                ? 'border-blue-500 text-blue-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Certificates
          </button>
        </div>

        {/* Forms Tab */}
        {activeTab === 'forms' && (
          <div className="space-y-4">
            {taxForms.map((form) => (
              <div
                key={form.id}
                className="p-5 bg-white rounded-none border border-gray-200 hover:border-gray-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 rounded-none bg-blue-1000/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{form.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          form.type === 'Required' ? 'bg-red-1000/20 text-red-700' : 
                          form.type === 'Optional' ? 'bg-gray-500/20 text-gray-500' :
                          'bg-emerald-1000/20 text-emerald-700'
                        }`}>
                          {form.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{form.description}</p>
                      {form.dueDate && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>Due: {form.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(form.status)}
                    <button className="p-2 rounded-none bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {form.status === 'completed' ? <Eye className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Upload Section */}
            <div className="mt-8 p-6 border-2 border-dashed border-gray-200 rounded-none text-center">
              <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <h3 className="font-medium mb-1">Upload Tax Document</h3>
              <p className="text-sm text-gray-500 mb-4">Drag and drop or click to upload certificates and forms</p>
              <button className="px-4 py-2 bg-blue-1000 text-gray-900 rounded-none hover:bg-blue-500 transition-colors text-sm font-medium">
                Choose File
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-none border border-gray-200 overflow-hidden">
            {/* Desktop Table */}
            <table className="w-full hidden md:table">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Year</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Document</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Submitted</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Expires</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {taxHistory.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/30">
                    <td className="px-6 py-4 font-medium">{doc.year}</td>
                    <td className="px-6 py-4">{doc.document}</td>
                    <td className="px-6 py-4 text-gray-500">{doc.submittedDate}</td>
                    <td className="px-6 py-4 text-gray-500">{doc.expiryDate}</td>
                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {taxHistory.map((doc) => (
                <div key={doc.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{doc.document}</p>
                      <p className="text-xs text-gray-500">Tax Year {doc.year}</p>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Submitted {doc.submittedDate}</span>
                    <span className="text-xs text-gray-500">Expires {doc.expiryDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Certificates Yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Tax certificates and compliance documents from your transactions will appear here.
            </p>
            <button className="px-4 py-2 bg-white text-gray-900 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium">
              Request Certificate
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default TaxDocumentsView;
