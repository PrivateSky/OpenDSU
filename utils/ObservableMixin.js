function ObservableMixin(target) {
    let observers = {};

    target.on = function(eventType, callback){
        let arr = observers[eventType];
        if(!arr){
            arr = observers[eventType] = [];
        }
        arr.push(callback);
    }

    target.off = function(eventType, callback){
        let arr = observers[eventType];
        if(!arr){
            //nothing to do...
            reportDevRelevantInfo("Off-ing an unknown observer");
            return;
        }
        let index = handlers[eventName].indexOf(callback);
        if(index === -1){
            reportDevRelevantInfo("Observer not found into the list of known observers.");
            return;
        }

        handlers[eventName].splice(index, 1);
    }

    target.dispatchEvent = function(eventType, message){
        let arr = observers[eventType];
        if(!arr){
            //no handlers registered
            reportDevRelevantInfo(`No observers found for event type ${eventType}`);
            return;
        }

        arr.forEach( c => {
            try{
                c(message);
            }catch(err){
                reportDevRelevantInfo(`Caught an error during the delivery of ${eventType} to ${c.toString()}`);
            }

        });
    }
}

module.exports = ObservableMixin;