import { Tldraw } from '@tldraw/tldraw'
import * as React from 'react'

export default function ChangingId() {
  const [id, setId] = React.useState('example')

  React.useEffect(() => {
    const timeout = setTimeout(() => setId('example2'), 2000)

    return () => clearTimeout(timeout)
  }, [])

  return <Tldraw id={id} />
}
