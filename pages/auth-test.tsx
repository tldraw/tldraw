import Head from 'next/head'
import { signIn, signOut, getSession, useSession } from 'next-auth/client'
import { GetServerSidePropsContext } from 'next'

export default function Home({ session }: any) {
  // const [session, loading] = useSession()
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <div>
        <button onClick={() => signIn()}>Sign In</button>
        <button onClick={() => signOut()}>Sign Out</button>
        <pre>{JSON.stringify(session, null, 2)}</pre>
        {session && <p>Hey, you made it! Thanks for sponsoring me.</p>}
      </div>
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context)
    .then((c) => {
      console.log(c)
      return c
    })
    .catch((e) => console.log(e))

  return {
    props: {
      session,
    },
  }
}
