import * as React from 'react';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, id, ...props }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onCheckedChange(e.target.checked)}
        id={id}
        style={{ display: 'none' }}
        {...props}
      />
      <span
        style={{
          width: 38,
          height: 22,
          background: checked ? '#2563eb' : '#e5e7eb',
          borderRadius: 12,
          position: 'relative',
          transition: 'background 0.2s',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 18 : 3,
            width: 16,
            height: 16,
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }}
        />
      </span>
    </label>
  );
};
