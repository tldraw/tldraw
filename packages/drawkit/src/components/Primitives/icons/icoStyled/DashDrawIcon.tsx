import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const DashDrawIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.2 4.044c-2.733.263-5.194 1.987-6.4 4.485-1.92 3.974-.251 8.749 3.729 10.671a7.948 7.948 0 0 0 6.942 0 8.017 8.017 0 0 0 4.528-7.2A8.01 8.01 0 0 0 11.2 4.044m1.7 2.339c2.808.385 4.725 2.216 5.403 5.162.132.573.178 1.546.098 2.049-.321 1.999-1.927 3.417-4.813 4.246-.764.22-.985.251-1.788.252-2.311.003-4.126-.709-5.068-1.987-.78-1.059-.915-2.336-.51-4.825.296-1.824.772-2.995 1.51-3.716.494-.483 1.092-.769 2.168-1.037a8.144 8.144 0 0 1 3-.144"
          fill="#222"
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
