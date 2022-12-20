import { forwardRef } from 'react'
import { IconProps } from '../types'

export const BrushSizeMediumIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M11.42 4.023c-.066.009-.291.037-.5.061-.761.087-1.743.388-2.498.766a8.013 8.013 0 0 0-4.123 5.015c-.209.765-.276 1.28-.276 2.135 0 .855.067 1.37.276 2.135a7.985 7.985 0 0 0 5.566 5.566c.754.206 1.281.275 2.115.276.829.001 1.269-.051 2.002-.238a7.964 7.964 0 0 0 5.757-5.757c.185-.726.239-1.17.239-1.982s-.054-1.256-.239-1.982a7.99 7.99 0 0 0-6.519-5.919c-.39-.06-1.561-.11-1.8-.076"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
