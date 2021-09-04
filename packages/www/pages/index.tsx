import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('../components/editor'), { ssr: false })

export default function Home() {
  return <Editor />
}
