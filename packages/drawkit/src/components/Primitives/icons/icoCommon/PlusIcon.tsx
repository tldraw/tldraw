import * as React from 'react'
import { IconProps } from '../types'

export const PlusIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M11.787 4.278a.659.659 0 0 0-.447.326c-.078.133-.08.219-.091 3.385l-.012 3.248-3.248.012c-3.166.011-3.252.013-3.385.091a.646.646 0 0 0-.327.475c-.069.367.054.684.327.845.133.078.219.08 3.385.091l3.248.012.012 3.248c.011 3.166.013 3.252.091 3.385a.646.646 0 0 0 .475.327c.367.069.684-.054.845-.327.078-.133.08-.219.091-3.385l.012-3.248 3.248-.012c3.166-.011 3.252-.013 3.385-.091.273-.161.396-.478.327-.845a.646.646 0 0 0-.327-.475c-.133-.078-.219-.08-3.386-.091l-3.25-.012-.002-3.128c-.001-1.721-.017-3.207-.035-3.303-.079-.408-.458-.621-.936-.528"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
