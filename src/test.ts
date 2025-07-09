const validPathReg = /^(packages\/(core|react|reactive)\/docs)(.|\/)*\.md$/;

const testPath = 'packages/core/docs/api/entry/FieldEffectHooks.md';

console.log('dev testPath', validPathReg.test(testPath));
