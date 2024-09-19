const cls = require('cls-hooked');

const namespace = cls.createNamespace('context');

module.exports.run = (name, data, fn) => {
    namespace.run(() => {
        namespace.set('name', name);
        namespace.set('data', data);

        fn();
    });
};

module.exports.current = () => (namespace.active === null
    ? null
    : {
        name: namespace.get('name'),
        data: namespace.get('data'),
        bindEmitter: namespace.bindEmitter.bind(namespace),
    });
