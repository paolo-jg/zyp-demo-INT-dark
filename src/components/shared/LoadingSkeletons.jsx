// Loading skeleton components for better perceived performance
import React from 'react';

// Base skeleton with shimmer animation
export function Skeleton({ className = '', width, height, rounded = 'md' }) {
  const roundedClass = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-lg',
    full: 'rounded-full',
  }[rounded] || 'rounded-md';
  
  return (
    <div
      className={`skeleton-shimmer bg-gray-100 dark:bg-gray-700 ${roundedClass} ${className}`}
      style={{ width, height }}
    />
  );
}

// Text line skeleton
export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 && lines > 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ size = 'md' }) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size] || 'w-10 h-10';
  
  return <Skeleton className={sizeClass} rounded="full" />;
}

// Card skeleton
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4" width={i === 0 ? '60%' : '80%'} />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton
export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Dashboard stats skeleton
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-4">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// Transaction/Invoice list item skeleton
export function SkeletonListItem() {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" rounded="full" />
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// List skeleton
export function SkeletonList({ count = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

// Home dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32" rounded="lg" />
      </div>
      
      {/* Stats */}
      <SkeletonStats count={4} />
      
      {/* Recent activity */}
      <div>
        <Skeleton className="h-5 w-32 mb-4" />
        <SkeletonList count={3} />
      </div>
    </div>
  );
}

// Recipients skeleton
export function RecipientsSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-36" rounded="lg" />
      </div>
      
      {/* Search */}
      <Skeleton className="h-10 w-full max-w-md" rounded="lg" />
      
      {/* List */}
      <SkeletonList count={5} />
    </div>
  );
}

// Invoices skeleton
export function InvoicesSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-36" rounded="lg" />
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" rounded="lg" />
        <Skeleton className="h-8 w-20" rounded="lg" />
        <Skeleton className="h-8 w-20" rounded="lg" />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={5} columns={6} />
    </div>
  );
}

// Transfer history skeleton
export function TransferHistorySkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-28" rounded="lg" />
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" rounded="lg" />
        <Skeleton className="h-10 w-32" rounded="lg" />
      </div>
      
      {/* Table */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

// Settings skeleton
export function SettingsSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <Skeleton className="h-6 w-32 mb-6" />
      
      {/* Profile section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <SkeletonAvatar size="xl" />
          <div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-10 w-full" rounded="lg" />
          </div>
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-10 w-full" rounded="lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile card skeleton (for responsive tables)
export function MobileCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16" rounded="full" />
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Mobile list skeleton
export function MobileListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <MobileCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonTableRow,
  SkeletonStats,
  SkeletonList,
  SkeletonListItem,
  DashboardSkeleton,
  RecipientsSkeleton,
  InvoicesSkeleton,
  TransferHistorySkeleton,
  SettingsSkeleton,
  MobileCardSkeleton,
  MobileListSkeleton,
};
