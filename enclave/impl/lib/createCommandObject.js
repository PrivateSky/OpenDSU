const commandNames = require("./commandsNames");
const createCommandObject = (commandName, ...args) => {
    let command = {
        commandName,
        params: {
            forDID: args[0]
        }
    };
    switch (commandName) {
        case commandNames.INSERT_RECORD:
        case commandNames.UPDATE_RECORD:
            command.params.tableName = args[1];
            command.params.pk = args[2];
            command.params.plainRecord = args[3];
            command.params.encryptedRecord = args[4];
            return command;
        case commandNames.GET_RECORD:
        case commandNames.DELETE_RECORD:
            command.params.tableName = args[1];
            command.params.pk = args[2];
            return command;
        case commandNames.FILTER_RECORDS:
            command.params.tableName = args[1];
            command.params.query = args[2];
            command.params.sort = args[3];
            command.params.limit = args[4];
            return command;
        case commandNames.ADD_IN_QUEUE:
            command.params.queueName = args[1];
            command.params.encryptedObject = args[2];
            return command;
        case commandNames.LIST_QUEUE:
            command.params.queueName = args[1];
            command.params.sortAfterInsertTime = args[2];
            command.params.onlyFirstN = args[3];
            return command;
        case commandNames.QUEUE_SIZE:
            command.params.queueName = args[1];
            return command;
        case commandNames.GET_OBJECT_FROM_QUEUE:
        case commandNames.DELETE_OBJECT_FROM_QUEUE:
            command.params.queueName = args[1];
            command.params.hash = args[2];
            return command;
        default:
            throw Error(`Invalid command <${commandName}>`)
    }
}

module.exports = {
    createCommandObject
}