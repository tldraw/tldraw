import { forwardRef } from 'react'
import { IconProps } from '../types'

interface Props extends IconProps {
  active: boolean
}

export const StyledIcon = forwardRef<SVGSVGElement, Props>(
  ({ color = 'currentColor', active = false, ...props }, forwardedRef) => {
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
        <circle cx="12" cy="12" r="5.5" fill={color} />
        {active && <circle cx="12" cy="12" r="7.5" stroke={color} />}
      </svg>
    )
  }
)
