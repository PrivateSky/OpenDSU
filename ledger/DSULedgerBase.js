/*




 */

function DSULedgerBase(dsuKeySSI, constitutionKeySSI){
    let self = this;
    let dsuHandler;

    if(constitutionKeySSI){
        //try to iniliase
    } else {
        dsuHandler = require("../resolver").getHandler(dsuKeySSI, 'require("openDSU").bootCode()');

    }

    this.setMyIdentity = function(did){
        // all the transactions will be executed in the name of this did (will be signed with the private key corresponding to the did)
    }


    this.getKey = function(keyName){
        //it assumes in the constitution the existence of a transaction getKey
    }

    this.putKey = function(keyName, value){
        // will work only after calling setMyIdentity
        //it assumes in the constitution the existence of a transaction putKey
    }

    //Secondary importance functions
    this.addAPI = function(apiName, func){
        //syntactic sugar to allow calls like  ledger.apiName. the function will be bound to this so it can access startTransaction and other functions
        this[apiName] = func;
        func.bind(self);
    }


    this.startTransaction = function (transactionName,...args){

    }

    this.enableConstitutionAPIs = function(){
        //all the APIs from the constitution become members in the ledger
    }


}

module.exports = DSULedgerBase;
