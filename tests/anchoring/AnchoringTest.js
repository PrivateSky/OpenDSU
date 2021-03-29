// const keySSISpace = require('../../keyssi');
// const resolver = require("../../resolver");
// const keySSISpace = require('../../keyssi');
// const dc = require("double-check");
// const { assert } = dc;

require("../../../../psknode/bundles/testsRuntime");
const keySSIResolver = require("key-ssi-resolver");
const dc = require("double-check");
const { assert } = dc;

const resolver = require("../../resolver");
const keySSISpace = require("../../keyssi");

assert.callback("Resolver DSU Creation with different domains", (callback) => {
  let writesCounter = 0;
  let anchoringCounter = 0;
  let keySSI;

  function anchoringEventListener(err) {
    // assert.true(typeof err === 'undefined', 'No error while anchoring changes');
    // return callback()
    assertFirst4FilesWereAnchored(keySSI, () => {
      // if (++anchoringCounter !== 4) {
      //   return;
      // }

      resolver.loadDSU(keySSI, (err, dsu) => {
        assert.true(typeof err === 'undefined', "DSU has been anchored");
        assertFileWasAnchored(dsu, '/file5.txt', 'Lorem 5', () => {
          callback();
        })
      });
    });
  }

  /**
   *
   * Anchor changes after 3 writes
   * @param {BrickMap} sessionBrickMap
   * @param {callback} callback
   */
  function decisionFunction(sessionBrickMap, callback) {
    if (writesCounter++ < 3) {
      return callback(undefined, false);
    }

    return callback(undefined, true);
  }

  resolver.createDSU(keySSISpace.buildTemplateSeedSSI("default"), {
    // anchoringOptions: {
    //   decisionFn: decisionFunction,
    //   anchoringEventListener: anchoringEventListener
    // }
  }, (err, dsu) => {
    assert.true(typeof err === 'undefined', 'No error while creating the DSU');
    dsu.getKeySSIAsString((err, _keySSI) => {
      keySSI = _keySSI;
      console.log('keySSI', keySSI)

      dsu.getKeySSIAsObject((err, keySSIObject) => {
        // const sReadSSI = keySSIObject.derive()
        // console.log(keySSIObject.derive().getIdentifier(true))

        // resolver.loadDSU(sReadSSI,{}, (err, sReadDSU) => {
        //   console.log('sReadDSU', sReadDSU)
        //   let invalidSeedSSI = sReadSSI.getIdentifier(true);
        //   const arr = invalidSeedSSI.split(':')
        //   arr[1] = 'ssi'
        //   arr[3] = ''
        //
        //   invalidSeedSSI = arr.join(':')
        //   console.log('invalidSeedSSI', invalidSeedSSI)
        //   invalidSeedSSI = keySSISpace.createTemplateSeedSSI(arr[2], undefined, arr[4], 'v0');
        //   invalidSeedSSI.derive = () => sReadSSI
        //   console.log('invalidSeedSSI', invalidSeedSSI)
        //   sReadDSU.setKeySSI(invalidSeedSSI)
        //   // return callback()

          // assertFileWasWritten(sReadDSU, '/file0.txt', 'Lorem 0', () => {

            assertFileWasWritten(dsu, '/file1.txt', 'Lorem 1', () => {
              assertFileWasWritten(dsu, '/file2.txt', 'Lorem 2', () => {
                assertFileWasWritten(dsu, '/file3.txt', 'Lorem 3', () => {
                  // assertChangesWereNotAnchored(keySSI, '/file4.txt', () => {
                  assertFileWasWritten(dsu, '/file4.txt', 'Lorem 4', () => {
                    assertFileWasWritten(dsu, '/file5.txt', 'Lorem 5', () => {
                      console.log('File was written to a new session');
                      anchoringEventListener();
                      // callback()
                    })
                  })
                  // })
                })
              })

            });

          // });

        // })



      })

    })

  });
})

function assertFileWasWritten(dsu, filename, data, callback) {
  console.log(1)
  dsu.writeFile(filename, data, (err, hash) => {
    console.log(2)
    console.log('ERR: ', err)
    console.log('write file', filename)
    callback();
    // assert.true(typeof err === 'undefined', 'DSU is writable');
    //
    // dsu.readFile(filename, (err, dt) => {
    //   console.log('readfile', filename, err)
    // //   // assert.true(typeof err === 'undefined', 'DSU is readable');
    // //   // assert.true(dt.toString() === data, 'File was read correctly');
    // //
    // //   callback();
    // })
  })
}

function assertChangesWereNotAnchored(keySSI, path, callback) {
  resolver.loadDSU(keySSI, (err, dsu) => {
    dsu.readFile(path, (err, data) => {
      assert.true(typeof err !== 'undefined', "File wasn't written yet");
      callback();
    })
  });
}

function assertFirst4FilesWereAnchored(keySSI, callback) {
  resolver.loadDSU(keySSI, (err, dsu) => {
    assert.true(typeof err === 'undefined', "DSU has been anchored");

    assertFileWasAnchored(dsu, '/file1.txt', 'Lorem 1', () => {
      assertFileWasAnchored(dsu, '/file2.txt', 'Lorem 2', () => {
        assertFileWasAnchored(dsu, '/file3.txt', 'Lorem 3', () => {
          // assertFileWasAnchored(dsu, '/file4.txt', 'Lorem 4', () => {
          callback();
          // })
        })
      })
    })
  });
}

function assertFileWasAnchored(dsu, path, expectedData, callback) {
  dsu.readFile(path, (err, data) => {
    console.log('-----------')
    console.log(path, expectedData, err)
    assert.true(typeof err === 'undefined', 'DSU is readable');
    assert.true(data.toString() === expectedData, 'File was read correctly');

    callback();
  })

}
