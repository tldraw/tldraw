import * as React from 'react'

export function UndoIcon(props: React.SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg viewBox="0 -1 15 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.5 2.495a.5.5 0 01.5.5v2.5h2.5a.5.5 0 110 1h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.303 2.049a5 5 0 11-4.02 6.613.5.5 0 01.944-.332 4 4 0 10.946-4.16l-.01.01-2.32 2.18a.5.5 0 01-.685-.729l2.314-2.175A5 5 0 017.303 2.05z"
      />
    </svg>
  )
}
