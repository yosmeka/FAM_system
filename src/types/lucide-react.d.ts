declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
  export const ArrowLeft: ComponentType<IconProps>;
  export const Download: ComponentType<IconProps>;
  export const Plus: ComponentType<IconProps>;
  export const Edit: ComponentType<IconProps>;
  export const Trash2: ComponentType<IconProps>;
  export const X: ComponentType<IconProps>;
  export const Settings: ComponentType<IconProps>;
  export const AlertCircle: ComponentType<IconProps>;
  export const CheckCircle: ComponentType<IconProps>;
  export const Info: ComponentType<IconProps>;
  export const ArrowDown: ComponentType<IconProps>;
  export const ArrowUp: ComponentType<IconProps>;
  export const ChevronDown: ComponentType<IconProps>;
  export const ChevronUp: ComponentType<IconProps>;
}