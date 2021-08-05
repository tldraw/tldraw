import type {
  Transformer as TransformerOpts,
  Resolver as ResolverOpts,
  Bundler as BundlerOpts,
  Namer as NamerOpts,
  Runtime as RuntimeOpts,
  Packager as PackagerOpts,
  Optimizer as OptimizerOpts,
  Reporter as ReporterOpts,
  Validator as ValidatorOpts,
} from '@parcel/types';
  
export declare class Transformer<T> {
  constructor(opts: TransformerOpts<T>);
}

export declare class Resolver {
  constructor(opts: ResolverOpts);
}

export declare class Bundler<T> {
  constructor(opts: BundlerOpts<T>);
}

export declare class Namer<T> {
  constructor(opts: NamerOpts<T>);
}

export declare class Runtime<T> {
  constructor(opts: RuntimeOpts<T>);
}

export declare class Validator<T> {
  constructor(opts: ValidatorOpts);
}

export declare class Packager<T> {
  constructor(opts: PackagerOpts<T>);
}

export declare class Optimizer<T> {
  constructor(opts: OptimizerOpts<T>);
}

export declare class Reporter {
  constructor(opts: ReporterOpts);
}
