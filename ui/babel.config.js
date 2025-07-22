const neonVersion = require('./package.json').neonVersion;
const neonVersionUnderscored = neonVersion.replaceAll('.', '_');

module.exports = {
  presets: ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"],
  plugins: [
    [
      'search-and-replace',
      {
        rules: [
          {
            search: /__NEON_VERSION__/,
            searchTemplateStrings: true,
            replace: neonVersion
          }, {
            search: /__neon__/,
            searchTemplateStrings: true,
            replace: 'neon-' + neonVersionUnderscored + '-'
          }
        ]
      }
    ]
  ]
}