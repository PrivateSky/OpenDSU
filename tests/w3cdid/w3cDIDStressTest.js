process.env.NO_LOGS = true;

const { fork } = require('child_process');

require("../../../../psknode/bundles/testsRuntime");

const tir = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;

const w3cDID = require('../../w3cdid');

const argParser = function(defaultOpts, args){
    let config = JSON.parse(JSON.stringify(defaultOpts));
    if (!args)
        return config;
    args = args.slice(2);
    const recognized = Object.keys(config);
    const notation = recognized.map(r => '--' + r);
    args.forEach(arg => {
        if (arg.includes('=')){
            let splits = arg.split('=');
            if (notation.indexOf(splits[0]) !== -1) {
                let result
                try {
                    result = eval(splits[1]);
                } catch (e) {
                    result = splits[1];
                }
                config[splits[0].substring(2)] = result;
            }
        }
    });
    return config;
}


// All these variables can be changed from the cmd line like so 'node w3cDIDStressTest.js --messages=12 ...'
const defaultOps = {
    receiver: 'receiverWc3DIDString' + Math.floor(Math.random() * 10000000),    // random receiver id
    sender: 'senderWc3DIDString' + Math.floor(Math.random() * 10000000),        // random sender id
    didMethod: 'demo',          // did method
    messages: 10,               // number of messages
    messageTimeout: 10,         // timeout between messages. 2ms seems to be the minimum before it breaks (in my pc). 10 seems to safely work
    kill: false,                // decides if kills the consumer after boot or not (to test with consumer online/offline)
    timeout: 200                // timeout between the consumer started listening and actually sending the messages (or killing the consumer)
}

const config = argParser(defaultOps, process.argv)

let msgCount = 0;

let timeBeforeMessages, timeAfterMessages, timeMessagesSent;

const someData = {
    key1: 'value',
    key2: 'looooooooooooooooooooooonger vaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaalue'
}

// If we kill the consumer we need to wait for at least 30 seconds for it to 'decide' call the callback
// otherwise, 1 seconds per message should be plenty
const assertTimeout = 1000 * config.messages + config.kill ? 30000 : 0;

assert.callback('w3cDID MQ Stress test', (testFinished) => {
    tir.launchVirtualMQNode(function (err, port) {
        if (err) {
            throw err;
        }
        w3cDID.createIdentity(config.didMethod, config.sender, (err, senderDID) => {
            if (err)
                throw err;
            const forked = fork('w3cDIDStressTestChild.js');
            forked.on('message', (receiverDID) => {
                console.log(`PRODUCER: received created and listening`);

                const sendMessage = function () {
                    console.log("PRODUCER: Sending message", JSON.stringify(someData), " to receiver ", config.receiver);
                    senderDID.sendMessage(JSON.stringify(someData), receiverDID, (err) => {
                        if (err)
                            return console.log(`PRODUCER: Error sending message`, err);
                        msgCount++;
                        console.log(`PRODUCER: Message successfully sent ${msgCount}`);
                        if (msgCount === config.messages) {
                            timeMessagesSent = Date.now();
                            console.log(`PRODUCER: all messages sent in ${timeMessagesSent - timeAfterMessages}ms. closing test in 1 second`)
                            setTimeout(testFinished, 1000);
                        }
                    });
                }

                const runTest = function () {
                    timeBeforeMessages = Date.now();
                    console.log(`PROCUCER: Before Messages: ${timeBeforeMessages}`);

                    if (!config.messageTimeout) {
                        for (let i = 0; i < config.messages; i++)
                            sendMessage();

                    } else {
                        let counter = 0;
                        const iterator = function () {
                            console.log(`PRODUCER: sending message ${++counter}`);
                            sendMessage();
                            if (counter < config.messages)
                                setTimeout(() => iterator(), config.messageTimeout);
                            else {
                                timeAfterMessages = Date.now();
                                console.log(`PRODUCER: After Messages: ${timeAfterMessages}. Elapsed: ${timeAfterMessages - timeBeforeMessages}`);
                                setTimeout(() => console.log('PRODUCER: 10 seconds since messages sent...'), 10000);
                            }
                        }
                        setTimeout(() => iterator(), config.timeout);
                    }


                }

                if (config.kill) {
                    forked.send({terminate: true});
                    return setTimeout(() => runTest(), 100); // on a timer just to allow the child to properly terminate
                }

                runTest();
            });

            forked.send({
                id: config.receiver,
                didMethod: config.didMethod,
                messages: config.messages,
                timeout: config.timeout
            });
        });
    });
}, assertTimeout);

