import { forwardRef } from 'react'
import { IconProps } from './types'

export const Eraser2Icon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M8.43365 14.4987H5.00784C4.77229 14.4987 4.54638 14.405 4.37981 14.2381L1.01014 10.8616C0.663287 10.514 0.663287 9.95052 1.01014 9.60297L3.93654 6.67066M8.43365 14.4987H14.9899M8.43365 14.4987L10.0912 12.8378M3.93654 6.67066L8.83517 1.76213C9.18202 1.41458 9.74438 1.41458 10.0912 1.76213L14.9899 6.67066C15.3367 7.01821 15.3367 7.58171 14.9899 7.92926L10.0912 12.8378M3.93654 6.67066L10.0912 12.8378"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
