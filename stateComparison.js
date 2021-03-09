const state = {
  users: {
    'Users1keySSI': '',
    'Users2keySSI': '',
  },
  // indexes: {
  //   'uid1': {
  //     userDSUKeySSI: 'dasdasd',
  //     version: ''
  //   }
  // }
}


const NewState = {
  'master': {
    './file1': {
      mostUpToDateUserDSU: 'keySSIUser1',
    },
    './file2': {
      mostUpToDateUserDSU: 'keySSIUser1',
    }
  },
  'userIndexes': {
    'user1KSSI': {
      './file1': ['1id1'],
      './file2': ['t9fq3j924rrf', '2id1'],
 
    },
    'user2KSSI': {
      './file1': ['1id1'],
      './file2': ['2id1'], // incoming -> 'afsdf03d4y06' from '2id1' -> yields a conflict
    }
  },
  recordsMap: {
    't9fq3j924rrf': 'User1',
    'j9irg93daag4': 'User3',
    'afsdf03d4y06': 'User2',
    ...
  },
}

const NewState = {
  'master': {
    './file1': 'keySSIUser1',
    './file2': 'keySSIUser1',
    './file3': 'keySSIUser1',
    './file3': 'keySSIUser2'
  },
  'userIndexes': {
    'user1KSSI': {
      './file1': ['id2', 'id1'],
      './file2': ['id1'],
      './file3': ['id5', 'ud4', 'ud3', 'id2', 'id1']
    },
    'user2KSSI': {
      './file1': ['id1'],
      './file3': ['ud4', 'ud3', 'id2', 'id1'],
      './file4': ['id1'],
    }
  }
}

const SinicaState = {
  'master': {
    './file1': 'keySSIUser1',
    './file2': 'keySSIUser2',
    './file3': 'keySSIUser1'
  },
  'user1KSSI': {
    './file1': 1,
    './file2': 3,
    './file3': 1,
  },
  'user2KSSI': {
    './file1': 1,
    './file3': 0,
  }
}

const MState = {
  mergedStack: ['uid23', 'uid21', ...],
  userDSUs: {
    'user1KeySSI': {

    },
    'user2KeySSI': {
      
    }
  },
  recordsMap: {
    'skdfa..': {
      '__userKeySSI': 'werewr',
      '__timestamp': 3421341234,
    },
    'skdfa..': {
      '__userKeySSI': 'werewr',
      '__timestamp': 3421341234,
    }
  }
}

const MOldState = {
  'sharedKeySSI': {
    'user1KeySSI': {
      './file1': {
        '__uid': 's4thq...',
        '__timestamp': 41452514234,
        '__previousRecord': { /* ... */ }
      },
      './file2': { /* ... */ }
      /* ... */
    },
    'user2KeySSI': {
      // ...
    }
  }
}