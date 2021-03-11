function ErrorWrapper(message, err, otherErrors){
    let newErr;
    try{
        throw Error(message);
    }catch (e) {
        newErr = e;
    }
    newErr.previousError = err;
    newErr.debug_message = message;
    if(err){
        newErr.debug_stack   = err.stack;
    }
    if(otherErrors){
        newErr.otherErrors = otherErrors;
    }
    return newErr;
}

function createOpenDSUErrorWrapper(message, err, otherErrors){
    if(typeof message !== "string"){
        if(typeof err != "undefined"){
            err = message;
            message = "Wrong usage of createErrorWrapper";
        } else {
            message = "Wrong usage of createErrorWrapper";
        }
    }
    return ErrorWrapper(message, err, otherErrors);
}

function registerMandatoryCallback(callback, timeout = 5000){
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
    if(callback && typeof callback === 'function') {
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
let infoObservers = [];
let warnObservers = [];
let devObservers = [];
function reportUserRelevantError(message, err){
    errorObservers.forEach( c=> {
        c(message, err);
    })
    console.error(message, err);
}

function reportUserRelevantWarning(message){
    warnObservers.forEach( c=> {
        c(message);
    })
    console.log(">>>",message);
}


function reportUserRelevantInfo(message){
    infoObservers.forEach( c=> {
        c(message);
    })
    console.log(">>>",message);
}

function reportDevRelevantInfo(message){
    devObservers.forEach( c=> {
        c(message);
    })
    console.log(">>>",message);
}

function observeUserRelevantMessages(type, callback){
    switch(type){
        case "error": errorObservers.push(callback);break;
        case "info": infoObservers.push(callback);break;
        case "warn": warnObservers.push(callback);break;
        case "dev": devObservers.push(callback);break;
        default: devObservers.push(callback);break;
    }
}

function printErrorWrapper(ew){
    let level = 0;
     while(ew){
         console.log("Error at layer ",level," :", ew);
         level++;
         ew = ew.previousError;
     }
}

function printOpenDSUError(...args){
    for( let elem of args){
        if( typeof elem.previousError !=  "undefined"){
            printErrorWrapper(elem);
        } else {
            console.log(elem);
        }
    }
}

module.exports = {
    createOpenDSUErrorWrapper,
    reportUserRelevantError,
    reportUserRelevantWarning,
    reportUserRelevantInfo,
    reportDevRelevantInfo,
    observeUserRelevantMessages,
    OpenDSUSafeCallback,
    registerMandatoryCallback,
    printOpenDSUError
}
