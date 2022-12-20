import { forwardRef } from 'react'
import { IconProps } from '../types'

export const MinusIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.787 11.278c-.342.067-.519.314-.519.722 0 .462.207.693.663.739.137.014 3.417.02 7.289.013 6.957-.012 7.042-.013 7.176-.092a.646.646 0 0 0 .327-.475c.069-.367-.054-.684-.327-.845-.135-.079-.213-.08-7.296-.086-3.938-.003-7.229.008-7.313.024"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
