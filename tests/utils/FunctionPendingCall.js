require("../../../../psknode/bundles/testsRuntime");
const testIntegration = require("../../../../psknode/tests/util/tir");
const dc = require("double-check");
const assert = dc.assert;
const PendingCallMixin = require("../../utils/PendingCallMixin");


assert.callback('Testing the pending call behavior, delay initialization', (testfinished) => {

    function TestingCache() {

        PendingCallMixin(this);
        let isInitialized = false;
        this.c1 = undefined

        const load = () => {
            this.c1 = {name: "John", age: 40, city: "New York"};
            isInitialized = true;
            this.executePendingCalls();
        };

        if (this.constructor !== TestingCache ){
            throw 'TestingCache() must be called with new'
        }

        setTimeout(load, 3000);

        this.getInfo = (callback) => {
            if (typeof this.c1 === 'undefined' || this.c1 === null) {
                return this.addPendingCall(() => {
                    callback(this.c1)
                })
            }
            else {
                callback(this.c1)
            }
        };

        this.setInfo = (name, age, city, callback) => {
            if (!isInitialized) {
                return this.addPendingCall(() => {
                    this.c1['name'] = name
                    this.c1['age'] = age
                    this.c1['city'] = city
                    callback()
                })
            }
            this.c1['name'] = name
            this.c1['age'] = age
            this.c1['city'] = city
            callback()
        };
    }

    const dict = new TestingCache()

    dict.getInfo((result) =>  {assert.equal(result['name'], 'John')})

    dict.setInfo('name', 0, 'lastname', () => {}  )

    dict.getInfo((result) => {

        assert.equal(result['name'], 'name')
        if (dict.c1){
            assert.true(true)
        }
        testfinished()
    })

}, 5000);
