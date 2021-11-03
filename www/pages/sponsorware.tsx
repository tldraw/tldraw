import styled from 'styles'
import { getSession, signin, signout, useSession } from 'next-auth/client'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import React from 'react'
import Head from 'next/head'

export default function Sponsorware(): JSX.Element {
  const [session, loading] = useSession()

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <StyledOuterContent>
        <StyledContent
          size={{
            '@sm': 'small',
          }}
        >
          <h1>tldraw (is sponsorware)</h1>
          <p>
            Hey, thanks for visiting <Link href="/">tldraw</Link>, a tiny little drawing app by{' '}
            <a
              target="_blank"
              rel="noreferrer nofollow noopener"
              href="https://twitter.com/steveruizok"
            >
              steveruizok
            </a>{' '}
            and friends .
          </p>
          <video autoPlay muted playsInline onClick={(e) => e.currentTarget.play()}>
            <source src="images/hello.mp4" type="video/mp4" />
          </video>
          <p>This project is currently: </p>
          <ul>
            <li>in development</li>
            <li>only available for my sponsors</li>
          </ul>
          <p>
            If you&apos;d like to try it out,{' '}
            <a
              href="https://github.com/sponsors/steveruizok"
              target="_blank"
              rel="noopener noreferrer"
            >
              sponsor me on Github
            </a>{' '}
            (at any level) and sign in below.
          </p>
          <StyledButtonGroup>
            {session ? (
              <>
                <StyledButton variant="secondary" onClick={() => signout()}>
                  Sign Out
                </StyledButton>
                <StyledDetail>
                  Signed in as {session?.user?.name} ({session?.user?.email}), but it looks like
                  you&apos;re not yet a sponsor.
                  <br />
                  Something wrong? Try <Link href="/">reloading the page</Link> or DM me on{' '}
                  <a
                    target="_blank"
                    rel="noreferrer nofollow noopener"
                    href="https://twitter.com/steveruizok"
                  >
                    Twitter
                  </a>
                  .
                </StyledDetail>
              </>
            ) : (
              <>
                <StyledButton variant="primary" onClick={() => signin('github')}>
                  {loading ? 'Loading...' : 'Sign in With Github'}
                </StyledButton>
                <StyledDetail>Already a sponsor? Just sign in to visit the app.</StyledDetail>
              </>
            )}
          </StyledButtonGroup>
        </StyledContent>
      </StyledOuterContent>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  return {
    props: {
      session,
    },
  }
}

const StyledOuterContent = styled('div', {
  backgroundColor: '$canvas',
  padding: '8px 8px 64px 8px',
  margin: '0 auto',
  overflow: 'scroll',
  position: 'fixed',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
})

const StyledContent = styled('div', {
  width: '720px',
  padding: '8px 16px',
  maxWidth: '100%',
  backgroundColor: '$panel',
  borderRadius: '4px',
  boxShadow: '$12',
  color: '$text',
  fontSize: '$2',
  fontFamily: '$body',
  lineHeight: 1.5,

  '& a': {
    color: '$bounds',
    backgroundColor: '$boundsBg',
    padding: '2px 4px',
    margin: '0 -3px',
    borderRadius: '2px',
  },

  '& p': {
    borderRadius: '8px',
  },

  '& video': {
    maxWidth: '100%',
    border: '1px solid $overlay',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '16px 0',
  },

  '& iframe': {
    border: 'none',
    backgroundColor: 'none',
    background: 'none',
  },

  variants: {
    size: {
      small: {
        fontSize: '$3',
        padding: '32px',
      },
    },
  },
})

const StyledButtonGroup = styled('div', {
  display: 'grid',
  gap: '16px',
  margin: '40px 0 32px 0',
})

const StyledDetail = styled('p', {
  fontSize: '$2',
  textAlign: 'center',
})

const StyledButton = styled('button', {
  cursor: 'pointer',
  width: '100%',
  padding: '12px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  font: '$ui',
  fontSize: '$3',
  color: '$panel',
  border: 'none',
  borderRadius: '4px',

  variants: {
    variant: {
      primary: {
        fontWeight: 'bold',
        background: '$bounds',
        color: '$panel',
        boxShadow: '$4',
      },
      secondary: {
        border: '1px solid $overlay',
        background: 'transparent',
        color: '$muted',
      },
    },
  },
})
