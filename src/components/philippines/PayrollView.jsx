import React, { useState } from 'react';
import { ArrowLeft, DollarSign, Users, Plus, Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, Download, MoreVertical, Building2, Wallet, CreditCard, ChevronRight } from 'lucide-react';

function PayrollView({ userData, onBack, embedded = false }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Dummy data
  const employees = [
    {
      id: 1,
      name: 'Maria Santos',
      role: 'Senior Developer',
      email: 'maria@company.com',
      salary: 75000,
      frequency: 'Monthly',
      status: 'active',
      lastPaid: '2025-12-31'
    },
    {
      id: 2,
      name: 'Juan Cruz',
      role: 'Project Manager',
      email: 'juan@company.com',
      salary: 85000,
      frequency: 'Monthly',
      status: 'active',
      lastPaid: '2025-12-31'
    },
    {
      id: 3,
      name: 'Ana Reyes',
      role: 'UI Designer',
      email: 'ana@company.com',
      salary: 65000,
      frequency: 'Monthly',
      status: 'pending',
      lastPaid: null
    }
  ];

  const payrollHistory = [
    {
      id: 1,
      period: 'December 2025',
      employees: 2,
      totalAmount: 160000,
      status: 'completed',
      paidDate: '2025-12-31'
    },
    {
      id: 2,
      period: 'November 2025',
      employees: 2,
      totalAmount: 160000,
      status: 'completed',
      paidDate: '2025-11-30'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-1000/20 text-emerald-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> {status === 'active' ? 'Active' : 'Paid'}</span>;
      case 'pending':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-1000/20 text-yellow-700 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> Pending</span>;
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
                <div className="w-8 h-8 rounded-none bg-purple-200 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-purple-700" />
                </div>
                <h1 className="text-lg font-semibold">Payroll</h1>
              </div>
            </div>
            <button
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Employee</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white rounded-none border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">{employees.length}</p>
            <p className="text-xs text-gray-500 mt-1">{employees.filter(e => e.status === 'active').length} active</p>
          </div>
          
          <div className="p-4 bg-white rounded-none border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Wallet className="w-4 h-4" />
              <span>Monthly Payroll</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">₱{employees.reduce((sum, e) => sum + e.salary, 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total salaries</p>
          </div>
          
          <div className="p-4 bg-white rounded-none border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Calendar className="w-4 h-4" />
              <span>Next Payroll</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">Jan 31</p>
            <p className="text-xs text-gray-500 mt-1">In 9 days</p>
          </div>
          
          <div className="p-4 bg-white rounded-none border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <TrendingUp className="w-4 h-4" />
              <span>YTD Payroll</span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold">₱320K</p>
            <p className="text-xs text-emerald-700 mt-1">2 cycles completed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview' 
                ? 'border-purple-500 text-purple-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history' 
                ? 'border-purple-500 text-purple-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payroll History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings' 
                ? 'border-purple-500 text-purple-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Employees Tab */}
        {activeTab === 'overview' && (
          <>
            {employees.length > 0 ? (
              <div className="bg-white rounded-none border border-gray-200 overflow-hidden">
                {/* Desktop Table */}
                <table className="w-full hidden md:table">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Employee</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Role</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Salary</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Frequency</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-1000/20 flex items-center justify-center">
                              <span className="text-purple-700 font-semibold">{employee.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{employee.role}</td>
                        <td className="px-6 py-4 font-medium">₱{employee.salary.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500">{employee.frequency}</td>
                        <td className="px-6 py-4">{getStatusBadge(employee.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <div key={employee.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-1000/20 flex items-center justify-center">
                            <span className="text-purple-700 font-semibold">{employee.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.role}</p>
                          </div>
                        </div>
                        {getStatusBadge(employee.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm pl-[52px]">
                        <span className="text-gray-500">{employee.frequency}</span>
                        <span className="font-medium">₱{employee.salary.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-none border border-gray-200">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Employees Yet</h3>
                <p className="text-gray-500 text-sm mb-6">Add your first employee to start managing payroll</p>
                <button
                  onClick={() => setShowAddEmployee(true)}
                  className="px-4 py-2 bg-purple-1000 text-gray-900 rounded-none hover:bg-purple-500 transition-colors text-sm font-medium"
                >
                  Add Employee
                </button>
              </div>
            )}

            {/* Quick Action Card */}
            <div className="mt-6 p-4 md:p-5 bg-purple-200 border border-purple-500/20 rounded-none">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-none bg-purple-1000/20 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Run January Payroll</h3>
                    <p className="text-sm text-gray-500">Process payments for {employees.filter(e => e.status === 'active').length} active employees</p>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-1000 text-gray-900 rounded-none hover:bg-purple-500 transition-colors text-sm font-medium">
                  Run Payroll <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-none border border-gray-200 overflow-hidden">
            {payrollHistory.length > 0 ? (
              <>
                {/* Desktop Table */}
                <table className="w-full hidden md:table">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Period</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Employees</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Total Amount</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Paid Date</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {payrollHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/30">
                        <td className="px-6 py-4 font-medium">{record.period}</td>
                        <td className="px-6 py-4 text-gray-500">{record.employees}</td>
                        <td className="px-6 py-4 font-medium">₱{record.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-500">{record.paidDate}</td>
                        <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
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
                  {payrollHistory.map((record) => (
                    <div key={record.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{record.period}</p>
                          <p className="text-xs text-gray-500">{record.employees} employees</p>
                        </div>
                        {getStatusBadge(record.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{record.paidDate}</span>
                        <span className="font-medium">₱{record.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Payroll History</h3>
                <p className="text-gray-500 text-sm">Your payroll history will appear here after running your first payroll</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-none border border-gray-200">
              <h3 className="font-semibold mb-4">Payroll Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Pay Frequency</label>
                  <select className="w-full p-3 bg-white border border-gray-600 rounded-none text-gray-900">
                    <option>Monthly</option>
                    <option>Semi-monthly</option>
                    <option>Bi-weekly</option>
                    <option>Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Pay Day</label>
                  <select className="w-full p-3 bg-white border border-gray-600 rounded-none text-gray-900">
                    <option>Last day of month</option>
                    <option>15th of month</option>
                    <option>1st of month</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-none border border-gray-200">
              <h3 className="font-semibold mb-4">Payment Method</h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-none">
                <div className="w-12 h-12 rounded-none bg-emerald-1000/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Bank Transfer via Zyp</p>
                  <p className="text-sm text-gray-500">Funds will be sent via Zyp's payment rails</p>
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-700" />
              </div>
            </div>

            <button className="w-full py-3 bg-purple-1000 text-gray-900 rounded-none hover:bg-purple-500 transition-colors font-medium">
              Save Settings
            </button>
          </div>
        )}
      </main>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-none border border-gray-200 w-full max-w-md">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Add Employee</h2>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">Full Name</label>
                <input type="text" className="w-full p-3 bg-white border border-gray-600 rounded-none text-gray-900" placeholder="Enter name" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">Email</label>
                <input type="email" className="w-full p-3 bg-white border border-gray-600 rounded-none text-gray-900" placeholder="Enter email" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">Role</label>
                <input type="text" className="w-full p-3 bg-white border border-gray-600 rounded-none text-gray-900" placeholder="Enter role" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">Monthly Salary (PHP)</label>
                <input type="number" className="w-full p-3 bg-white border border-gray-600 rounded-none text-gray-900" placeholder="0" />
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAddEmployee(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 rounded-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-3 bg-purple-1000 text-gray-900 rounded-none hover:bg-purple-500 transition-colors">
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayrollView;
