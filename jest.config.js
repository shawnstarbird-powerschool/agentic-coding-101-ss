module.exports = {
  projects: ['<rootDir>/src'], // , '<rootDir>/ui'
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'clover', 'cobertura', 'text'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  reporters: ['default']
};
