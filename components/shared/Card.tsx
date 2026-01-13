
import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
    const combinedClasses = `rounded-xl shadow-lg ${className}`;
    return (
        <div className={combinedClasses} onClick={onClick}>
            {children}
        </div>
    );
};
