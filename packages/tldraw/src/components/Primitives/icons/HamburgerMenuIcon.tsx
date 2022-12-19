import { forwardRef } from 'react'
import { IconProps } from './types'

export const HamburgerMenuIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="12"
        viewBox="0 0 16 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M0.75 1.22754H14.75" stroke={color} stroke-width="1.25" stroke-linecap="round" />
        <path d="M0.75 6.22754H14.75" stroke={color} stroke-width="1.25" stroke-linecap="round" />
        <path d="M0.75 11.2275H14.75" stroke={color} stroke-width="1.25" stroke-linecap="round" />
      </svg>
    )
  }
)
