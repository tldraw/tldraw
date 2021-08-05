"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = serverErrors;
const serverErrorList = {
  EACCES: "You don't have access to bind the server to port {port}.",
  EADDRINUSE: 'There is already a process listening on port {port}.'
};

function serverErrors(err, port) {
  let desc = `Error: ${err.code} occurred while setting up server on port ${port.toString()}.`;

  if (serverErrorList[err.code]) {
    desc = serverErrorList[err.code].replace(/{port}/g, port);
  }

  return desc;
}