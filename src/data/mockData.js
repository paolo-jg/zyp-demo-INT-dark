// Mock data for Zyp Philippines demo — no backend required

export const MOCK_USER = {
  id: 'demo-user-001',
  email: 'carlos@riverabpo.ph',
  user_metadata: {
    firstName: 'Carlos',
    lastName: 'Rivera',
  },
};

export const MOCK_USER_DATA = {
  id: 'demo-user-001',
  email: 'carlos@riverabpo.ph',
  first_name: 'Carlos',
  last_name: 'Rivera',
  business_name: 'Rivera Business Solutions',
  phone: '639171234567',
  account_type: 'business',
  country: 'Philippines',
  address: '28F Ayala Tower One, Ayala Ave',
  city: 'Makati',
  state: '00',
  zip: '1226',
  bank_name: 'BDO Unibank',
  account_name: 'Rivera Business Solutions Inc',
  account_number: '006720123456',
  swift_code: 'BNORPHMM',
  receiving_currency: 'PHP',
  kyc_status: 'completed',
  verification_status: 'verified',
  onboarding_completed: true,
  team_role: 'owner',
  monthly_volume: '50k_100k',
  is_suspended: false,
  created_at: '2025-09-15T09:45:00.000Z',
  updated_at: '2026-02-10T08:15:00.000Z',
};

export const MOCK_RECIPIENTS = [
  {
    id: 'rec-001',
    zypUserId: 'demo-user-001',
    type: 'bank',
    name: 'Acme Staffing Corp',
    company: 'Acme Staffing Corp',
    email: 'ap@acmestaffing.com',
    phone: '14155550101',
    bankName: 'BPI (Bank of the Philippine Islands)',
    bank: 'BPI (Bank of the Philippine Islands)',
    accountName: 'Acme Staffing Corp',
    accountNumber: '3109876543',
    swiftCode: 'BPIAPHM1',
    country: 'United States',
    receivingCurrency: 'USD',
    verificationStatus: 'verified',
    totalSent: 42000.0,
    transactionCount: 6,
    lastPayment: '2026-02-08T15:30:00.000Z',
    tags: ['vip'],
    notes: 'US-based staffing partner',
    created_at: '2025-10-05T12:00:00.000Z',
  },
  {
    id: 'rec-002',
    zypUserId: 'demo-user-001',
    type: 'bank',
    name: 'Maria Santos',
    company: 'Santos Design Studio',
    email: 'maria@santosdesign.ph',
    phone: '639178888888',
    bankName: 'Metrobank',
    bank: 'Metrobank',
    accountName: 'Santos Design Studio',
    accountNumber: '2276543210',
    country: 'Philippines',
    receivingCurrency: 'PHP',
    verificationStatus: 'verified',
    totalSent: 15500.0,
    transactionCount: 4,
    lastPayment: '2026-02-05T10:15:00.000Z',
    tags: ['freelancer'],
    notes: 'Graphic design contractor',
    created_at: '2025-11-20T14:30:00.000Z',
  },
  {
    id: 'rec-003',
    zypUserId: 'demo-user-001',
    type: 'bank',
    name: 'TechBridge Solutions',
    company: 'TechBridge Solutions Inc',
    email: 'finance@techbridge.ph',
    phone: '639209876543',
    bankName: 'UnionBank',
    bank: 'UnionBank',
    accountName: 'TechBridge Solutions Inc',
    accountNumber: '1094321098',
    country: 'Philippines',
    receivingCurrency: 'PHP',
    verificationStatus: 'verified',
    totalSent: 28750.0,
    transactionCount: 5,
    lastPayment: '2026-02-10T09:00:00.000Z',
    tags: ['vendor'],
    notes: 'IT infrastructure vendor',
    created_at: '2025-10-12T08:00:00.000Z',
  },
];

