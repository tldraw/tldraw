import React, { forwardRef } from 'react'
import { IconProps } from '../types'

export const ArrowRightIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M7.783 6.048a.654.654 0 0 0-.303.423c-.014.087.004.144.076.252.053.079.874.821 1.877 1.697.981.857 1.784 1.568 1.784 1.58 0 .012-.803.723-1.784 1.58-1.003.876-1.824 1.618-1.877 1.697-.072.108-.09.165-.076.253a.657.657 0 0 0 .343.44c.129.062.167.067.274.035.091-.027.687-.529 2.189-1.843 1.135-.992 2.097-1.851 2.138-1.908.116-.162.126-.282.036-.444-.056-.103-.631-.626-2.143-1.947-1.137-.994-2.115-1.827-2.174-1.851-.149-.063-.206-.057-.36.036"
          fillRule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
