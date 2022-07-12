function ErrorWrapper(message, err, otherErrors){
    let newErr = {};

    err = err || {};

    if (err.message || otherErrors) {
        if (err.originalMessage) {
            newErr.originalMessage = err.originalMessage;
        } else {
            newErr.originalMessage = err.message;
            if (otherErrors) {
                if (typeof otherErrors === "string") {
                    newErr.originalMessage += otherErrors;
                }

                if (Array.isArray(otherErrors)) {
                    otherErrors.forEach(e => newErr.originalMessage += `[${e.message}]`);
                }
            }
            if (typeof newErr.originalMessage === "string") {
                newErr.originalMessage = newErr.originalMessage.replace(/\n/g, " ");
            }
        }

    }

    try {
        if (err.originalMessage) {
            newErr = new Error(message + `(${err.originalMessage})`);
            newErr.originalMessage = err.originalMessage;
        } else {
            newErr = new Error(newErr.originalMessage);
            newErr.originalMessage = newErr.message;
        }
        throw newErr;
    } catch (e) {
        newErr = e;
    }
    newErr.previousError = err;
    newErr.debug_message = message;
    if (err.stack) {
        newErr.debug_stack   = err.stack;
    }
    if (otherErrors) {
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

function registerMandatoryCallback(callback, timeout){
    if(timeout == undefined){
        timeout = 5000; //5 seconds
    }
    let callStackErr = false;
    try{
        throw new Error("Callback should be called");
    } catch(err){
        callStackErr = err;
    }
    const timeoutId = setTimeout(function () {
        reportUserRelevantError("Expected callback not called after " + timeout + " seconds. The calling stack is here: ", callStackErr);
    }, timeout);

    return function(...args){
        clearTimeout(timeoutId);
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

let observable = require("./../utils/observable").createObservable();
let devObservers = [];
function reportUserRelevantError(message, err, showIntermediateErrors){
    observable.dispatchEvent("error", {message, err});
    console.log(message);
    if(err && typeof err.debug_message != "undefined"){
        printErrorWrapper(err, showIntermediateErrors);
    }
}

function reportUserRelevantWarning(message){
    observable.dispatchEvent("warn", message);
    console.log(">>>",message);
}


function reportUserRelevantInfo(message){
    observable.dispatchEvent("info", message);
    console.log(">>>",message);
}

function reportDevRelevantInfo(message){
    devObservers.forEach( c=> {
        c(message);
    })
    console.log(">>>",message);
}

function unobserveUserRelevantMessages(type, callback){
    switch(type){
        case "error": observable.off(type, callback);break;
        case "info": observable.off(type, callback);break;
        case "warn": observable.off(type, callback);break;
        default:
            let index = devObservers.indexOf(callback);
            if(index !==-1){
                devObservers.splice(index, 1);
            }
    }
}

function observeUserRelevantMessages(type, callback){
    switch(type){
        case "error": observable.on(type, callback);break;
        case "info": observable.on(type, callback);break;
        case "warn": observable.on(type, callback);break;
        case "dev": devObservers.push(callback);break;
        default: devObservers.push(callback);break;
    }
}

function printErrorWrapper(ew, showIntermediateErrors){
    let level = 0;
    console.log("Top level error:",  ew.debug_message, ew.debug_stack);
    let firstError;
    ew = ew.previousError;
     while(ew){
         if(showIntermediateErrors && ew.previousError){
             console.log("Error at layer ",level," :", ew.debug_message, ew.debug_stack);
         }
         level++;
         firstError = ew;
         ew = ew.previousError;
     }
    console.log("\tFirst error in the ErrorWrapper at level ",level," :", firstError);
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

const DB_INSERT_EXISTING_RECORD_ERROR = "Trying to insert into existing record";

module.exports = {
    createOpenDSUErrorWrapper,
    reportUserRelevantError,
    reportUserRelevantWarning,
    reportUserRelevantInfo,
    reportDevRelevantInfo,
    observeUserRelevantMessages,
    unobserveUserRelevantMessages,
    OpenDSUSafeCallback,
    registerMandatoryCallback,
    printOpenDSUError,
    DB_INSERT_EXISTING_RECORD_ERROR
}
