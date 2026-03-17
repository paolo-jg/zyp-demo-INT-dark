import React from 'react';
import { Check } from 'lucide-react';

/**
 * Custom styled checkbox that matches the dark/emerald theme
 */
export function StyledCheckbox({ checked, onChange, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange({ target: { checked: !checked } })}
      className={`flex-shrink-0 ${className}`}
      style={{
        width: '20px',
        height: '20px',
        minWidth: '20px',
        minHeight: '20px',
        borderRadius: '6px',
        border: `2px solid ${checked ? '#10b981' : '#4b5563'}`,
        backgroundColor: checked ? '#10b981' : '#374151',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease-in-out',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
      }}
    >
      {checked && (
        <Check 
          style={{ 
            width: '14px', 
            height: '14px', 
            color: '#111827',
            strokeWidth: 3
          }} 
        />
      )}
    </button>
  );
}

/**
 * Custom styled number input without spinner arrows
 */
export function StyledNumberInput({ 
  value, 
  onChange, 
  placeholder = '', 
  min, 
  max, 
  step = '1',
  className = '',
  disabled = false 
}) {
  const inputStyle = {
    MozAppearance: 'textfield',
    WebkitAppearance: 'none',
    appearance: 'none',
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        // Only allow numbers and decimal point
        const val = e.target.value;
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
          onChange(e);
        }
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={inputStyle}
    />
  );
}

export default { StyledCheckbox, StyledNumberInput };
