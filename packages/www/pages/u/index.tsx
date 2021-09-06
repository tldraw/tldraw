import * as React from 'react'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import type { Session } from 'next-auth'
import { signOut } from 'next-auth/client'
import Head from 'next/head'

interface UserPageProps {
  session: Session
}

export default function UserPage({ session }: UserPageProps): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <div>
        <pre>
          <code>{JSON.stringify(session.user, null, 2)}</code>
        </pre>
        <button onClick={() => signOut}>Sign Out</button>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user && process.env.NODE_ENV !== 'development') {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  const id = context.query.id?.toString()

  // Get document from database

  // If document does not exist, create an empty document

  // Return the document

  return {
    props: {
      id,
      session,
    },
  }
}
