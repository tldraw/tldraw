import Head from 'next/head'
import Link from 'next/link'

const Login = () => {
  return (
    <>
      <Head>
        <title>Klen</title>
      </Head>
      <h1>Login</h1>

      <ul>
        <li>
          <Link href="/canvas/12">
            <a>Canvas</a>
          </Link>
        </li>

        <li>
          <Link href="/universe">
            <a>Universe</a>
          </Link>
        </li>
      </ul>
    </>
  )
}

export default Login
