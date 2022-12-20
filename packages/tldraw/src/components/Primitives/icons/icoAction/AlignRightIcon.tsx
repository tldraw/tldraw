import { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignRightIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M19.006 4.043a.83.83 0 0 0-.397.33c-.063.116-.071.378-.089 3.127l-.02 3-6.7.02-6.7.02-.229.108c-.276.129-.581.423-.704.678a1.505 1.505 0 0 0 .704 2.026l.229.108 6.7.02 6.7.02.02 3c.022 3.364.003 3.155.318 3.364a.736.736 0 0 0 1.087-.322c.07-.155.073-.467.073-7.542 0-7.091-.003-7.386-.074-7.54-.165-.357-.588-.55-.918-.417"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
