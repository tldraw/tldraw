import { GetServerSideProps, NextApiRequest, NextApiResponse } from 'next'
import { signOut, signout } from 'next-auth/client'

export default function SignOut() {
  return (
    <div>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
