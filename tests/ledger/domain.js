console.log('Loading domain');
// require('./pskruntime');
// console.log('Loaded pskruntime');

require('callflow').initialise();

const bm = require('blockchain');

$$.asset.describe("Agent", {
    public: {
        alias: "string @resolver @minmax<ss> @sss",
        publicKey: "string @dsds"
    },
    init: function (alias, value) {
        this.alias = alias;
        this.publicKey = value;
    },
    ctor: function () {
        this.securityParadigm.constitutional();
    }
});


$$.transaction.describe("Constitution", {
    addAgent: function (alias, publicKey) {
        console.log("Adding Agent:", alias, publicKey);
        let agent = this.transaction.createAsset("Agent", "init", alias, publicKey);
        //this.transaction.add(agent);
        this.commit();
    },
    updatePublicKey: function (alias, publicKey) {
        let agent = this.transaction.lookup("Agent", alias);
        agent.publicKey = publicKey;
        this.transaction.add(agent);
        this.transaction.commit();
        console.log("Updating Agent:", alias, "PublicKey:", publicKey);
    }
})

function init() {
    const keySSI = rawDossierKeySSIAsString;

    const opendsu = require("opendsu");
    const ledger = opendsu.loadApi('ledger');

    let worldStateCache = bm.createWorldStateCache("memory");
    let historyStorage = bm.createHistoryStorage("memory");
    // let historyStorage = ledger.createDSUHistoryStorage(keySSI);
    let consensusAlgorithm = bm.createConsensusAlgorithm("direct");
    let signatureProvider = bm.createSignatureProvider("permissive");

    console.log('### Creating blockchain...')
    bm.createBlockchain(worldStateCache, historyStorage, consensusAlgorithm, signatureProvider);

    // if ($$.blockchain) {
    //     // load blockchain
    // } else {
    //     bm.createBlockchain(worldStateCache, historyStorage, consensusAlgorithm, signatureProvider);
    // }

    // $$.blockchain.start(function (err, res) {
    //     console.log('### Blockchain started...')
    //     const agentAlias = "Smoky";
    //     $$.blockchain.startTransactionAs("agent", "Constitution", "addAgent", agentAlias, "PublicKey");
    //     let agent = $$.blockchain.lookup("Agent", agentAlias);
    //     console.log('###RESULT', agent.publicKey, "PublicKey");
    // });
}

init();


