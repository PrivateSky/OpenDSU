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
            reportDevRelevantInfo("Off-ing an unknown observer");
        } else {
            arr.removeItem(callback);
        }
    }

    target.dispatchEvent = function(eventType, message){
        let arr = observers[eventType];
        if(arr){
            arr.forEach( c => {
                c(message);
            })
        }
    }
}

module.exports = ObservableMixin;