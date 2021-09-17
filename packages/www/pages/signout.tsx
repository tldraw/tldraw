import { signOut } from 'next-auth/client'
import Head from 'next/head'

export default function SignOut(): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <div>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    </>
  )
}
