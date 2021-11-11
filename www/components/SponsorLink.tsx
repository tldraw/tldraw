import { styled } from '../styles'

export function SponsorLink() {
  return (
    <LinkWrapper>
      <StyledLink href="https://github.com/sponsors/steveruizok" target="_blank">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </StyledLink>
    </LinkWrapper>
  )
}

const LinkWrapper = styled('div', {
  position: 'fixed',
  display: 'flex',
  zIndex: 1000,
  top: 48,
  left: 0,
  pointerEvents: 'none',
})

const StyledLink = styled('a', {
  padding: '$5',
  pointerEvents: 'all',
  color: '#eb2fa2',
})
