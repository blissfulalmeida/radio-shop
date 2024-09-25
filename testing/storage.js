const path = require('path');
const { SimpleFileBasedStorage } = require('../src/services/storage');

const storage = new SimpleFileBasedStorage(path.resolve(__dirname, 'data.json'));

storage.set('test', 'value');
storage.set('test2', 'value2');
storage.set('test3', 'value3');

console.log(storage.get('test'));

storage.set('test', 'valuesdfsfd');

console.log(storage.get('test'));

storage.set('bets', [{ a: 1 }, { b: 2 }]);

console.log(storage.getAll());
