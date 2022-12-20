import { forwardRef } from 'react'
import { IconProps } from '../types'

export const ArrowDrawIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="m14.9 4.999-3.24.021-.146.091c-.199.124-.281.313-.281.653 0 .308.068.469.26.612.111.083.144.084 2.51.095 1.318.006 2.397.024 2.397.04 0 .015-2.555 2.584-5.677 5.709-6.153 6.156-5.814 5.794-5.745 6.162.039.21.43.601.64.64.368.069.006.408 6.162-5.745 3.125-3.122 5.694-5.677 5.71-5.677.017 0 .03 1.058.03 2.35 0 2.593-.007 2.516.253 2.707.175.128.687.142.898.023a.733.733 0 0 0 .233-.214c.073-.121.077-.27.097-3.486l.021-3.36-.101-.22c-.087-.19-.131-.235-.318-.33-.125-.063-.269-.106-.34-.101-.068.005-1.581.019-3.363.03"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
