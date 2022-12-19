import { forwardRef } from 'react'
import { IconProps } from './types'

export const ImageIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = 'currentColor', ...props }, forwardedRef) => {
    return (
      <svg
        width="17"
        height="16"
        viewBox="0 0 17 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M9.20399 0.75H1.75195C1.19967 0.75 0.751953 1.19771 0.751953 1.75V14.2497C0.751953 14.8019 1.19967 15.2497 1.75195 15.2497H14.252C14.8042 15.2497 15.252 14.8019 15.252 14.2497V7.51604"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <ellipse cx="4.61338" cy="4.61696" rx="1.44736" ry="1.44997" fill={color} />
        <path
          d="M3.38849 10.3329C3.58999 10.1013 3.95062 10.1043 4.14825 10.3392L8.28053 15.2501H0.916016V13.174L3.38849 10.3329Z"
          fill={color}
        />
        <path
          d="M9.8548 7.23185C10.0527 6.98276 10.4298 6.97941 10.6322 7.22494L15.2487 12.8277V15.2494H3.48438L9.8548 7.23185Z"
          fill={color}
        />
        <path
          d="M11.3672 2.68359H15.2268"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M13.2969 4.6167V0.750123"
          stroke={color}
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    )
  }
)
