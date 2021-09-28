// require("../../../../psknode/bundles/testsRuntime");
//
// const tir = require("../../../../psknode/tests/util/tir");
// const dc = require("double-check");
// const assert = dc.assert;
//
// const w3cDID = require('../../index').loadAPI("w3cdid");
// const message = "Hello DID based MQs!"
// const TaskCounter = require("swarmutils").TaskCounter;
//
// function createIdentities(callback) {
//     const ids = ["first", "second", "third"];
//     const didDocuments = [];
//     const tc = new TaskCounter(() => callback(undefined, didDocuments));
//
//     tc.increment(ids.length);
//     for (let i = 0; i < ids.length; i++) {
//         w3cDID.createIdentity("demo", ids[i], (err, didDocument) => {
//             if (err) {
//                 return callback(err);
//             }
//
//             didDocuments.push(didDocument);
//             tc.decrement();
//         });
//     }
// }
//
// assert.callback('w3cDID Group remove member test', (testFinished) => {
//     dc.createTestFolder('createDSU', async (err, folder) => {
//         const vaultDomainConfig = {
//             "anchoring": {
//                 "type": "FS",
//                 "option": {}
//             }
//         }
//         await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
//         createIdentities((err, didDocuments) => {
//             if (err) {
//                 throw err;
//             }
//             w3cDID.createIdentity("group", "default", "myTeam", (err, groupDIDDocument) => {
//                 if (err) {
//                     throw err;
//                 }
//
//                 const tc = new TaskCounter(() => {
//                     groupDIDDocument.listMembersByIdentity((err, membersIDs) => {
//                         if (err) {
//                             throw err;
//                         }
//                     // groupDIDDocument.removeMember(didDocuments[1].getIdentifier(), (err) => {
//                     //     if (err) {
//                     //         throw err;
//                     //     }
//                     //
//                     //     groupDIDDocument.listMembersByIdentity((err, membersIDs) => {
//                     //         if (err) {
//                     //             throw err;
//                     //         }
//                     //
//                     //         assert.true(membersIDs.length === 2);
//                     //         assert.arraysMatch(membersIDs, ['did:demo:first', 'did:demo:third']);
//                     //         testFinished();
//                     //     });
//                     // });
//                 });
//                 });
//
//                 tc.increment(didDocuments.length);
//                 for (let i = 0; i < didDocuments.length; i++) {
//                     groupDIDDocument.addMember(didDocuments[i].getIdentifier(), (err) => {
//                         if (err) {
//                             throw err;
//                         }
//
//                         tc.decrement();
//                     });
//                 }
//             });
//         });
//     });
//
// }, 1500000);
//

require("../../../../psknode/bundles/testsRuntime");
const tir = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require('../../index');
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

assert.callback('key DID SSI test', (testFinished) => {
    const domain = 'default';
    let sc;

    dc.createTestFolder('createDSU', async (err, folder) => {
        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({domains: [{name: "vault", config: vaultDomainConfig}]});
        let error;
        try {
            sc = scAPI.getSecurityContext();
            const ids = ["first", "second", "third"];
            const didDocuments = [];
            const groupDIDDocument = await $$.promisify(w3cDID.createIdentity)("group",domain, "group_name")
            for (let i = 0; i < ids.length; i++) {
                const didDocument = await $$.promisify(w3cDID.createIdentity)("name",domain, ids[i])
                didDocuments.push(didDocument);
                await $$.promisify(groupDIDDocument.addMember)(didDocument.getIdentifier());
            }

            await $$.promisify(groupDIDDocument.removeMember)(didDocuments[1].getIdentifier());
            const members = await $$.promisify(groupDIDDocument.listMembersByIdentity)();
            assert.arraysMatch(members, ['did:ssi:name:default:first', 'did:ssi:name:default:third']);
        } catch (e) {
            error = e;
        }
        assert.true(typeof error === "undefined")
        testFinished();
    });
}, 500000);

