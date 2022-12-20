import { forwardRef } from 'react'
import { IconProps } from '../types'

export const AlignCenterHorizontallyIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.72 4.064a.814.814 0 0 0-.394.356c-.059.108-.067.416-.077 3.109l-.011 2.99-3.069.01-3.069.011-.229.108c-.276.129-.581.423-.704.678a1.505 1.505 0 0 0 .704 2.026l.229.108 3.069.011 3.069.01.011 2.99c.01 2.693.018 3.001.077 3.109.134.242.419.42.674.42.255 0 .54-.178.674-.42.059-.108.067-.416.077-3.109l.011-2.99 3.069-.01 3.069-.011.229-.108c.276-.129.581-.423.704-.678a1.505 1.505 0 0 0-.704-2.026l-.229-.108-3.069-.011-3.069-.01-.011-2.99c-.01-2.693-.018-3.001-.077-3.109-.194-.352-.608-.506-.954-.356"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
