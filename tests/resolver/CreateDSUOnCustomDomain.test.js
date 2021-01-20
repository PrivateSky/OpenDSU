require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;

const resolver = require('../../resolver');
const keySSI = require("../../keyssi")


assert.callback('Create DSU on custom domain', (testfinished) => {

    dc.createTestFolder('createDSU',(err,folder) => {
        testIntegration.launchApiHubTestNode(10, folder, (err) => {
            if (err)
            {
                throw err;
            }

            const domain = 'testdomain';
            prepareBDNSContext(folder);
            createdsu(domain ,(err, keySSI, dsuHashLink) => {

                loadDsuAndCheck(err, keySSI, dsuHashLink, () => {
                    testfinished();
                })
            });


        })
    })



}, 5000);

function prepareBDNSContext(folder)
{

    let bdns = {
        'testdomain': {
            "replicas": [],
            "brickStorages": [
                "$ORIGIN"
            ],
            "anchoringServices": [
                "$ORIGIN"
            ]
        }
    }

    require('fs').writeFileSync(folder+'/external-volume/config/bdns.hosts', JSON.stringify(bdns));

}


function createdsu(domain, keySSICallback)
{
    const keyssitemplate = keySSI.buildTemplateKeySSI('seed',domain);
    resolver.createDSU(keyssitemplate, {bricksDomain: domain}, (err, dsu) => {
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