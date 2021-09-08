import * as React from 'react'
import { TLDraw } from '@tldraw/tldraw'

export default function NewId() {
  const [id, setId] = React.useState('example')

  React.useEffect(() => {
    const timeout = setTimeout(() => setId('example2'), 2000)

    return () => clearTimeout(timeout)
  }, [])

  return <TLDraw id={id} />
}
