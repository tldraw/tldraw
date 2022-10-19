import React, { lazy, Suspense } from 'react';

const LazyAuth = lazy(() => import('./Auth'));

const Auth = (props: JSX.IntrinsicAttributes & { children?: React.ReactNode; }) => (
  <Suspense fallback={null}>
    <LazyAuth {...props} />
  </Suspense>
);

export default Auth;
