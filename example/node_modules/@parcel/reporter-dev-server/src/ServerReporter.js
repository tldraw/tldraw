// @flow

import {Reporter} from '@parcel/plugin';
import HMRServer from './HMRServer';
import Server from './Server';

let servers: Map<number, Server> = new Map();
let hmrServers: Map<number, HMRServer> = new Map();
export default (new Reporter({
  async report({event, options, logger}) {
    let {serveOptions, hmrOptions} = options;
    let server = serveOptions ? servers.get(serveOptions.port) : undefined;
    let hmrPort =
      (hmrOptions && hmrOptions.port) || (serveOptions && serveOptions.port);
    let hmrServer = hmrPort ? hmrServers.get(hmrPort) : undefined;
    switch (event.type) {
      case 'watchStart': {
        if (serveOptions) {
          // If there's already a server when watching has just started, something
          // is wrong.
          if (server) {
            return logger.warn({
              message: 'Trying to create the devserver but it already exists.',
            });
          }

          let serverOptions = {
            ...serveOptions,
            projectRoot: options.projectRoot,
            cacheDir: options.cacheDir,
            // Override the target's publicUrl as that is likely meant for production.
            // This could be configurable in the future.
            publicUrl: serveOptions.publicUrl ?? '/',
            inputFS: options.inputFS,
            outputFS: options.outputFS,
            logger,
          };

          server = new Server(serverOptions);
          servers.set(serveOptions.port, server);
          const devServer = await server.start();

          if (hmrOptions && hmrOptions.port === serveOptions.port) {
            let hmrServerOptions = {
              port: serveOptions.port,
              devServer,
              logger,
            };
            hmrServer = new HMRServer(hmrServerOptions);
            hmrServers.set(serveOptions.port, hmrServer);
            hmrServer.start();
            return;
          }
        }

        let port = hmrOptions?.port;
        if (typeof port === 'number') {
          let hmrServerOptions = {port, logger};
          hmrServer = new HMRServer(hmrServerOptions);
          hmrServers.set(port, hmrServer);
          hmrServer.start();
        }
        break;
      }
      case 'watchEnd':
        if (serveOptions) {
          if (!server) {
            return logger.warn({
              message:
                'Could not shutdown devserver because it does not exist.',
            });
          }
          await server.stop();
          servers.delete(server.options.port);
        }
        if (hmrOptions && hmrServer) {
          hmrServer.stop();
          // $FlowFixMe[prop-missing]
          hmrServers.delete(hmrServer.wss.options.port);
        }
        break;
      case 'buildStart':
        if (server) {
          server.buildStart();
        }
        break;
      case 'buildSuccess':
        if (serveOptions) {
          if (!server) {
            return logger.warn({
              message:
                'Could not send success event to devserver because it does not exist.',
            });
          }

          server.buildSuccess(event.bundleGraph, event.requestBundle);
        }
        if (hmrServer) {
          hmrServer.emitUpdate(event);
        }
        break;
      case 'buildFailure':
        // On buildFailure watchStart sometimes has not been called yet
        // do not throw an additional warning here
        if (server) {
          await server.buildError(options, event.diagnostics);
        }
        if (hmrServer) {
          await hmrServer.emitError(options, event.diagnostics);
        }
        break;
    }
  },
}): Reporter);
