function ErrorWrapper(message, err){
    let newErr;
    try{
        throw Error(message);
    }catch (e) {
        newErr = e;
    }
    newErr.previousError = err;
    return newErr;
}

function createErrorWrapper(message, err){
    return ErrorWrapper(message, err);
}

function registerMandatoryCallback(callback, timeout){
    if(timeout == undefined){
        timeout = 5000; //5 seconds
    }
    let callbackCalled = false;
    let callStackErr = false;
    try{
        throw new Error("Callback should be called");
    } catch(err){
        callStackErr = err;
    }
    setTimeout(function(){
        if(!callbackCalled){
            reportUserRelevantError("Expected callback not called after " + timeout + " seconds. The calling stack is here: ", callStackErr);
        }
    }, timeout);

    return function(...args){
        callbackCalled = true;
        callback(...args);
    };
}

function OpenDSUSafeCallback(callback){
    if(callback) {
        return callback;
    }
    else return function(err, res){
        if(err){
            reportUserRelevantError("Unexpected error happened without proper handling:", err);
        } else {
            reportUserRelevantWarning("Ignored result. Please add a proper callback when using this function! " + res)
        }
    }
}

let errorObservers = [];
function reportUserRelevantError(message, err){
    errorObservers.forEach( c=> {
        c(message, err);
    })
    console.error(message, err);
}

function reportUserRelevantWarning(message){
    errorObservers.forEach( c=> {
        c(message);
    })
    console.trace(message);
}

function observeUserRelevantMessages(callback){
    errorObservers.push(callback);
}

module.exports = {
    createErrorWrapper,
    reportUserRelevantError,
    reportUserRelevantWarning,
    observeUserRelevantMessages,
    OpenDSUSafeCallback,
    registerMandatoryCallback,
}
