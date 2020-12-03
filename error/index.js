function ErrorWrapper(message, err){
    this.previousError = err;
    this.message = message;
    try{
        throw Error(message);
    }catch (e) {
        this.currentStack = e.stack;
    }
}

function createErrorWrapper(message, err){
    return new ErrorWrapper(message, err);
}

module.exports = {
    createErrorWrapper
}
