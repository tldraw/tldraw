import { GetServerSideProps } from 'next'
import * as React from 'react'

export default function Room(): JSX.Element {
  return <div>Todo</div>
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const id = ctx.query.id?.toString()

  // Get document from database

  // If document does not exist, create an empty document

  // Return the document

  return {
    props: {
      id,
    },
  }
}
