import React, { useState, useEffect, useRef } from 'react';
import {
  Edit2, Check, X, AlertTriangle, Building, Shield,
  Upload, Camera, User, MapPin, CreditCard, Trash2
} from 'lucide-react';
import { secureError } from '../../utils/secureLogging';

function ProfileSettings({ user, userData, onUpdateProfile, onDeleteAccount, companyLogo, onLogoChange }) {
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: userData?.first_name || '',
    last_name: userData?.last_name || '',
    business_name: userData?.business_name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    address: userData?.address || '',
    city: userData?.city || '',
    state: userData?.state || '',
    zip: userData?.zip || '',
    bank_name: userData?.bank_name || '',
    account_name: userData?.account_name || '',
    account_number: userData?.account_number || '',
    swift_code: userData?.swift_code || '',
    category: userData?.category || ''
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        business_name: userData.business_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        city: userData.city || '',
        state: userData.state || '',
        zip: userData.zip || '',
        bank_name: userData.bank_name || '',
        account_name: userData.account_name || '',
        account_number: userData.account_number || '',
        swift_code: userData.swift_code || '',
        category: userData.category || ''
      });
    }
  }, [userData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile(formData);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      secureError('Error saving profile:', error);
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      first_name: userData?.first_name || '',
      last_name: userData?.last_name || '',
      business_name: userData?.business_name || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      address: userData?.address || '',
      city: userData?.city || '',
      state: userData?.state || '',
      zip: userData?.zip || '',
      bank_name: userData?.bank_name || '',
      account_name: userData?.account_name || '',
      account_number: userData?.account_number || '',
      swift_code: userData?.swift_code || '',
      category: userData?.category || ''
    });
    setIsEditing(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onLogoChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await onDeleteAccount();
    } catch (error) {
      secureError('Error deleting account:', error);
      setDeleteError('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const isPhilippines = userData?.country === 'Philippines';
  const bankOptions = isPhilippines
    ? ['BDO', 'BPI', 'Metrobank', 'Land Bank', 'UnionBank', 'RCBC', 'PNB', 'Security Bank', 'China Bank', 'GCash', 'Maya']
    : ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'US Bank', 'PNC', 'Capital One', 'TD Bank', 'Truist'];

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  const InputField = ({ label, value, field, placeholder, disabled, type = 'text' }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</label>
      {isEditing && !disabled ? (
        <input
          type={type}
          value={value}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
        />
      ) : (
        <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
          {value || '—'}
          {disabled && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">(Read only)</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold mb-6">Settings</h1>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Left sidebar nav */}
        <div className="w-full md:w-48 flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 border-gray-200 dark:border-gray-700">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2.5 text-sm transition-colors text-left whitespace-nowrap md:w-full ${
                  activeSection === section.id
                    ? 'text-gray-900 dark:text-white font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">

          {/* ==================== PROFILE ==================== */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {/* Logo + Name header */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userData?.business_name || 'Your Business'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{userData?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium capitalize">
                        {userData?.account_type || 'Business'}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium">
                        {userData?.country === 'Philippines' ? 'PH' : 'US'}
                      </span>
                    </div>
                  </div>
                  <div className="sm:ml-auto">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {companyLogo && (
                  <button
                    onClick={() => onLogoChange(null)}
                    className="mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Remove logo
                  </button>
                )}
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
                  <Check className="w-4 h-4" />
                  Profile updated successfully
                </div>
              )}

              {/* Personal Information */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="First Name" value={formData.first_name} field="first_name" />
                  <InputField label="Last Name" value={formData.last_name} field="last_name" />
                  {userData?.account_type === 'business' && (
                    <div className="col-span-2">
                      <InputField label="Business Name" value={formData.business_name} field="business_name" />
                    </div>
                  )}
                  <InputField label="Email" value={formData.email} field="email" disabled />
                  <InputField label="Phone" value={formData.phone} field="phone" placeholder="+63 917 123 4567" />
                  <div className="col-span-2">
                    <InputField label="Industry" value={formData.category} field="category" placeholder="e.g., BPO, Technology" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  {userData?.account_type === 'business' ? 'Business Address' : 'Address'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <InputField
                      label={isPhilippines ? 'Street Address / Barangay' : 'Street Address'}
                      value={formData.address}
                      field="address"
                      placeholder={isPhilippines ? '123 Rizal St, Brgy. San Antonio' : '123 Main St, Suite 100'}
                    />
                  </div>
                  <InputField
                    label={isPhilippines ? 'City / Municipality' : 'City'}
                    value={formData.city}
                    field="city"
                    placeholder={isPhilippines ? 'Makati City' : 'New York'}
                  />
                  <InputField
                    label={isPhilippines ? 'Province' : 'State'}
                    value={formData.state}
                    field="state"
                    placeholder={isPhilippines ? 'Metro Manila' : 'NY'}
                  />
                  <InputField
                    label={isPhilippines ? 'Postal Code' : 'ZIP Code'}
                    value={formData.zip}
                    field="zip"
                    placeholder={isPhilippines ? '1200' : '10001'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== BANKING ==================== */}
          {activeSection === 'banking' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Banking Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Bank Name</label>
                    {isEditing ? (
                      <select
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                      >
                        <option value="">Select a bank...</option>
                        {bankOptions.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                        {formData.bank_name || '—'}
                      </div>
                    )}
                  </div>
                  <InputField label="Account Name" value={formData.account_name} field="account_name" placeholder="Name on bank account" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Account Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                      />
                    ) : (
                      <div className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                        {formData.account_number ? `•••• ${formData.account_number.slice(-4)}` : '—'}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <InputField label="SWIFT Code" value={formData.swift_code} field="swift_code" placeholder="e.g., BNORPHMM" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Banking Info
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Bank-level Security</p>
                  <p className="text-sm text-blue-600 mt-0.5">Your banking information is encrypted and stored securely.</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ACCOUNT ==================== */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              {/* Account Info */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Account Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Account Type</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{userData?.account_type || 'Business'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">Country</span>
                    <span className="font-medium text-gray-900 dark:text-white">{userData?.country || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">KYC Status</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium capitalize">
                      {userData?.kyc_status || 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500 dark:text-gray-400">Receiving Currency</span>
                    <span className="font-medium text-gray-900 dark:text-white">{userData?.receiving_currency || 'PHP'}</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Permanently delete your account and all associated data. This cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm text-gray-600 dark:text-gray-300">
                      Type <span className="font-mono text-red-700 dark:text-red-400 font-semibold">DELETE</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    />
                    {deleteError && (
                      <p className="text-sm text-red-700">{deleteError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(''); }}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText.toUpperCase() !== 'DELETE' || isDeleting}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                          deleteConfirmText.toUpperCase() === 'DELETE' && !isDeleting
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isDeleting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Delete Forever
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
