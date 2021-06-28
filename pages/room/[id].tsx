import dynamic from 'next/dynamic'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'

const Editor = dynamic(() => import('components/editor'), { ssr: false })

export default function Room({ id }: { id: string }): JSX.Element {
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
