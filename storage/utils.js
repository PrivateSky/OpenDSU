function promisify(fun) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      function callback(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }

      args.push(callback);

      fun.call(this, ...args);
    });
  };
}

function executeFetch(url, options) {
  // check if we need to add the BASE_URL to the prefix of the url
  const isBaseUrlSet =
    $$ &&
    $$.SSAPP_CONTEXT &&
    $$.SSAPP_CONTEXT.BASE_URL &&
    $$.SSAPP_CONTEXT.SEED &&
    url.indexOf($$.SSAPP_CONTEXT.BASE_URL) !== 0;
  if (isBaseUrlSet && url.indexOf("data:image") !== 0) {
    // BASE_URL ends with / so make sure that url doesn't already start with /
    url = `${$$.SSAPP_CONTEXT.BASE_URL}${
      url.indexOf("/") === 0 ? url.substr(1) : url
    }`;
  }

  const http = require("opendsu").loadAPI("http");
  return http.fetch(url, options);
}

module.exports = {
  promisify,
  fetch: executeFetch,
};
