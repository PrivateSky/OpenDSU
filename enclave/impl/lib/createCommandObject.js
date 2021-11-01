const createCommandObject = (commandName, ...args) => {
    return {
        commandName,
        params: [
            ...args
        ]
    };
}

module.exports = {
    createCommandObject
}