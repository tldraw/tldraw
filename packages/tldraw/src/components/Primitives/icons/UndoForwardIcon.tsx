import { forwardRef } from 'react'
import { IconProps } from './types'

export const UndoForwardIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M15.077 6.799c-.166.088-.423.36-.479.506a.583.583 0 0 0 .04.487c.042.081.69.778 1.438 1.548l1.362 1.4-4.069.023c-4.513.025-4.402.019-5.378.3a6.422 6.422 0 0 0-1.61.715c-.526.319-1.223 1.006-1.535 1.512-.54.877-.846 1.986-.846 3.064 0 .578.184.825.653.874.353.036.634-.093.771-.357.034-.064.072-.333.094-.66.058-.856.199-1.411.492-1.931.546-.969 1.426-1.56 2.81-1.89.354-.085.428-.086 4.5-.099l4.14-.013-.4.411-1.122 1.151c-1.424 1.458-1.428 1.463-1.361 1.815.033.177.315.496.521.59.214.097.335.094.535-.015.103-.056.892-.837 2.071-2.05 1.048-1.078 1.957-1.993 2.019-2.033.134-.086.317-.448.317-.627 0-.194-.156-.514-.299-.613-.07-.048-.985-.969-2.033-2.047-1.195-1.228-1.969-1.994-2.074-2.05-.201-.109-.366-.112-.557-.011"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)

// export const UndoForwardIcon = forwardRef<SVGSVGElement, IconProps>(
//   ({ color = 'currentColor', ...props }, forwardedRef) => {
//     return (
//       <svg
//         width="16"
//         height="12"
//         viewBox="0 0 16 12"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//         {...props}
//         ref={forwardedRef}
//       >
//         <path
//           d="M11.3504 1.51562L15.248 5.51852M15.248 5.51852L11.3504 9.5209M15.248 5.51852H5.95838C4.22211 5.52874 0.749579 6.34141 0.749579 10.4839"
//           stroke={color}
//           stroke-width="1.5"
//           stroke-linecap="round"
//           stroke-linejoin="round"
//         />
//       </svg>
//     )
//   }
// )
