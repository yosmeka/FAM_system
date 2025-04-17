declare module 'react-hot-toast' {
  import { ReactNode } from 'react';

  export interface ToastOptions {
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    style?: React.CSSProperties;
    className?: string;
    icon?: ReactNode;
    iconTheme?: {
      primary: string;
      secondary: string;
    };
    id?: string;
  }

  export type Toast = (message: ReactNode, options?: ToastOptions) => string;

  export const toast: {
    success: Toast;
    error: Toast;
    loading: Toast;
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      },
      options?: ToastOptions
    ) => Promise<T>;
  };

  export const Toaster: React.FC<{
    position?: ToastOptions['position'];
    toastOptions?: ToastOptions;
    reverseOrder?: boolean;
    gutter?: number;
    containerStyle?: React.CSSProperties;
    containerClassName?: string;
  }>;
} 