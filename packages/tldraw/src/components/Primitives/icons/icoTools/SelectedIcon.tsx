import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const SelectedIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M5.12 4.424a.86.86 0 0 0-.52.77c0 .157.471 1.564 2.302 6.872 1.265 3.671 2.346 6.792 2.4 6.937.193.51.587.728 1.071.594.335-.093.355-.126 1.804-3.027l1.356-2.717 2.741-1.117c2.105-.857 2.772-1.145 2.873-1.24.404-.381.314-1.083-.173-1.342-.107-.057-3.156-1.384-6.777-2.949C5.138 4.154 5.455 4.279 5.12 4.424m6.647 4.227c2.81 1.214 5.1 2.215 5.09 2.225-.009.01-1.003.417-2.207.904l-2.19.886-1.1 2.206c-.605 1.213-1.111 2.206-1.124 2.207-.013 0-.776-2.181-1.695-4.849-.92-2.668-1.751-5.072-1.846-5.344-.144-.408-.162-.49-.105-.469.039.015 2.368 1.02 5.177 2.234"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
