import { TLDraw } from '@tldraw/tldraw'

interface EditorProps {
  id?: string
}

export default function Editor({ id = 'home' }: EditorProps) {
  return <TLDraw id={id} />
}
