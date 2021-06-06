function GroupDIDDocument(domain, groupName) {
    if (typeof domain === "undefined" || typeof groupName === "undefined") {
        throw Error(`Invalid number of arguments. Expected blockchain domain and group name.`);
    }

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
    const WRITABLE_DSU_PATH = "writableDSU";

    const createDSU = async () => {
        let constDSU;
        try {
            constDSU = await $$.promisify(resolver.createConstDSU)(domain, groupName);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create constDSU`, e);
        }

        let seedSSI;
        try {
            dsu = await $$.promisify(resolver.createSeedDSU)(domain);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to create writableDSU`, e);
        }

        try {
            seedSSI = await $$.promisify(dsu.getKeySSIAsString)();
        } catch (e) {
            return error.reportUserRelevantError(`Failed to get seedSSI`, e);
        }

        try {
            await $$.promisify(constDSU.mount)(WRITABLE_DSU_PATH, seedSSI);
        } catch (e) {
            return error.reportUserRelevantError(`Failed to mount writable DSU`, e);
        }

        this.finishInitialisation();
    };

    const init = () => {
        resolver.loadDSU(keySSISpace.createConstSSI(domain, groupName), async (err, constDSUInstance) => {
            if (err) {
                try {
                    await createDSU();
                } catch (e) {
                    return error.reportUserRelevantError(`Failed to create const DSU`, e);
                }
                return;
            }

            try {
                const dsuContext = await $$.promisify(constDSUInstance.getArchiveForPath)(WRITABLE_DSU_PATH);
                dsu = dsuContext.archive;
            } catch (e) {
                return error.reportUserRelevantError(`Failed to load writableDSU`, e);
            }

            this.finishInitialisation();
        });
    }

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
        return `did:ssi:group:${domain}:${groupName}`;
    };

    this.getGroupName = () => {
        return groupName;
    };

    this.sendMessage = (message, callback) => {
        const w3cDID = openDSU.loadAPI("w3cdid");
        readMembers(async (err, members) => {
            if (err) {
                return callback(err);
            }

            let senderDIDDocument;
            try {
                senderDIDDocument = await $$.promisify(w3cDID.resolveDID)(message.getSender());
            } catch (e) {
                return callback(e);
            }

            const membersIds = Object.keys(members);
            const noMembers = membersIds.length;

            let counter = noMembers - 1;
            for (let i = 0; i < noMembers; i++) {
                if (membersIds[i] !== message.getSender()) {
                    try {
                        await $$.promisify(senderDIDDocument.sendMessage)(message.getSerialisation(), membersIds[i])
                    } catch (e) {
                        return callback(e);
                    }

                    counter--;
                    if (counter === 0) {
                        return callback();
                    }
                }
            }
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

    bindAutoPendingFunctions(this, ["getIdentifier", "getGroupName"]);
    init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (domain, groupName) {
        return new GroupDIDDocument(domain, groupName)
    },
    createDIDDocument: function (tokens) {
        return new GroupDIDDocument(tokens[3], tokens[4]);
    }
};
