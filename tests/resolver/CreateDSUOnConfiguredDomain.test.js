require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../resolver');
const keySSI = require("../../keyssi")


assert.callback('Create DSU on already configured domain', (testfinished) => {

    dc.createTestFolder('createDSU',(err,folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err)
            {
                throw err;
            }

            const domain = 'default';
            createdsu(domain ,(err, keySSI, dsuHashLink) => {

                loadDsuAndCheck(err, keySSI, dsuHashLink, () => {
                    testfinished();
                })
            });


        })
    })



}, 5000);


function createdsu(domain, keySSICallback)
{
    const keyssitemplate = keySSI.createTemplateKeySSI('seed',domain);
    resolver.createDSU(keyssitemplate,(err, dsu) => {
        if (err)
        {
            throw err;
        }

        dsu.getLastHashLinkSSI( (err, hashlink) => {
            if (err)
            {
                throw err;
            }
            assert.equal(hashlink.getDLDomain(),domain);

            dsu.getKeySSIAsString((err, key) => {
                if (err)
                {
                    throw err;
                }
                keySSICallback(undefined, key, hashlink.getIdentifier(true));
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
    console.log('Created DSU keySSI : ',dsuKeySSI);
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
            console.log(hashlink.getIdentifier(true));
            assert.equal(hashlink.getIdentifier(true), dsuAlreadyCreatedHashLink);
            testFinishedCallback();
        })
    });
}