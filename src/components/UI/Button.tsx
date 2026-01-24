import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:pointer-events-none",

                    // Variants
                    variant === 'primary' && "bg-gradient-to-br from-accent-primary to-orange-600 text-white hover:shadow-lg hover:shadow-accent-primary/20 active:scale-95",
                    variant === 'secondary' && "bg-bg-secondary border border-border hover:bg-bg-input hover:border-accent-primary/50 text-text-primary",
                    variant === 'outline' && "border-2 border-accent-primary text-accent-primary hover:bg-accent-primary/10",
                    variant === 'ghost' && "hover:bg-white/5 text-text-secondary hover:text-text-primary",

                    // Sizes
                    size === 'sm' && "h-8 px-3 text-xs",
                    size === 'md' && "h-10 px-4 py-2",
                    size === 'lg' && "h-12 px-6 text-lg",

                    className
                )}
                {...props}
            />
        );
    }
);