export const MOCK_INVOICES = [
  {
    id: 'inv-001',
    zyp_id: 'ZYP-202602-000101',
    invoiceNumber: 'INV-2026-0101',
    date: '01/15/2026',
    dueDate: '02/15/2026',
    direction: 'sent',
    type: 'Receivable',
    status: 'paid',
    businessName: 'Acme Staffing Corp',
    senderName: 'Rivera Business Solutions',
    senderEmail: 'carlos@riverabpo.ph',
    amount: '$8,000.00',
    currency: 'USD',
    pdf: 'has-pdf',
    invoiceData: {
      lineItems: [
        { description: 'Customer Support Team — January 2026', quantity: 1, rate: 6000, amount: 6000 },
        { description: 'QA Analysts — January 2026', quantity: 1, rate: 2000, amount: 2000 },
      ],
      subtotal: 8000,
      tax: 0,
      discount: 0,
      serviceCharge: 0,
      notes: 'Net 30 payment terms',
      title: 'Monthly BPO Services',
      isRecurring: true,
      recurringFrequency: 'monthly',
      total: 8000,
      customer: 'Acme Staffing Corp',
      sender: 'Rivera Business Solutions',
    },
    created_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'inv-002',
    zyp_id: 'ZYP-202602-000102',
    invoiceNumber: 'INV-2026-0102',
    date: '02/01/2026',
    dueDate: '03/01/2026',
    direction: 'sent',
    type: 'Receivable',
    status: 'sent',
    businessName: 'Acme Staffing Corp',
    senderName: 'Rivera Business Solutions',
    senderEmail: 'carlos@riverabpo.ph',
    amount: '$8,000.00',
    currency: 'USD',
    pdf: 'has-pdf',
    invoiceData: {
      lineItems: [
        { description: 'Customer Support Team — February 2026', quantity: 1, rate: 6000, amount: 6000 },
        { description: 'QA Analysts — February 2026', quantity: 1, rate: 2000, amount: 2000 },
      ],
      subtotal: 8000,
      tax: 0,
      discount: 0,
      serviceCharge: 0,
      notes: 'Net 30 payment terms',
      title: 'Monthly BPO Services',
      isRecurring: true,
      recurringFrequency: 'monthly',
      total: 8000,
      customer: 'Acme Staffing Corp',
      sender: 'Rivera Business Solutions',
    },
    created_at: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'inv-003',
    zyp_id: 'ZYP-202602-000103',
    invoiceNumber: 'INV-2026-0103',
    date: '01/20/2026',
    dueDate: '02/20/2026',
    direction: 'sent',
    type: 'Receivable',
    status: 'sent',
    businessName: 'Santos Design Studio',
    senderName: 'Rivera Business Solutions',
    senderEmail: 'carlos@riverabpo.ph',
    amount: '$2,500.00',
    currency: 'USD',
    pdf: 'has-pdf',
    invoiceData: {
      lineItems: [
        { description: 'Brand Identity Package', quantity: 1, rate: 1500, amount: 1500 },
        { description: 'Social Media Templates (20)', quantity: 1, rate: 1000, amount: 1000 },
      ],
      subtotal: 2500,
      tax: 0,
      discount: 0,
      serviceCharge: 0,
      notes: 'Due upon completion',
      title: 'Design Services',
      isRecurring: false,
      total: 2500,
      customer: 'Santos Design Studio',
      sender: 'Rivera Business Solutions',
    },
    created_at: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'inv-004',
    zyp_id: 'ZYP-202602-000104',
    invoiceNumber: 'INV-2026-0104',
    date: '02/05/2026',
    dueDate: '03/05/2026',
    direction: 'sent',
    type: 'Receivable',
    status: 'sent',
    businessName: 'TechBridge Solutions Inc',
    senderName: 'Rivera Business Solutions',
    senderEmail: 'carlos@riverabpo.ph',
    amount: '$4,200.00',
    currency: 'USD',
    pdf: 'has-pdf',
    invoiceData: {
      lineItems: [
        { description: 'Cloud Hosting — Q1 2026', quantity: 1, rate: 2400, amount: 2400 },
        { description: 'Network Maintenance', quantity: 1, rate: 1800, amount: 1800 },
      ],
      subtotal: 4200,
      tax: 0,
      discount: 0,
      serviceCharge: 0,
      notes: 'Quarterly infrastructure billing',
      title: 'IT Infrastructure',
      isRecurring: true,
      recurringFrequency: 'quarterly',
      total: 4200,
      customer: 'TechBridge Solutions Inc',
      sender: 'Rivera Business Solutions',
    },
    created_at: '2026-02-05T09:00:00.000Z',
  },
];

