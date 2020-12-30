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
    OpenDSUSafeCallback
}
