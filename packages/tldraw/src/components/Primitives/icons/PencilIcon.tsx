import { forwardRef } from 'react'
import { IconProps } from './types'

export const PencilIcon = forwardRef<SVGSVGElement, IconProps>(
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
          d="M16.174 4.119c-.341.09-.551.191-.874.423-.132.095-2.709 2.644-5.727 5.665-4.709 4.714-5.493 5.516-5.532 5.653-.032.112-.042.689-.033 1.92.014 1.976.006 1.923.314 2.096.145.082.196.084 1.975.084 1.459 0 1.851-.011 1.954-.055.17-.072 10.974-10.833 11.206-11.16.341-.482.485-.876.53-1.456a2.727 2.727 0 0 0-.453-1.695c-.247-.376-.971-1.056-1.324-1.245-.573-.306-1.392-.398-2.036-.23m1.172 1.487c.174.065.309.163.573.417.19.184.385.414.435.514.179.359.181.8.004 1.148-.05.098-.346.435-.674.766l-.584.591-1.06-1.062-1.06-1.062.62-.613c.52-.514.655-.627.84-.697.29-.111.614-.111.906-.002m-2.353 3.447 1.053 1.054-4.213 4.186-4.213 4.186-1.07.001H5.48v-2.06l4.21-4.21A636.19 636.19 0 0 1 13.92 8c.011 0 .494.474 1.073 1.053"
          fill-rule="evenodd"
          fill={color}
        />
      </svg>
    )
  }
)
// export const PencilIcon = forwardRef<SVGSVGElement, IconProps>(
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
//           d="M9.91691 2.90815L0.75 12.0753V15.2323H3.94023L13.097 6.09844M9.91691 2.90815L13.097 6.09844M9.91691 2.90815L11.4915 1.34895C12.2763 0.57175 13.5417 0.574838 14.3228 1.35586L14.6621 1.69521C15.446 2.47904 15.4459 3.74992 14.662 4.53369L13.097 6.09844"
//           stroke={color}
//           stroke-width="1.5"
//           stroke-linejoin="round"
//         />
//       </svg>
//     )
//   }
// )
