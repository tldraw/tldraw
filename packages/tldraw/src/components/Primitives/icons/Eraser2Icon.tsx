import { forwardRef } from 'react'
import { IconProps } from './types'

export const Eraser2Icon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M13.07 4.801c-.437.11-.394.07-4.672 4.353-4.478 4.482-4.275 4.257-4.363 4.823a1.72 1.72 0 0 0 .151.999c.078.157.533.636 1.968 2.075 1.026 1.03 1.941 1.916 2.032 1.97.388.229.177.221 5.831.22l5.197-.001.178-.086c.227-.11.326-.311.327-.666.001-.339-.105-.547-.331-.65-.159-.072-.296-.076-2.638-.077-1.358-.001-2.47-.014-2.47-.03s1.223-1.254 2.718-2.75c2.388-2.391 2.73-2.749 2.823-2.951.147-.323.2-.679.146-.989-.1-.562-.015-.464-2.879-3.333-2.454-2.458-2.647-2.642-2.914-2.774-.245-.122-.335-.144-.62-.157a2.252 2.252 0 0 0-.484.024m2.94 3.949c1.38 1.38 2.51 2.528 2.51 2.55 0 .022-1 1.039-2.222 2.26l-2.223 2.22-2.535-2.56-2.535-2.56 2.207-2.21c1.214-1.215 2.226-2.21 2.248-2.21.022 0 1.169 1.129 2.55 2.51m-5.531 5.533 2.534 2.563-.456.457-.456.457H8.98l-1.75-1.75c-.962-.962-1.75-1.767-1.75-1.788 0-.028 2.434-2.502 2.461-2.502.002 0 1.144 1.153 2.538 2.563"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
// export const Eraser2Icon = forwardRef<SVGSVGElement, IconProps>(
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
//           d="M8.43365 14.4987H5.00784C4.77229 14.4987 4.54638 14.405 4.37981 14.2381L1.01014 10.8616C0.663287 10.514 0.663287 9.95052 1.01014 9.60297L3.93654 6.67066M8.43365 14.4987H14.9899M8.43365 14.4987L10.0912 12.8378M3.93654 6.67066L8.83517 1.76213C9.18202 1.41458 9.74438 1.41458 10.0912 1.76213L14.9899 6.67066C15.3367 7.01821 15.3367 7.58171 14.9899 7.92926L10.0912 12.8378M3.93654 6.67066L10.0912 12.8378"
//           stroke={color}
//           stroke-width="1.5"
//           stroke-linecap="round"
//           stroke-linejoin="round"
//         />
//       </svg>
//     )
//   }
// )
