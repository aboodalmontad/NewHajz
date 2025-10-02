
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({ 
    children, 
    className,
    variant = 'primary', 
    size = 'md',
    ...props 
}) => {
    const baseClasses = 'font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
        primary: 'bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-500',
        secondary: 'bg-slate-600 text-slate-100 hover:bg-slate-500 focus:ring-slate-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizeClasses = {
        sm: 'py-1 px-3 text-sm',
        md: 'py-2 px-4 text-base',
        lg: 'py-3 px-6 text-lg',
        xl: 'py-4 px-8 text-xl',
    };

    const combinedClasses = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
    ].join(' ');

    return (
        <button className={combinedClasses} {...props}>
            {children}
        </button>
    );
};
