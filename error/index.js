function ErrorWrapper(message, err){
    this.previousError = err;
    this.message = message;
    try{
        throw Error(message);
    }catch (e) {
        this.currentStack = e.stack.toString();
    }
}

function createErrorWrapper(message, err){
    return new ErrorWrapper(message, err);
}

let errorObservers = [];
function reportUserRelevantError(message, err){
    errorObservers.forEach( c=> {
        c(message, err);
        console.error(message, err);
    })
}

function reportUserRelevantWarning(message){
    errorObservers.forEach( c=> {
        c(message);
        console.log(message);
    })
}

function observeUserRelevantMessages(callback){
    errorObservers.push(callback);
}

module.exports = {
    createErrorWrapper,
    reportUserRelevantError,
    reportUserRelevantWarning,
    observeUserRelevantMessages
}
