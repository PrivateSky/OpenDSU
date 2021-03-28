/*




 */

function DSULedgerBase(dsuKeySSI) {
    const self = this;
    const dsuHandler = require("../resolver").getDSUHandler(dsuKeySSI);

    dsuHandler.addAPI('startTransaction');
    dsuHandler.addAPI('lookup');


    this.setMyIdentity = function (did) {
        // all the transactions will be executed in the name of this did (will be signed with the private key corresponding to the did)
    }


    this.getKey = function (keyName) {
        //it assumes in the constitution the existence of a transaction getKey in the ledger constitution
    }

    this.putKey = function (keyName, value) {
        // will work only after calling setMyIdentity and it assumes in the constitution the existence of a transaction putKey in the ledger constitution
    }

    //Secondary importance functions
    this.addAPI = function (apiName, func) {
        //syntactic sugar to allow calls like  ledger.apiName. The "func" function will be bound to "this" so it can access startTransaction and other functions
        this[apiName] = func;
        func.bind(self);
    }


    this.startTransaction = function (transactionName, ...args) {
        dsuHandler.startTransaction(transactionName, ...args);
    }

    this.lookup = function (...args) {
        dsuHandler.lookup(...args);
    }

    this.enableConstitutionAPIs = function () {
        //all the APIs from the constitution become members in the ledger
    }

    /*  */

}


module.exports = DSULedgerBase;
