// Minimal react declarations to satisfy TypeScript in the examples workspace
// This shim is only needed for the isolated examples build and is NOT used in production builds.

declare namespace React {
  type ReactNode = any
  interface FC<P = {}> {
    (props: P & { children?: ReactNode }): ReactNode | null
  }
}

declare module 'react' {
  export = React
  export as namespace React
}

declare module 'react/jsx-runtime' {
  export {};
}

// Provide a bare-minimum JSX namespace so that JSX parsing succeeds.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}