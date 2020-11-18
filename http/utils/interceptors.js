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

function callInterceptors(target){
    interceptors.forEach(function(interceptor){
        target = interceptor(target);
    });
    return target;
}

function setupInterceptors(handler){
    const interceptMethods = [{name: "doPost", position: 2}, {name:"doPut", position: 2}, {name: "fetch", position: 1}];
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
            let result = callInterceptors(data);
            if(optionsAvailable){
                args[target.position]["headers"] = result.headers;
            }else{
                args.splice(target.position, 0, {headers: result.headers});
            }
            return method(...args);
        }
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