import * as React from 'react'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('../components/editor'), { ssr: false })

export function Shhh(): JSX.Element {
  return (
    <div>
      <Editor />
    </div>
  )
}

export default Shhh
