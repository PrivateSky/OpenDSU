const createCommandObject = (commandName, ...args) => {
    const commandID = require('crypto').randomBytes(32).toString("base64")
    const timestamp = args.pop();
    return {
        commandName,
        commandID,
        timestamp,
        params: [
            ...args
        ]
    };
}

module.exports = {
    createCommandObject
}