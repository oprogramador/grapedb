import AdvancedManager from 'grapedb/storage/AdvancedManager';
import InMemorySimpleManager from 'grapedb/storage/InMemorySimpleManager';
import expect from 'grapedb/tests/expect';
import sinon from 'sinon';

const logger = {
  error: sinon.spy(),
  info: sinon.spy(),
};

describe('AdvancedManager', () => {
  it('saves a string', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';
    const value = 'foo-value';

    return manager.set(key, value)
      .then(() => expect(simpleManager.get(key)).to.eventually.equal(`string:${value}`));
  });

  it('saves a number', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';
    const value = 123;

    return manager.set(key, value)
      .then(() => expect(simpleManager.get(key)).to.eventually.equal(`number:${value}`));
  });

  it('saves a boolean', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';
    const value = true;

    return manager.set(key, value)
      .then(() => expect(simpleManager.get(key)).to.eventually.equal(`boolean:${value}`));
  });

  it('saves an array', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';

    return manager.set(key, ['foo', 'bar', 'baz'])
      .then(() => simpleManager.get(key))
      .then((value) => {
        expect(value).to.startWith('array:');

        return JSON.parse(value.replace(/array:/, ''));
      })
      .then(([foo, bar, baz]) => Promise.all([
        expect(simpleManager.get(foo)).to.eventually.equal('string:foo'),
        expect(simpleManager.get(bar)).to.eventually.equal('string:bar'),
        expect(simpleManager.get(baz)).to.eventually.equal('string:baz'),
      ]));
  });

  it('saves an object', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';

    return manager.set(key, { bar: 'bar-value', baz: 'baz-value', foo: 'foo-value' })
      .then(() => simpleManager.get(key))
      .then((value) => {
        expect(value).to.startWith('object:');

        return JSON.parse(value.replace(/object:/, ''));
      })
      .then(({ foo, bar, baz }) => Promise.all([
        expect(simpleManager.get(foo)).to.eventually.equal('string:foo-value'),
        expect(simpleManager.get(bar)).to.eventually.equal('string:bar-value'),
        expect(simpleManager.get(baz)).to.eventually.equal('string:baz-value'),
      ]));
  });

  it('saves an array with multiple references to the same value', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';
    const referenced = { foo: 'bar' };
    const object = [
      referenced,
      referenced,
    ];

    return manager.set(key, object)
      .then(() => simpleManager.get(key))
      .then((value) => {
        expect(value).to.startWith('array:');

        return JSON.parse(value.replace(/array:/, ''));
      })
      .then(([foo1, foo2]) => {
        expect(foo1).to.equal(foo2);

        return simpleManager.get(foo1);
      })
      .then((value) => {
        expect(value).to.startWith('object:');

        return JSON.parse(value.replace(/object:/, ''));
      })
      .then(({ foo }) => expect(simpleManager.get(foo)).to.eventually.equal('string:bar'));
  });

  it('saves an object with multiple references to the same value', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-key';
    const referenced = { foo: 'bar' };
    const object = {
      foo1: referenced,
      foo2: referenced,
    };

    return manager.set(key, object)
      .then(() => simpleManager.get(key))
      .then((value) => {
        expect(value).to.startWith('object:');

        return JSON.parse(value.replace(/object:/, ''));
      })
      .then(({ foo1, foo2 }) => {
        expect(foo1).to.equal(foo2);

        return simpleManager.get(foo1);
      })
      .then((value) => {
        expect(value).to.startWith('object:');

        return JSON.parse(value.replace(/object:/, ''));
      })
      .then(({ foo }) => expect(simpleManager.get(foo)).to.eventually.equal('string:bar'));
  });

  it('saves an object with self-reference', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const key = 'foo-main-key';
    const object = {
      foo1: 'foo-value',
    };
    object.foo2 = object;

    return manager.set(key, object)
      .then(() => simpleManager.get(key))
      .then((value) => {
        expect(value).to.startWith('object:');

        return JSON.parse(value.replace(/object:/, ''));
      })
      .then(({ foo1, foo2 }) => {
        expect(foo2).to.equal(key);

        return expect(simpleManager.get(foo1)).to.eventually.equal('string:foo-value');
      });
  });

  it('saves nested objects', () => {
    const simpleManager = new InMemorySimpleManager();
    const manager = new AdvancedManager(simpleManager, logger);
    const objects = {
      foo1: {
        bar: 'bar-value',
        baz: 'baz-value',
        foo: 'foo-value',
      },
      foo2: {
        bar: 'bar-value-2',
        baz: 'baz-value-2',
        foo: [
          'foo-value-2',
          {
            bar: 'foo-value-2-bar-2',
            foo: 'foo-value-2-foo-2',
          },
        ],
      },
    };

    return manager.set('aRootKey', objects)
      .then(() => simpleManager.get('aRootKey'))
      .then(value => JSON.parse(value.replace(/^object:/, '')))
      .then(({ foo1, foo2 }) => Promise.all([
        simpleManager.get(foo1),
        simpleManager.get(foo2),
      ]))
      .then(values => values.map(value => JSON.parse(value.replace(/^object:/, ''))))
      .then(([foo1, foo2]) => Promise.all([
        simpleManager.get(foo2.foo),
        expect(simpleManager.get(foo1.bar)).to.eventually.equal('string:bar-value'),
        expect(simpleManager.get(foo1.baz)).to.eventually.equal('string:baz-value'),
        expect(simpleManager.get(foo1.foo)).to.eventually.equal('string:foo-value'),
        expect(simpleManager.get(foo2.bar)).to.eventually.equal('string:bar-value-2'),
        expect(simpleManager.get(foo2.baz)).to.eventually.equal('string:baz-value-2'),
      ]))
      .then(([foo1foo]) => JSON.parse(foo1foo.replace(/^array:/, '')))
      .then(([foo1foo0, foo1foo1]) => Promise.all([
        simpleManager.get(foo1foo1),
        expect(simpleManager.get(foo1foo0)).to.eventually.equal('string:foo-value-2'),
      ]))
      .then(([foo1foo1]) => JSON.parse(foo1foo1.replace(/^object:/, '')))
      .then(({ foo, bar }) => Promise.all([
        expect(simpleManager.get(foo)).to.eventually.equal('string:foo-value-2-foo-2'),
        expect(simpleManager.get(bar)).to.eventually.equal('string:foo-value-2-bar-2'),
      ]));
  });
});
