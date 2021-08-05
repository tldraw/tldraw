"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getCertificate;

async function getCertificate(fs, options) {
  try {
    let cert = await fs.readFile(options.cert);
    let key = await fs.readFile(options.key);
    return {
      key,
      cert
    };
  } catch (err) {
    throw new Error('Certificate and/or key not found');
  }
}