export const MOCK_STATUS_LOGS = {
  'INV-2026-0101': [
    { status: 'Sent', date: '1/15/2026, 10:00:00 AM', updatedBy: 'System' },
    { status: 'Viewed', date: '1/16/2026, 9:30:00 AM', updatedBy: 'System' },
    { status: 'Paid', date: '1/28/2026, 2:15:00 PM', updatedBy: 'Acme Staffing Corp' },
  ],
  'INV-2026-0102': [
    { status: 'Sent', date: '2/1/2026, 10:00:00 AM', updatedBy: 'System' },
  ],
  'INV-2026-0103': [
    { status: 'Sent', date: '1/20/2026, 8:00:00 AM', updatedBy: 'System' },
    { status: 'Viewed', date: '1/22/2026, 11:45:00 AM', updatedBy: 'System' },
  ],
  'INV-2026-0104': [
    { status: 'Sent', date: '2/5/2026, 9:00:00 AM', updatedBy: 'System' },
  ],
};

export const MOCK_TRANSACTIONS = [
  {
    id: 'txn-001',
    type: 'Received',
    direction: 'received',
    senderName: 'Acme Staffing Corp',
    senderEmail: 'ap@acmestaffing.com',
    recipientName: 'Rivera Business Solutions',
    recipient: 'Acme Staffing Corp',
    amount: 8000.0,
    fee: 40.0,
    feePercentage: 0.5,
    amountReceived: 449174.4,
    exchangeRate: 56.1468,
    receivingCurrency: 'PHP',
    status: 'completed',
    date: '2026-01-28',
    description: 'Invoice INV-2026-0101 Payment',
    reference: 'INV-2026-0101',
  },
  {
    id: 'txn-002',
    type: 'Received',
    direction: 'received',
    senderName: 'Acme Staffing Corp',
    senderEmail: 'ap@acmestaffing.com',
    recipientName: 'Rivera Business Solutions',
    recipient: 'Acme Staffing Corp',
    amount: 8000.0,
    fee: 40.0,
    feePercentage: 0.5,
    amountReceived: 448640.0,
    exchangeRate: 56.08,
    receivingCurrency: 'PHP',
    status: 'completed',
    date: '2025-12-29',
    description: 'Invoice INV-2025-0098 Payment',
    reference: 'INV-2025-0098',
  },
  {
    id: 'txn-003',
    type: 'Received',
    direction: 'received',
    senderName: 'Santos Design Studio',
    senderEmail: 'maria@santosdesign.ph',
    recipientName: 'Rivera Business Solutions',
    recipient: 'Santos Design Studio',
    amount: 3500.0,
    fee: 17.5,
    feePercentage: 0.5,
    amountReceived: 196213.15,
    exchangeRate: 56.0609,
    receivingCurrency: 'PHP',
    status: 'completed',
    date: '2026-02-05',
    description: 'Freelance design work',
  },
  {
    id: 'txn-004',
    type: 'Received',
    direction: 'received',
    senderName: 'TechBridge Solutions Inc',
    senderEmail: 'finance@techbridge.ph',
    recipientName: 'Rivera Business Solutions',
    recipient: 'TechBridge Solutions Inc',
    amount: 4200.0,
    fee: 21.0,
    feePercentage: 0.5,
    amountReceived: 235173.0,
    exchangeRate: 56.0412,
    receivingCurrency: 'PHP',
    status: 'completed',
    date: '2026-02-10',
    description: 'Infrastructure services — Q4 2025',
  },
  {
    id: 'txn-005',
    type: 'Received',
    direction: 'received',
    senderName: 'Acme Staffing Corp',
    senderEmail: 'ap@acmestaffing.com',
    recipientName: 'Rivera Business Solutions',
    recipient: 'Acme Staffing Corp',
    amount: 7500.0,
    fee: 37.5,
    feePercentage: 0.5,
    amountReceived: 420420.0,
    exchangeRate: 56.056,
    receivingCurrency: 'PHP',
    status: 'completed',
    date: '2025-11-30',
    description: 'Invoice INV-2025-0091 Payment',
    reference: 'INV-2025-0091',
  },
];

