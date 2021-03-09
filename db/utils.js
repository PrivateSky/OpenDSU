const crypto = require("crypto");

function uid(bytes = 32) {
  // node
  if (process) {
    return crypto.randomBytes(bytes).toString('base64')
  }
  // browser
  else {
    if (!crypto || !crypto.getRandomValues) {
      throw new Error('crypto.getRandomValues not supported by the browser.')
    }

    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
  }
}

module.exports = {uid}
