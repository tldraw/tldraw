import { signOut } from 'next-auth/client'

export default function SignOut(): JSX.Element {
  return (
    <div>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
