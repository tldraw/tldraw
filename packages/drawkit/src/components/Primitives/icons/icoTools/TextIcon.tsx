import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const TextIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M6.507 5.278a.659.659 0 0 0-.447.326c-.075.127-.08.208-.08 1.196 0 .98.006 1.072.08 1.22.123.245.358.351.733.329.327-.019.454-.087.587-.313.067-.114.082-.226.094-.706l.015-.57h3.751v10.471l-.75.015c-.662.013-.766.024-.886.094-.273.161-.396.478-.327.845a.646.646 0 0 0 .327.475c.132.077.208.08 2.396.08 2.188 0 2.264-.003 2.396-.08a.646.646 0 0 0 .327-.475c.069-.367-.054-.684-.327-.845-.12-.07-.224-.081-.886-.094l-.75-.015V6.76h3.752l.014.57c.012.482.026.591.094.706.133.226.26.294.587.313.249.014.32.003.473-.076.311-.16.32-.203.32-1.477 0-1.079-.002-1.107-.09-1.238a.86.86 0 0 0-.23-.216c-.139-.082-.17-.082-5.58-.088-2.992-.003-5.509.008-5.593.024"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
