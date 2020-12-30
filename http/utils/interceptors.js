let interceptors = [];

function registerInterceptor(interceptor){
    if(typeof interceptor !== "function"){
        throw new Error('interceptor argument should be a function');
    }
    interceptors.push(interceptor);
}

function unregisterInterceptor(interceptor){
    let index = interceptors.indexOf(interceptor);
    if(index !== -1){
        interceptors.splice(index, 1);
    }
}

function callInterceptors(target, callback){
    let index = -1;
    function executeInterceptor(result){
        index++;
        if(index >= interceptors.length){
            return callback(undefined, result);
        }
        let interceptor = interceptors[index];
        interceptor(target, (err, result)=>{
            if(err){
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to execute interceptor`, err));
            }
            return executeInterceptor(result);
        });
    }
    executeInterceptor(target);
}

function setupInterceptors(handler){
    const interceptMethods = [{name: "doPost", position: 2}, {name:"doPut", position: 2}];
    interceptMethods.forEach(function(target){
        let method = handler[target.name];
        handler[target.name] = function(...args){
            let headers = {};
            let optionsAvailable = false;
            if(args.length > target.position+1 && ["function", "undefined"].indexOf(typeof args[target.position]) === -1){
                headers = args[target.position]["headers"];
                optionsAvailable = true;
            }

            let data = {url: args[0], headers};
            callInterceptors(data, function(err, result){
                if(optionsAvailable){
                    args[target.position]["headers"] = result.headers;
                }else{
                    args.splice(target.position, 0, {headers: result.headers});
                }

                return method(...args);
            });
        }
    });

    const promisedBasedInterceptors = [{name: "fetch", position: 1}];
    promisedBasedInterceptors.forEach(function(target){
        let method = handler[target.name];
        handler[target.name] = function(...args){
            return new Promise((resolve, reject) => {
                if (args.length === 1) {
                    args.push({headers: {}});
                }

                if(typeof args[1].headers === "undefined"){
                    args[1].headers = {};
                }
                let headers = args[1].headers;

                let data = {url: args[0], headers};
                callInterceptors(data, function(err, result) {

                    let options = args[target.position];
                    options.headers = result.headers;

                    method(...args)
                        .then((...args) => {
                            resolve(...args);
                        })
                        .catch((...args) => {
                            reject(...args);
                        });
                });
            });
        };
    });
}

function enable(handler){
    //exposing working methods
    handler.registerInterceptor = registerInterceptor;
    handler.unregisterInterceptor = unregisterInterceptor;
    //setting up the interception mechanism
    setupInterceptors(handler);
}

module.exports = {enable};