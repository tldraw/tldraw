import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const DropdownArrowIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M8.17 10.36c-.151.092-.29.299-.29.432 0 .051.026.141.057.2.101.19 3.832 3.88 3.953 3.91.06.015.159.015.22 0 .153-.037 3.955-3.839 3.992-3.992.039-.163-.011-.307-.158-.454-.147-.147-.291-.198-.454-.158-.073.018-.676.592-1.8 1.714L12 13.699l-1.67-1.665c-.919-.916-1.709-1.686-1.757-1.71-.129-.065-.257-.054-.403.036"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
