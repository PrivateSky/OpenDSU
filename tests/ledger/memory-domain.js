require("callflow").initialise();

const bm = require("blockchain");

$$.asset.describe("Agent", {
    public: {
        alias: "string @resolver @minmax<ss> @sss",
        publicKey: "string @dsds",
    },
    init: function (alias, value) {
        this.alias = alias;
        this.publicKey = value;
    },
    ctor: function () {
        this.securityParadigm.constitutional();
    },
});

$$.transaction.describe("Constitution", {
    addAgent: function (alias, publicKey) {
        console.log("Adding Agent:", alias, publicKey);
        let agent = this.transaction.createAsset("Agent", "init", alias, publicKey);
        this.return(null, { alias, publicKey });
        this.commit();
    },
    updatePublicKey: function (alias, publicKey) {
        let agent = this.transaction.lookup("Agent", alias);
        agent.publicKey = publicKey;
        this.transaction.add(agent);
        this.transaction.commit();
        console.log("Updating Agent:", alias, "PublicKey:", publicKey);
    },
});

function init() {
    let worldStateCache = bm.createWorldStateCache("memory");
    let historyStorage = bm.createHistoryStorage("memory");
    let consensusAlgorithm = bm.createConsensusAlgorithm("direct");
    let signatureProvider = bm.createSignatureProvider("permissive");

    console.log("### Creating blockchain...");
    bm.createBlockchain(worldStateCache, historyStorage, consensusAlgorithm, signatureProvider);
}

init();
