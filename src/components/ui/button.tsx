import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button
      {...props}
      style={{
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: 6,
        padding: '8px 18px',
        fontWeight: 600,
        fontSize: 16,
        cursor: 'pointer',
        ...props.style,
      }}
    >
      {children}
    </button>
  );
};
