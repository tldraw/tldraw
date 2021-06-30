import dynamic from 'next/dynamic'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import { useEffect } from 'react'
import coopState from 'state/coop/coop-state'

const Editor = dynamic(() => import('components/editor'), { ssr: false })

export default function Room({ id }: { id: string }): JSX.Element {
  useEffect(() => {
    return () => {
      coopState.send('LEFT_ROOM')
    }
  }, [])

  return <Editor roomId={id} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  const { id } = context.query

  return {
    props: {
      session,
      id,
    },
  }
}
