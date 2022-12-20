import { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignCenterVerticallyIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.601 4.064a1.509 1.509 0 0 0-.998.917c-.081.217-.083.285-.083 3.239v3.018l-2.99.011c-2.694.01-3.002.018-3.11.077-.242.134-.42.419-.42.674 0 .255.178.54.42.674.108.059.416.067 3.109.077l2.99.011.01 3.069.011 3.069.108.229c.129.276.423.581.678.704a1.505 1.505 0 0 0 2.026-.704l.108-.229.011-3.069.01-3.069 2.99-.011c2.693-.01 3.001-.018 3.109-.077.242-.134.42-.419.42-.674 0-.255-.178-.54-.42-.674-.108-.059-.416-.067-3.11-.077l-2.99-.011V8.22c0-2.954-.002-3.022-.083-3.239a1.492 1.492 0 0 0-1.016-.919 1.354 1.354 0 0 0-.78.002"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    )
  }
)
