

function GroupPKDocument(identifier) {
    const DOMAIN = "default";
    const teamDID = `did:group:${identifier}`;

    let mixin = require("../W3CDID_Mixin");
    mixin(this);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    const openDSU = require("opendsu");
    const sc = openDSU.loadAPI("sc").getSecurityContext();
    const error = openDSU.loadAPI("error");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const resolver = openDSU.loadAPI("resolver");

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

                sc.addDID(teamDID, keySSI, (err) => {
                    if (err) {
                        return error.reportUserRelevantError(`Failed to add DID`, teamDID);
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
        sc.getKeySSIForDIDAsObject(teamDID, (err, keySSI) => {
            if (err) {
                __createDSU();
            } else {
                __loadDSU(keySSI);
            }
        });
    };

    this.addMember = (identity, alias, callback) => {
        if (typeof alias === "function") {
            callback = alias;
            alias = identity;
        }
        updateMembers("add", [identity], [alias], callback);
    };

    this.addMembers = (identities, aliases, callback) => {
        updateMembers("add", identities, aliases, callback);
    };

    this.removeMember = (identity, callback) => {
        updateMembers("remove", [identity], callback);
    };

    this.removeMembers = (identities, callback) => {
        updateMembers("remove", identities, callback);
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
        return teamDID;
    };

    this.getName = () => {
        return identifier;
    };

    this.sendMessage = (message, sender, callback) => {
        const w3cDID = openDSU.loadAPI("w3cdid");
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
                        const messageToSend = `${teamDID}|${sender}|${message}`;
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

    const updateMembers = (operation, identities, aliases, callback) => {
        if (typeof aliases === "function") {
            callback = aliases;
            aliases = identities;
        }

        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            if (operation === "remove") {
                identities.forEach(id => {
                    if (typeof members[id] !== "undefined") {
                        delete members[id];
                    }
                });

                return dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else if (operation === "add") {
                identities.forEach((id, index) => {
                    if (typeof members[id] === "undefined") {
                        members[id] = aliases[index]
                    }
                });
                return dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else {
                callback(Error(`Invalid operation ${operation}`));
            }
        });
    };

    bindAutoPendingFunctions(this, ["getIdentifier", "getName"]);
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
