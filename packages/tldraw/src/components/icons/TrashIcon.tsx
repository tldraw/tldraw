import * as React from 'react'

export function TrashIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 15 15"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 4.656a.5.5 0 01.5-.5h9.7a.5.5 0 010 1H2.5a.5.5 0 01-.5-.5z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.272 3a.578.578 0 00-.578.578v.578h3.311v-.578A.578.578 0 008.428 3H6.272zm3.733 1.156v-.578A1.578 1.578 0 008.428 2H6.272a1.578 1.578 0 00-1.578 1.578v.578H3.578a.5.5 0 00-.5.5V12.2a1.578 1.578 0 001.577 1.578h5.39a1.578 1.578 0 001.577-1.578V4.656a.5.5 0 00-.5-.5h-1.117zm-5.927 1V12.2a.578.578 0 00.577.578h5.39a.578.578 0 00.577-.578V5.156H4.078z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.272 6.85a.5.5 0 01.5.5v3.233a.5.5 0 11-1 0V7.35a.5.5 0 01.5-.5zM8.428 6.85a.5.5 0 01.5.5v3.233a.5.5 0 11-1 0V7.35a.5.5 0 01.5-.5z"
      />
    </svg>
  )
}
