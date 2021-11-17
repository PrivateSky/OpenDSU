const methodsNames = require("../didMethodsNames");

function GroupDID_Document(enclave, domain, groupName, isInitialisation) {
    if (typeof domain === "undefined" || typeof groupName === "undefined") {
        throw Error(`Invalid number of arguments. Expected blockchain domain and group name.`);
    }

    let mixin = require("./ConstDID_Document_Mixin");
    mixin(this, enclave, domain, groupName, isInitialisation);
    const bindAutoPendingFunctions = require("../../utils/BindAutoPendingFunctions").bindAutoPendingFunctions;
    const openDSU = require("opendsu");
    const MEMBERS_FILE = "members";

    this.getMethodName = () => {
        return methodsNames.GROUP_METHOD_NAME;
    }

    this.addMember = (identity, memberInfo, callback) => {
        if (typeof memberInfo === "function") {
            callback = memberInfo;
            memberInfo = identity;
        }
        updateMembers("add", [identity], [memberInfo], callback);
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

    this.listMembersInfo = (callback) => {
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

    this.getMemberIdentity = (name, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const member = Object.keys(members).find(identifier => members[identifier] === name);
            if (typeof member === "undefined") {
                return callback(Error(`Failed to find member with alias ${name}`));
            }
            callback(undefined, Object.keys(member)[0]);
        });
    };

    this.getMemberInfo = (identity, callback) => {
        readMembers((err, members) => {
            if (err) {
                return callback(err);
            }

            const memberInfo = members[identity];
            if (typeof memberInfo === "undefined") {
                return callback(Error(`Failed to find member with id ${identity}`));
            }
            callback(undefined, memberInfo);
        });
    };

    this.getMembers = (callback) => {
        readMembers(callback);
    }

    this.getIdentifier = () => {
        return `did:ssi:group:${domain}:${groupName}`;
    };

    this.getGroupName = () => {
        return groupName;
    };

    this.sendMessage = (message, callback) => {
        const w3cDID = openDSU.loadAPI("w3cdid");
        if (typeof message === "object") {
            try {
                message = message.getSerialisation();
            } catch (e) {
                return callback(e);
            }
        }
        readMembers(async (err, members) => {
            if (err) {
                return callback(err);
            }

            const membersIds = Object.keys(members);
            const noMembers = membersIds.length;
            let senderDIDDocument;
            try{
                senderDIDDocument = await $$.promisify(w3cDID.resolveDID)(membersIds[0]);
            }
            catch (e) {
                return callback(e);
            }
            let counter = noMembers;
            for (let i = 0; i < noMembers; i++) {
                try {
                    const receiverDIDDocument = await $$.promisify(w3cDID.resolveDID)(membersIds[i]);
                    await $$.promisify(senderDIDDocument.sendMessage)(message, receiverDIDDocument)
                } catch (e) {
                    return callback(e);
                }

                counter--;
                if (counter === 0) {
                    return callback();
                }
            }
        });
    };

    const readMembers = (callback) => {
        this.dsu.readFile(MEMBERS_FILE, (err, members) => {
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

    const updateMembers = (operation, identities, info, callback) => {
        if (typeof info === "function") {
            callback = info;
            info = identities;
        }

        if (!Array.isArray(identities)) {
            return callback(Error(`Invalid format for identities. Expected array.`));
        }

        if (operation === "remove" && !Array.isArray(info)) {
            return callback(Error(`Invalid format for info. Expected array.`));
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

                return this.dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else if (operation === "add") {
                identities.forEach((id, index) => {
                    if (typeof id === "object") {
                        id = id.getIdentifier();
                    }
                    if (typeof members[id] === "undefined") {
                        members[id] = info[index];
                    }
                });
                return this.dsu.writeFile(MEMBERS_FILE, JSON.stringify(members), callback);
            } else {
                callback(Error(`Invalid operation ${operation}`));
            }
        });
    };

    bindAutoPendingFunctions(this, ["init", "getIdentifier", "getGroupName", "addPublicKey", "on", "off", "dispatchEvent", "removeAllObservers"]);

    this.init();
    return this;
}


module.exports = {
    initiateDIDDocument: function (enclave, domain, groupName) {
        return new GroupDID_Document(enclave, domain, groupName)
    },
    createDIDDocument: function (tokens) {
        return new GroupDID_Document(undefined, tokens[3], tokens[4], false);
    }
};