// ---- Local CRUD helpers (operate on React state, no Supabase) ----

let invoiceCounter = 105;

export function createAddInvoice(setInvoices, setStatusLogs) {
  return async (invoiceData) => {
    invoiceCounter++;
    const num = `INV-2026-0${invoiceCounter}`;
    const newInvoice = {
      id: `inv-${Date.now()}`,
      zyp_id: `ZYP-202602-000${invoiceCounter}`,
      invoiceNumber: num,
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      direction: 'sent',
      type: 'Receivable',
      status: 'sent',
      businessName: invoiceData.businessName || invoiceData.customer || 'Client',
      senderName: 'Rivera Business Solutions',
      senderEmail: 'carlos@riverabpo.ph',
      amount: invoiceData.amount || '$0.00',
      currency: 'USD',
      pdf: 'has-pdf',
      invoiceData: invoiceData.invoiceData || invoiceData,
      created_at: new Date().toISOString(),
    };
    setInvoices((prev) => [newInvoice, ...prev]);
    setStatusLogs((prev) => ({
      ...prev,
      [num]: [{ status: 'Sent', date: new Date().toLocaleString(), updatedBy: 'System' }],
    }));
    return newInvoice;
  };
}

export function createUpdateStatus(setStatusLogs) {
  return async (invoiceNumber, newStatus) => {
    setStatusLogs((prev) => ({
      ...prev,
      [invoiceNumber]: [
        ...(prev[invoiceNumber] || []),
        { status: newStatus, date: new Date().toLocaleString(), updatedBy: 'Demo User' },
      ],
    }));
  };
}

export function createUpdateProfile() {
  return async (updates) => {
    // No-op in demo — profile changes won't persist
    console.log('Demo: profile update', updates);
  };
}

export function createDeleteAccount() {
  return async () => {
    console.log('Demo: delete account (no-op)');
  };
}

// ---- Contracts Mock Data ----

