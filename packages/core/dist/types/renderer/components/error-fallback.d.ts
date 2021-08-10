import * as React from 'react';
interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}
export declare const ErrorFallback: React.MemoExoticComponent<({ error, resetErrorBoundary }: ErrorFallbackProps) => null>;
export {};
