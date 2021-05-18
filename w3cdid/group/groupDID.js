

function GroupPKDocument(identifier) {
    const DOMAIN = "default";
    const teamID = `did:group:${identifier}`;

    let mixin = require("../W3CDID_Mixin");
    mixin(this);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;

    const sc = require("../../index").loadAPI("sc").getSecurityContext();
    const error = require("../../index").loadAPI("error");
    const keySSISpace = require("../../index").loadAPI("keyssi");
    const resolver = require("../../index").loadAPI("resolver");

    let dsu;
    const MEMBERS_FILE = "members";

    const __createDSU = () => {
        resolver.createDSU(keySSISpace.createTemplateSeedSSI(DOMAIN), (err, dsuInstance) => {
            if (err) {
                return error.reportUserRelevantError(`Failed to create DSU instance`, err);
            }

            dsu = dsuInstance;
            dsuInstance.getKeySSIAsString((err, keySSI) => {
                if (err) {
                    return error.reportUserRelevantError(`Failed to get keySSI`, err);
                }

                sc.addDID(teamID, keySSI, (err) => {
                    if (err) {
                        return error.reportUserRelevantError(`Failed to add DID`, teamID);
                    }

                    this.finishInitialisation();
                });
            });
        });
    };

    const __loadDSU = (keySSI) => {
        resolver.loadDSU(keySSI, (err, dsuInstance) => {
            if (err) {
                return error.reportUserRelevantError(`Failed to load DSU instance`, err);
            }

            dsu = dsuInstance;
            this.finishInitialisation();
        });
    };

    const init = () => {
        sc.getKeySSIForDID(teamID, (err, keySSI) => {
            if (err) {
                __createDSU();
            } else {
                __loadDSU(keySSI);
            }
        });
    };

    this.addMember = (identity, alias, callback) => {
        updateMembers("add", identity, alias, callback);
    };

    this.removeMember = (identity, callback) => {
        updateMembers("remove", identity, callback);
    };

    this.listMembersByAlias = (callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, Object.values(members));
        });
    };

    this.listMembersByIdentity = (callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, Object.keys(members));
        });
    };

    this.getMemberIdentity = (alias, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const member = Object.keys(members).find(identifier => members[identifier] === alias);
            if (typeof member === "undefined") {
                return callback(Error(`Failed to find member with alias ${alias}`));
            }
            callback(undefined, Object.keys(member)[0]);
        });
    };

    this.getMemberAlias = (identity, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const memberAlias = members[identity];
            if (typeof memberAlias === "undefined") {
                return callback(Error(`Failed to find member with id ${identity}`));
            }
            callback(undefined, memberAlias);
        });
    };

    this.getIdentifier = () => {
        return teamID;
    };

    this.sendMessage = (message, sender, callback) => {
        const w3cDID = require("../../index").loadAPI("w3cdid");
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            w3cDID.resolveDID(sender, (err, senderDIDDocument) => {
                if (err) {
                    return callback(err);
                }

                const TaskCounter = require("swarmutils").TaskCounter;
                const tc = new TaskCounter(() => {
                    return callback();
                });

                const membersIds = Object.keys(members);
                const noMembers = membersIds.length;
                tc.increment(noMembers - 1);

                for (let i = 0; i < noMembers; i++) {
                    if (membersIds[i] !== sender) {
                        const messageToSend = `${teamID}|${sender}|${message}`;
                        senderDIDDocument.sendMessage(messageToSend, membersIds[i], (err) => {
                            if (err) {
                                return callback(err);
                            }

                            tc.decrement();
                        });
                    }
                }
            });
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

    const updateMembers = (operation, identity, alias, callback) => {
        if (typeof alias === "function") {
            callback = alias;
            alias = identity;
        }
        readMembers((err, members) => {
            debugger;
            if (err) {
                return callback(err);
            }

            if (operation === "remove") {
                delete members[identity];
                return dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), err => {
                    if (err) {
                        return callback(err);
                    }

                    callback();
                });
            } else if (operation === "add") {
                members[identity] = alias;
                return dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else {
                callback(Error(`Invalid operation ${operation}`));
            }
        });
    };

    bindAutoPendingFunctions(this);
    init();
    return this;
}

function GROUP_DIDMethod() {
    this.create = function (identifier, callback) {
        callback(null, new GroupPKDocument(identifier));
    }

    this.resolve = function (tokens, callback) {
        callback(null, new GroupPKDocument(tokens[2]));
    }
}

module.exports.create_group_DIDMethod = function () {
    return new GROUP_DIDMethod();
}
