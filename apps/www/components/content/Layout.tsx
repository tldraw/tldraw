import * as React from 'react'
import { dark, light, styled } from '../../styles'
import { useTheme } from 'next-themes'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { theme } = useTheme()

  React.useEffect(() => {
    document.body.classList.remove(dark)
    document.body.classList.remove(light)

    if (theme === 'dark') {
      document.body.classList.add(dark)
    } else {
      document.body.classList.add(light)
    }
  }, [theme])

  return (
    <Container>
      <main>{children}</main>
    </Container>
  )
}

const Container = styled('div', {
  maxWidth: 720,
  margin: '0px auto',
  p: '$1',
  sm: {
    p: '$2',
  },
  md: {
    p: '$3',
  },
  lg: {
    p: '$4',
  },
  '& sup > a': {
    fontSize: '$0',
    p: 2,
    textDecoration: 'none',
  },
  '& .footnotes > ol': {
    p: 0,
    ml: '$1',
  },
  '& .footnotes .footnote-backref': {
    ml: '$0',
  },
  '& .footnotes *': {
    fontSize: '$1',
    lineHeight: 1.32,
  },
})
