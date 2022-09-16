const createCommandObject = (commandName, ...args) => {
    const commandID = require('crypto').randomBytes(32).toString("base64")

    return {
        commandName,
        commandID,
        params: [
            ...args
        ]
    };
}

module.exports = {
    createCommandObject
}