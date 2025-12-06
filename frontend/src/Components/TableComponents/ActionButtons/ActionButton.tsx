import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'cyan';
}

const ActionButton = ({ children, variant = 'blue', disabled, ...props }: ActionButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border border-transparent shadow-lg transform hover:scale-[1.02] active:scale-[0.98] text-white";

  const gradients = {
    blue: 'linear-gradient(to right, rgb(37, 99, 235), rgb(147, 51, 234))',
    green: 'linear-gradient(to right, rgb(37, 99, 235), rgb(147, 51, 234))',
    red: 'linear-gradient(to right, rgb(220, 38, 38), rgb(219, 39, 119))', // Keep red for Remove button
    purple: 'linear-gradient(to right, rgb(37, 99, 235), rgb(147, 51, 234))',
    yellow: 'linear-gradient(to right, rgb(37, 99, 235), rgb(147, 51, 234))',
    cyan: 'linear-gradient(to right, rgb(37, 99, 235), rgb(147, 51, 234))',
  };

  const disabledStyle = {
    background: 'rgba(55, 65, 81, 0.5)',
    cursor: 'not-allowed',
    opacity: 0.7,
    color: 'rgb(156, 163, 175)',
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={baseClasses}
      style={{
        height: '34px',
        minWidth: '80px',
        ...(disabled ? disabledStyle : { backgroundImage: gradients[variant] }),
      }}
    >
      {children}
    </button>
  );
};

export default ActionButton;