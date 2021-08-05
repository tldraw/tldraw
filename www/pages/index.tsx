import * as React from 'react'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('../components/editor'), { ssr: false })

export function Index() {
  return <Editor />
}

export default Index
