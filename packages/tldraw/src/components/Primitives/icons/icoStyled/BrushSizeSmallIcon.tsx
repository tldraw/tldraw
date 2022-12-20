import { forwardRef } from 'react'
import { IconProps } from '../types'

export const BrushSizeSmallIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.44 9.058c-.641.138-1.072.372-1.543.841-.308.305-.392.419-.55.741-.259.527-.325.803-.325 1.36s.066.833.325 1.36c.157.32.243.437.55.743.306.307.423.393.743.55.523.257.801.323 1.36.323s.837-.066 1.36-.323c.32-.157.437-.243.743-.55.307-.306.393-.423.55-.743.257-.523.323-.801.323-1.36s-.066-.837-.323-1.36c-.157-.32-.243-.437-.55-.743-.306-.307-.423-.393-.743-.55a4.168 4.168 0 0 0-.62-.249c-.337-.089-.981-.108-1.3-.04"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
