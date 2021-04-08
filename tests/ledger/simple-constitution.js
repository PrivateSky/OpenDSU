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
        //this.transaction.add(agent);
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
