import type { CSSProperties, ReactNode } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: {
        className?: string;
        style?: CSSProperties;
        children?: ReactNode;
        [key: string]: unknown;
      };
    }
  }
}

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
} 