import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const ActionButton = ({ children, className = '', ...props }: ActionButtonProps) => (
  <button
    {...props}
    className={`px-2 py-1 text-sm font-medium rounded-md active:scale-95 transition-transform duration-100 text-white ${className}`}
    style={{ height: '34px', lineHeight: '1.5' }}
  >
    {children}
  </button>
);

export default ActionButton;
