import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const ArrowDownIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.787 5.278a.659.659 0 0 0-.447.326c-.079.134-.08.218-.091 5.194l-.011 5.058-1.669-1.664c-1.841-1.836-1.821-1.82-2.179-1.714-.218.064-.527.376-.594.599-.107.357-.176.274 2.398 2.863 1.29 1.298 2.409 2.395 2.486 2.437a.727.727 0 0 0 .64 0c.077-.042 1.188-1.13 2.468-2.417 2.331-2.343 2.452-2.478 2.452-2.741 0-.312-.467-.779-.78-.779-.257 0-.401.125-2.05 1.771l-1.65 1.648-.002-4.94c-.001-2.716-.017-5.017-.035-5.113-.079-.408-.458-.621-.936-.528"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
