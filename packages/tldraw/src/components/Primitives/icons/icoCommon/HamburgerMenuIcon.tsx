import { forwardRef } from 'react'
import { IconProps } from '../types'

export const HamburgerMenuIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M5.339 6.731c-.313.263-.266.871.082 1.05.078.04 1.674.051 7.329.051 5.655 0 7.251-.011 7.329-.051.348-.179.395-.787.082-1.05l-.126-.106H5.465l-.126.106m0 5c-.313.263-.266.871.082 1.05.078.04 1.674.051 7.329.051 5.655 0 7.251-.011 7.329-.051.348-.179.395-.787.082-1.05l-.126-.106H5.465l-.126.106m0 5c-.313.263-.266.871.082 1.05.078.04 1.674.051 7.329.051 5.655 0 7.251-.011 7.329-.051.348-.179.395-.787.082-1.05l-.126-.106H5.465l-.126.106"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
