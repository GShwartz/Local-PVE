import React from 'react';

export type Variant = 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'cyan' | 'orange';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  blue:   'bg-blue-600 hover:bg-blue-700',
  green:  'bg-emerald-600 hover:bg-emerald-700',
  red:    'bg-red-600 hover:bg-red-700',
  purple: 'bg-violet-600 hover:bg-violet-700',
  yellow: 'bg-amber-500 hover:bg-amber-600',
  cyan:   'bg-sky-600 hover:bg-sky-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
};

// className from outside is intentionally ignored — use variant for colour control
const ActionButton = ({
  children,
  variant = 'blue',
  disabled,
  className: _,
  ...props
}: ActionButtonProps) => {
  const base =
    'inline-flex items-center justify-center px-3 text-xs font-semibold rounded-md transition-colors duration-150 border-0 shadow-sm whitespace-nowrap select-none';

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${base} ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : `text-white ${variantClasses[variant]}`}`}
      style={{ height: '30px' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', lineHeight: 1 }}>
        {children}
      </span>
    </button>
  );
};

export default ActionButton;
