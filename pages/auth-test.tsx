import Head from 'next/head'
import { signIn, signOut, useSession } from 'next-auth/client'

export default function Home() {
  const [session, loading] = useSession()
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <div>
        <button onClick={() => signIn()}>Sign In</button>
        <button onClick={() => signOut()}>Sign Out</button>
        <pre>{JSON.stringify(session, null, 2)}</pre>
        {loading && 'Loading...'}
        {session && <p>Hey, you made it! Thanks for sponsoring me.</p>}
      </div>
    </>
  )
}
