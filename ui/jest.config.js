/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
module.exports = function() {
  return {
    testEnvironment: 'jsdom',
    resetMocks: false,
    testPathIgnorePatterns: [
      '/node_modules/',
      '/src/app/__tests__/test.setup.ts'
    ],
    setupFiles: [
      'jest-localstorage-mock',

      //A spoof for the React Adapters to think there are icons on the page.
      './node_modules/@ps-refarch-ux/neon/lib/unit-test-shim/skip-loading-icons.js',

      //This is a package with ALL of the web components bundled into a single javascript file.
      //There is no css inside it.
      './node_modules/@ps-refarch-ux/neon/lib/unit-test-shim/web-component-package.js',
    ],
    setupFilesAfterEnv: [
      './jest-setup.ts',
      './src/app/__tests__/test.setup.ts',
    ],
    moduleNameMapper: {
      '\\.(css|less|sass|scss)$': '<rootDir>/jest-mocks/style-mock.js',
      '\\.(gif|ttf|eot|svg)$': '<rootDir>/jest-mocks/file-mock.js',
      './dev-config.json': '<rootDir>/jest-mocks/dev-config-mock.js'
    }
  };
};
