import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, children, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label className="text-sm font-medium text-text-secondary">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "flex h-10 w-full appearance-none rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary",
                            "focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                </div>
            </div>
        );
    }
);
