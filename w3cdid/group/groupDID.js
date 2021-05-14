function GroupPKDocument(keySSI) {
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    const error = require("../../error");
    const resolver = require("../../resolver");
    const w3cDID = require("../index");
    let mixin = require("../W3CDID_Mixin");
    mixin(this);

    let dsu;
    const MEMBERS_FILE = "members";
    resolver.loadDSU(keySSI, (err, dsuInstance) => {
        if (err) {
            return resolver.createDSU(keySSI, (err, dsuInstance) => {
                if (err) {
                    return error.reportUserRelevantError(`Failed to create DSU instance`, err);
                }

                dsu = dsuInstance;
                this.finishInitialisation();
            });
        }

        dsu = dsuInstance;
        this.finishInitialisation();
    });

    this.add = (memberAlias, callback) => {
        updateMembers("add", memberAlias, callback);
    };

    this.remove = (memberAlias, callback) => {
        updateMembers("remove", memberAlias, callback);
    };

    this.listMembersByAlias = (callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, Object.keys(members));
        });
    };

    this.listMembersByIdentifier = (callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, Object.values(members));
        });
    };

    this.getMemberAlias = (memberIdentifier, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const member = Object.keys(members).find(alias => members[alias] === memberIdentifier);
            if (typeof member === "undefined") {
                return callback(Error(`Failed to find member with id ${memberIdentifier}`));
            }
            callback(undefined, Object.keys(member)[0]);
        });
    };

    this.getMemberAlias = (memberAlias, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const memberIdentifier = members[memberAlias];
            if (typeof memberIdentifier === "undefined") {
                return callback(Error(`Failed to find member with alias ${memberAlias}`));
            }
            callback(undefined, memberIdentifier);
        });
    };

    const readMembers = (callback) => {
        dsu.readFile(MEMBERS_FILE, (err, members) => {
            if (err || typeof members === "undefined") {
                members = {};
            } else {
                try {
                    members = JSON.parse(members.toString());
                } catch (e) {
                    return callback(e);
                }
            }

            callback(undefined, members);
        });
    };

    const updateMembers = (operation, updatedMemberAlias, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            if (operation === "remove") {
                delete members[updatedMemberAlias];
                dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else if (operation === "add") {
                w3cDID.createIdentity("demo", memberAlias, (err, demoDIDDocument) => {
                    if (err) {
                        return callback(err);
                    }

                    members[memberAlias] = demoDIDDocument.getIdentifier();
                    dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
                });
            } else {
                callback(Error(`Invalid operation ${operation}`));
            }
        });
    };

    bindAutoPendingFunctions(this);
    return this;
}

function GROUP_DIDMethod() {
    this.create = function (keySSI, callback) {
        callback(null, new GroupPKDocument(keySSI));
    }

    this.resolve = function (tokens, callback) {
        callback(null, new GroupPKDocument(tokens[2]));
    }
}

module.exports.create_group_DIDMethod = function () {
    return new GROUP_DIDMethod();
}
