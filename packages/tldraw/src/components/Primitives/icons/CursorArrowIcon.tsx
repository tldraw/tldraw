import { forwardRef } from 'react'
import { IconProps } from './types'

export const CursorArrowIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M1.4731 1.11306L14.6075 6.7938C14.6897 6.82936 14.6885 6.94639 14.6055 6.98017L8.98275 9.26989L6.21212 14.8391C6.17219 14.9193 6.05531 14.9117 6.02608 14.827L1.33744 1.2388C1.30877 1.15573 1.39245 1.07818 1.4731 1.11306Z"
          stroke={color}
          stroke-width="1.5"
        />
      </svg>
    )
  }
)
