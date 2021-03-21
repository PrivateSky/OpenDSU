const constants = require("../moduleConstants");
const system = require("../system");
function getBaseURL(){
    switch ($$.environmentType) {
        case constants.ENVIRONMENT_TYPES.SERVICE_WORKER_ENVIRONMENT_TYPE:
            let scope = self.registration.scope;

            let parts = scope.split("/");
            return `${parts[0]}//${parts[2]}`;

        case constants.ENVIRONMENT_TYPES.BROWSER_ENVIRONMENT_TYPE:            
            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const port = window.location.port;

            return `${protocol}//${host}:${port}`;

        case constants.ENVIRONMENT_TYPES.WEB_WORKER_ENVIRONMENT_TYPE:            
            return self.location.origin;

        case constants.ENVIRONMENT_TYPES.NODEJS_ENVIRONMENT_TYPE:
            let baseUrl = system.getEnvironmentVariable(constants.BDNS_ROOT_HOSTS);
            if (typeof baseUrl === "undefined") {
                baseUrl = "http://localhost:8080";
            }
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.slice(0, -1);
            }
            return baseUrl;

        default:
    }
}

module.exports = getBaseURL;