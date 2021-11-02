import * as React from 'react'

function SvgRedo(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 -1 15 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5 2.495a.5.5 0 00-.5.5v2.5H9.5a.5.5 0 100 1h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.697 2.049a5 5 0 104.02 6.613.5.5 0 10-.944-.332 4 4 0 11-.946-4.16l.01.01 2.32 2.18a.5.5 0 00.685-.729l-2.314-2.175A5 5 0 007.697 2.05z"
      />
    </svg>
  )
}

export default SvgRedo
