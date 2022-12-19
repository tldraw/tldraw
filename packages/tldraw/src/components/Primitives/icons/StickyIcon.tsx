import { forwardRef } from 'react'
import { IconProps } from './types'

export const StickyIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M15.25 9.13235H10.8824C9.91586 9.13235 9.13235 9.91586 9.13235 10.8824V15.25H2C1.30964 15.25 0.75 14.6904 0.75 14V2C0.75 1.30964 1.30964 0.75 2 0.75H14C14.6904 0.75 15.25 1.30964 15.25 2V9.13235ZM10.8824 10.6324H14.1893L10.6324 14.1893V10.8824C10.6324 10.7443 10.7443 10.6324 10.8824 10.6324Z"
          stroke={color}
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
