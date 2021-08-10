import * as React from 'react'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('../components/editor'), { ssr: false })

export function Index(): JSX.Element {
  return (
    <div>
      <Editor />
    </div>
  )
}

export default Index
