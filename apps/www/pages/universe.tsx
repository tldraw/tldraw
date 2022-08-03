import { withSSRContext } from 'aws-amplify'
import Link from 'next/link'
import useSwr from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function Universe({ authenticated, username }) {
  const { data, error } = useSwr('/api/universe', fetcher)

  if (error) return <div>Failed to load universe</div>
  if (!data) return <div>Loading...</div>

  if (!authenticated) {
    return (
      <>
        <h1>Not authenticated!</h1>

        <Link href="/login">
          <a>Login</a>
        </Link>
      </>
    )
  }

  return (
    <ul>
      {data.response.map((workshop) => (
        <li key={workshop.uuid}>
          <Link href="/user/[id]" as={`/user/${workshop.uuid}`}>
            {`Workshop ${workshop.uuid}`}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export async function getServerSideProps(context) {
  const { Auth } = withSSRContext(context)

  try {
    const user = await Auth.currentAuthenticatedUser()

    return {
      props: {
        authenticated: true,
        username: user.username,
      },
    }
  } catch (error) {
    return {
      props: {
        authenticated: false,
      },
    }
  }
}

export default Universe
