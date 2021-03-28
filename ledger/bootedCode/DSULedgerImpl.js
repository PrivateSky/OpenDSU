

module.exports.createDSULedger = function(keySSI, constitutionKeySSI){
    let bm = require('blockchain');




    require('./testUtil/simplestConstitution');
    /*
    var tu = require('testUtil');
    const storageFolder = "./storageFolder";
    tu.deleteFolderRecursive(storageFolder); */


    let  worldStateCache     =  bm.createWorldStateCache("memory");
    let  historyStorage      =  require("../strategies/DSUHistoryStorage").createDSUHistoryStorage(keySSI);
    let  consensusAlgorithm  =  bm.createConsensusAlgorithm("direct");
    let  signatureProvider   =  bm.createSignatureProvider("permissive");

    let myBlockchain = bm.createABlockchain(worldStateCache, historyStorage, consensusAlgorithm, signatureProvider);

    myBlockchain.start(function(err, res){
        /*myBlockchain.startTransactionAs("agent","Constitution", "addAgent",agentAlias, "PublicKey");
        let agent = myBlockchain.lookup("Agent", agentAlias);
        */
    });

    return myBlockchain;
}


module.exports.loadDSULedger = function(keySSI){

}