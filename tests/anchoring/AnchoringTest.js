require("../../../../psknode/bundles/testsRuntime");
const keySSIResolver = require("key-ssi-resolver");
const dc = require("double-check");
const { assert } = dc;

const resolver = require("../../resolver");
const keySSISpace = require("../../keyssi");

assert.callback("Resolver DSU Creation with different domains", (callback) => {

  let keySSI;


  resolver.createDSU(keySSISpace.buildTemplateSeedSSI("default"), {}, (err, dsu) => {
    assert.true(typeof err === 'undefined', 'No error while creating the DSU');
    dsu.getKeySSIAsString((err, _keySSI) => {
      keySSI = _keySSI;

      dsu.getKeySSIAsObject((err, keySSIObject) => {
        assertFileWasWritten(dsu, '/file1.txt', 'Lorem 1', () => {
          assertFileWasWritten(dsu, '/file2.txt', 'Lorem 2', () => {
            assertFileWasAnchored(dsu, '/file1.txt', 'Lorem 1', () => {
              assertFileWasAnchored(dsu, '/file2.txt', 'Lorem 2', () => {
                callback();
              })
            })
          })
        });
      })
    })
  });
})

function assertFileWasWritten(dsu, filename, data, callback) {
  dsu.writeFile(filename, data, (err, hash) => {
    assert.true(typeof err === 'undefined', 'DSU is writable');

    dsu.readFile(filename, (err, dt) => {
      assert.true(typeof err === 'undefined', 'DSU is readable');
      assert.true(dt.toString() === data, 'File was read correctly');

      callback();
    })
  })
}

function assertFileWasAnchored(dsu, path, expectedData, callback) {
  dsu.readFile(path, (err, data) => {
    assert.true(typeof err === 'undefined', 'DSU is readable');
    assert.true(data.toString() === expectedData, 'File was read correctly');

    callback();
  })

}
