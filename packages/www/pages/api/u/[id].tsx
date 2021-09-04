import type { GetServerSideProps } from 'next'
import * as React from 'react'

export default function UserPage(): JSX.Element {
  return <div>Todo</div>
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const id = ctx.query.id?.toString()

  // Get user from database

  // If user does not exist, return undefined

  return {
    props: {
      id,
    },
  }
}
