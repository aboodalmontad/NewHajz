
import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
    const combinedClasses = `rounded-xl shadow-lg ${className}`;
    return (
        <div className={combinedClasses}>
            {children}
        </div>
    );
};