export const MOCK_CONTRACTS = [
  {
    id: 'ctr-001',
    title: 'Master Services Agreement',
    clientId: 'rec-001',
    clientName: 'Acme Staffing Corp',
    type: 'MSA',
    status: 'Active',
    value: 120000,
    startDate: '2025-10-01',
    endDate: '2026-09-30',
    signedDate: '2025-09-28',
    renewalDate: '2026-08-30',
    autoRenew: true,
    description: 'Ongoing BPO customer support services agreement',
    notes: '12-month term, auto-renews annually',
    pdfData: null,
    pdfFileName: 'MSA_AcmeStaffing_2025.pdf',
    signatureFields: [],
    senderSigned: true,
    clientSigned: true,
    documents: [
      { id: 'doc-001', name: 'MSA_AcmeStaffing_2025.pdf', size: '2.4 MB', uploadedAt: '2025-09-28' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2025-09-15', updatedBy: 'Carlos Rivera' },
      { status: 'Sent', date: '2025-09-20', updatedBy: 'Carlos Rivera' },
      { status: 'Signed', date: '2025-09-28', updatedBy: 'Acme Staffing Corp' },
      { status: 'Active', date: '2025-10-01', updatedBy: 'System' },
    ],
    created_at: '2025-09-15T10:00:00.000Z',
  },
  {
    id: 'ctr-002',
    title: 'Statement of Work — Q1 2026',
    clientId: 'rec-001',
    clientName: 'Acme Staffing Corp',
    type: 'SOW',
    status: 'Sent',
    value: 24000,
    startDate: '2026-01-15',
    endDate: '2026-04-15',
    signedDate: null,
    renewalDate: null,
    autoRenew: false,
    description: 'Q1 2026 QA team expansion — 4 additional analysts',
    notes: 'Pending client signature',
    pdfData: null,
    pdfFileName: 'SOW_Q1_2026_QA_Expansion.pdf',
    signatureFields: [],
    senderSigned: true,
    clientSigned: false,
    documents: [
      { id: 'doc-002', name: 'SOW_Q1_2026_QA_Expansion.pdf', size: '1.1 MB', uploadedAt: '2026-01-10' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-01-05', updatedBy: 'Carlos Rivera' },
      { status: 'Sent', date: '2026-01-10', updatedBy: 'Carlos Rivera' },
    ],
    created_at: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'ctr-003',
    title: 'Non-Disclosure Agreement',
    clientId: 'rec-003',
    clientName: 'TechBridge Solutions Inc',
    type: 'NDA',
    status: 'Active',
    value: null,
    startDate: '2025-11-01',
    endDate: null,
    signedDate: '2025-10-30',
    renewalDate: null,
    autoRenew: false,
    description: 'Mutual NDA for data handling and IT infrastructure access',
    notes: 'Perpetual agreement, no expiry',
    pdfData: null,
    pdfFileName: 'NDA_TechBridge_2025.pdf',
    signatureFields: [],
    senderSigned: true,
    clientSigned: true,
    documents: [
      { id: 'doc-003', name: 'NDA_TechBridge_2025.pdf', size: '890 KB', uploadedAt: '2025-10-30' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2025-10-20', updatedBy: 'Carlos Rivera' },
      { status: 'Sent', date: '2025-10-25', updatedBy: 'Carlos Rivera' },
      { status: 'Signed', date: '2025-10-30', updatedBy: 'TechBridge Solutions Inc' },
      { status: 'Active', date: '2025-11-01', updatedBy: 'System' },
    ],
    created_at: '2025-10-20T14:00:00.000Z',
  },
  {
    id: 'ctr-004',
    title: 'Service Agreement 2025',
    clientId: 'rec-003',
    clientName: 'TechBridge Solutions Inc',
    type: 'Service Agreement',
    status: 'Expired',
    value: 85000,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    signedDate: '2024-12-28',
    renewalDate: '2025-12-01',
    autoRenew: false,
    description: 'Annual IT infrastructure and hosting services',
    notes: 'Expired — renewal under negotiation',
    pdfData: null,
    pdfFileName: 'ServiceAgreement_TechBridge_2025.pdf',
    signatureFields: [],
    senderSigned: true,
    clientSigned: true,
    documents: [
      { id: 'doc-004', name: 'ServiceAgreement_TechBridge_2025.pdf', size: '3.1 MB', uploadedAt: '2024-12-28' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2024-12-15', updatedBy: 'Carlos Rivera' },
      { status: 'Sent', date: '2024-12-20', updatedBy: 'Carlos Rivera' },
      { status: 'Signed', date: '2024-12-28', updatedBy: 'TechBridge Solutions Inc' },
      { status: 'Active', date: '2025-01-01', updatedBy: 'System' },
      { status: 'Expired', date: '2025-12-31', updatedBy: 'System' },
    ],
    created_at: '2024-12-15T08:00:00.000Z',
  },
  {
    id: 'ctr-005',
    title: 'Design Services Contract',
    clientId: 'rec-002',
    clientName: 'Santos Design Studio',
    type: 'Service Agreement',
    status: 'Draft',
    value: 15000,
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    signedDate: null,
    renewalDate: null,
    autoRenew: false,
    description: 'Brand refresh and marketing collateral design',
    notes: 'Awaiting internal review before sending',
    pdfData: null,
    pdfFileName: null,
    signatureFields: [],
    senderSigned: false,
    clientSigned: false,
    documents: [],
    statusHistory: [
      { status: 'Draft', date: '2026-02-10', updatedBy: 'Carlos Rivera' },
    ],
    created_at: '2026-02-10T11:00:00.000Z',
  },
];

let contractCounter = 6;

export function createAddContract(setContracts) {
  return (contractData) => {
    contractCounter++;
    const newContract = {
      id: `ctr-${String(contractCounter).padStart(3, '0')}`,
      pdfData: null,
      pdfFileName: null,
      signatureFields: [],
      senderSigned: false,
      clientSigned: false,
      ...contractData,
      statusHistory: [
        { status: 'Draft', date: new Date().toISOString().split('T')[0], updatedBy: 'Carlos Rivera' },
      ],
      documents: contractData.documents || [],
      created_at: new Date().toISOString(),
    };
    setContracts((prev) => [newContract, ...prev]);
    return newContract;
  };
}

export function createUpdateContract(setContracts) {
  return (contractId, updates) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, ...updates } : c))
    );
  };
}

export function createDeleteContract(setContracts) {
  return (contractId) => {
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
  };
}
