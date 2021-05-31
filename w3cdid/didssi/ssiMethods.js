function sRead_DIDMethod() {
    let pkDocument = require("./sReadDID");
    this.create = function (SeedSSI, callback) {
        callback(null, pkDocument.initiateDIDDocument(SeedSSI));
    }

    this.resolve = function (tokens, callback) {
        callback(null, pkDocument.createDIDDocument(tokens))
    }
}

function sReadPK_DIDMethod() {
    let pkDocument = require("./sReadPKDID");
    this.create = function (SeedSSI, callback) {
        callback(null, pkDocument.initiateDIDDocument(SeedSSI));
    }

    this.resolve = function (tokens, callback) {
        callback(null, pkDocument.createDIDDocument(tokens))
    }
}


function Alias_DIDMethod() {
    let aliasDocument = require("../proposals/aliasDocument");
    this.create = function (alias, SeedSSI, callback) {
        callback(null, aliasDocument.initiateDIDDocument(alias, SeedSSI));
    }

    this.resolve = function (tokens, callback) {
        callback(null, aliasDocument.createDIDDocument(tokens))
    }
}

function Const_DIDMethod() {
    const GroupDIDDocument = require("./GroupDIDDocument");

    this.create = (domain, constString, callback) => {
        callback(null, GroupDIDDocument.initiateDIDDocument(domain, constString));
    }

    this.resolve = (tokens, callback) => {
        callback(null, GroupDIDDocument.createDIDDocument(tokens))
    }
}

function Group_DIDMethod() {
    const GroupDIDDocument = require("./GroupDIDDocument");

    this.create = (domain, groupName, callback) => {
        callback(null, GroupDIDDocument.initiateDIDDocument(domain, groupName));
    }

    this.resolve = (tokens, callback) => {
        callback(null, GroupDIDDocument.createDIDDocument(tokens))
    }
}

function create_sReadPK_DIDMethod() {
    return new sReadPK_DIDMethod();
}

function create_sRead_DIDMethod() {
    return new sRead_DIDMethod();
}

function create_alias_DIDMethod() {
    return new Alias_DIDMethod();
}

function create_const_DIDMethod(domain, constString) {
    return new Const_DIDMethod();
}

function create_group_DIDMethod(domain, groupName) {
    return new Group_DIDMethod(domain, groupName);
}


module.exports = {
    create_sReadPK_DIDMethod,
    create_sRead_DIDMethod,
    create_const_DIDMethod,
    create_group_DIDMethod
}
