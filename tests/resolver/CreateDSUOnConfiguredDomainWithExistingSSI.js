require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../resolver');
const keyssispace = require("../../index").loadApi("keyssi");


assert.callback('Create DSU with existing SSI on configured domain', (testfinished) => {

    dc.createTestFolder('createDSU',(err,folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err)
            {
                throw err;
            }

            const domain = 'default';
            const seedSSI = keyssispace.buildTemplateSeedSSI(domain);
            seedSSI.initialize(domain, undefined, undefined, undefined, "hint", (err) => {
                if (err)
                    throw err;
                createdsuexisiting(seedSSI, domain, (err, keySSI, dsuHashLink) => {
                    loadDsuAndCheck(err, keySSI, dsuHashLink, () => {
                        testfinished();
                    })
                });
            });
        })
    })
}, 5000);


function createdsuexisiting(ssi, domain, keyssireturn)
{
    resolver.createDSUForExistingSSI(ssi, (err, dsu) => {
        if (err) {
            printOpenDSUError(err);
            assert.notEqual(typeof err,'undefined');
            throw err;
        }

        dsu.getLastHashLinkSSI((err, hashlink) => {
            if (err) {
                throw err;
            }

            assert.equal(hashlink.getDLDomain(), domain);

            dsu.getKeySSIAsString((err, key) => {
                if (err) {
                    throw err;
                }

                keyssireturn(undefined, key, hashlink.getIdentifier(true));
            })
        });
    });
}


function loadDsuAndCheck(err, dsuKeySSI, dsuAlreadyCreatedHashLink , testFinishedCallback)
{
    if (err)
    {
        throw err;
    }
    resolver.loadDSU(dsuKeySSI, (err, dsu) => {
        if (err)
        {
            throw err;
        }

        dsu.getLastHashLinkSSI((err, hashlink) => {
            if (err)
            {
                throw err;
            }
            assert.equal(hashlink.getIdentifier(true), dsuAlreadyCreatedHashLink);
            testFinishedCallback();
        })
    });
}




