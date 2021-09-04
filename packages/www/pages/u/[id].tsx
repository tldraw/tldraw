import * as React from 'react'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'

interface RoomProps {
  id?: string
}

export default function OtherUserPage({ id }: RoomProps): JSX.Element {
  return <div>Todo, other user: {id}</div>
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user && process.env.NODE_ENV !== 'development') {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  const id = context.query.id?.toString()

  // Get user from database

  // If user does not exist, return null

  // Return the document

  return {
    props: {
      id,
      session,
    },
  }
}
