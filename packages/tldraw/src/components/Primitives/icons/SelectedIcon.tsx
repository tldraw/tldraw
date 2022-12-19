import { forwardRef } from 'react'
import { IconProps } from './types'

export const SelectedIcon = forwardRef<SVGSVGElement, IconProps>(
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
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)

// const SelectedIcon = forwardRef<SVGSVGElement, IconProps>(
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
//           d="M1.4731 1.11306L14.6075 6.7938C14.6897 6.82936 14.6885 6.94639 14.6055 6.98017L8.98275 9.26989L6.21212 14.8391C6.17219 14.9193 6.05531 14.9117 6.02608 14.827L1.33744 1.2388C1.30877 1.15573 1.39245 1.07818 1.4731 1.11306Z"
//           stroke={color}
//           stroke-width="1.5"
//         />
//       </svg>
//     )
//   }
// )
