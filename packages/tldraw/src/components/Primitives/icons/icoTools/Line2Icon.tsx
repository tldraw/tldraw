import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const Line2Icon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M18.1 4.917c-.103.053-2.492 2.416-6.667 6.592-7.138 7.143-6.669 6.641-6.556 7.016.065.218.38.533.598.598.375.113-.127.582 7.016-6.556 4.691-4.688 6.534-6.555 6.595-6.68.104-.214.081-.401-.076-.625-.251-.357-.615-.495-.91-.345"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
