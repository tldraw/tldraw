import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import { v4 as uuid } from 'uuid'

export default function CreateNewRoom(): JSX.Element {
  return <div>You should not see this one</div>
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user) {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  context.res.setHeader('Location', `/room/${uuid()}`)
  context.res.statusCode = 307

  return {
    props: {},
  }
}
