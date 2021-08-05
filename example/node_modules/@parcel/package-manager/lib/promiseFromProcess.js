"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = promiseFromProcess;

function promiseFromProcess(childProcess) {
  return new Promise((resolve, reject) => {
    childProcess.on('error', reject);
    childProcess.on('close', code => {
      if (code !== 0) {
        reject(new Error('Child process failed'));
        return;
      }

      resolve();
    });
  });
}