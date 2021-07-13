import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import { uniqueId } from 'utils'

export default function CreateNewRoom(): JSX.Element {
  return <div>You should not see this one</div>
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user) {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  context.res.setHeader('Location', `/room/${uniqueId()}`)
  context.res.statusCode = 307

  return {
    props: {},
  }
}
