import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Input } from './Input';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    label: string;
    initialValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void;

    onCancel: () => void;
    confirmText?: string;
}

export function InputModal({
    isOpen,
    title,
    label,
    initialValue = '',
    placeholder,
    onConfirm,
    onCancel,
    confirmText = 'Save'
}: InputModalProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) setValue(initialValue);
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-bg-primary w-full max-w-sm rounded-xl border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-text-primary">{title}</h3>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-muted">{label}</label>
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onConfirm(value);
                            if (e.key === 'Escape') onCancel();
                        }}
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button variant="primary" onClick={() => onConfirm(value)}>{confirmText}</Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
