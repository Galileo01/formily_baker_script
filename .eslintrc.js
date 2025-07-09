require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  extends: [
    // airbnb + airbnb 推荐的 ts 规范
    'airbnb',
    'airbnb-typescript',
    // 解决 eslint 和 prettier 的冲突 , 此项配置必须在最后
    'prettier',
  ],
  rules: {
    'no-param-reassign': [
      2,
      {
        props: true,
        ignorePropertyModificationsFor: ['state'],
      },
    ],
  },
};
