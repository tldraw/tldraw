import { forwardRef } from 'react'
import { IconProps } from './types'

export const SquareIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.667 4.065a.928.928 0 0 0-.368.233C3.976 4.622 4 4.011 4 12c0 7.991-.024 7.369.303 7.697.328.327-.294.303 7.697.303s7.369.024 7.697-.303c.327-.328.303.294.303-7.697s.024-7.369-.303-7.697c-.328-.328.297-.303-7.714-.3-6.178.002-7.149.01-7.316.062M18.5 12v6.5h-13l-.01-6.46c-.006-3.553-.002-6.483.009-6.51.015-.04 1.338-.048 6.51-.04l6.491.01V12"
          fill={color}
          fill-rule="evenodd"
        />
      </svg>
    )
  }
)
// export const SquareIcon = forwardRef<SVGSVGElement, IconProps>(
//   ({ color = 'currentColor', ...props }, forwardedRef) => {
//     return (
//       <svg
//         width="16"
//         height="16"
//         viewBox="0 0 16 16"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         {...props}
//         ref={forwardedRef}
//       >
//         <path
//           d="M0.745 0.036 C 0.470 0.111,0.214 0.333,0.084 0.609 L 0.013 0.760 0.013 8.001 L 0.013 15.241 0.100 15.417 C 0.204 15.628,0.395 15.815,0.608 15.915 L 0.760 15.987 8.001 15.987 L 15.241 15.987 15.417 15.900 C 15.628 15.796,15.815 15.605,15.915 15.392 L 15.987 15.240 15.987 8.000 L 15.987 0.760 15.915 0.608 C 15.815 0.395,15.628 0.204,15.417 0.100 L 15.241 0.013 8.054 0.008 C 2.415 0.004,0.840 0.010,0.745 0.036 M14.507 8.000 L 14.507 14.507 8.000 14.507 L 1.493 14.507 1.493 8.000 L 1.493 1.493 8.000 1.493 L 14.507 1.493 14.507 8.000 "
//           stroke="none"
//           fill={color}
//           fill-rule="evenodd"
//         ></path>
//       </svg>
//     )
//   }
// )
