import styled from 'styles'
import { signin, signout, useSession } from 'next-auth/client'

export default function Sponsorware() {
  const [session, loading] = useSession()

  return (
    <Content>
      <h1>tldraw is sponsorware</h1>
      <video src="images/hello.mp4" autoPlay muted loop />
      <p>
        Hey, thanks for visiting <a href="https://tldraw.com/">tldraw</a>, a
        tiny little drawing app by{' '}
        <a href="https://twitter.com/steveruizok">steveruizok</a>.
      </p>
      <p>
        {' '}
        This project is currently:{' '}
        <ul>
          <li>in development</li>
          <li>only available for my sponsors</li>
        </ul>
      </p>
      <p>
        If you'd like to try it out,{' '}
        <a
          href="https://github.com/sponsors/steveruizok"
          target="_blank"
          rel="noopener noreferrer"
        >
          sponsor me on Github
        </a>{' '}
        (at $1 or more) and sign in below.
      </p>
      <Button onClick={() => signin('github')}>Sign in With Github</Button>
      <button onClick={() => signout()}>Sign Out</button>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </Content>
  )
}

const Content = styled('div', {
  width: '720px',
  maxWidth: 'calc(100% - 16px)',
  backgroundColor: '$panel',
  margin: '72px auto',
  borderRadius: '4px',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
  padding: '16px',
  overflow: 'hidden',
  color: '$text',

  '& a': {
    color: '$bounds',
    backgroundColor: '$boundsBg',
    padding: '2px 4px',
    margin: '0 -3px',
    borderRadius: '2px',
  },

  '& p': {
    fontFamily: '$body',
    fontSize: '$3',
    lineHeight: 1.5,
  },

  '& video': {
    maxWidth: '100%',
    boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '16px 0',
  },
})

const Button = styled('button', {
  width: '100%',
  padding: '12px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '$ui',
  fontWeight: 'bold',
  fontSize: '$3',
  background: '$bounds',
  color: '$panel',
  border: 'none',
  margin: '32px 0 8px 0',
})
