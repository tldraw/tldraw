import { forwardRef } from 'react'
import { IconProps } from '../types'

export const CheckIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M18.736 5.276c-.204.093.079-.248-4.474 5.384a1268.123 1268.123 0 0 1-3.82 4.712c-.065.068-.173-.013-2.325-1.736-1.241-.993-2.315-1.831-2.386-1.861a.582.582 0 0 0-.607.067c-.374.271-.51.706-.314 1.002.106.159 5.172 4.236 5.413 4.355.217.108.45.105.621-.01.075-.05 2.101-2.518 4.502-5.484 3.513-4.339 4.376-5.428 4.415-5.569.042-.151.04-.203-.018-.354-.077-.2-.278-.396-.52-.506-.204-.093-.282-.093-.487 0"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
