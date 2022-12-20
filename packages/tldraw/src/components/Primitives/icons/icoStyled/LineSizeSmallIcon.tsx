import { forwardRef } from 'react'
import { IconProps } from '../types'

export const LineSizeSmallIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.667 11.065C4.303 11.177 4 11.602 4 12c0 .402.312.827.69.939.18.054 1.065.061 7.31.061 6.245 0 7.13-.007 7.31-.061.378-.112.69-.537.69-.939 0-.402-.312-.827-.69-.939-.18-.054-1.062-.061-7.327-.058-6.178.002-7.149.01-7.316.062"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
