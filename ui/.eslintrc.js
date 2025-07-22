/**
 * This is our linting file.  In general, we prefer not to allow warnings.
 * Either code is good and we let it go, or code is bad, and an error should be thrown or eslint can automatically fix it.
 * 
 * https://eslint.org/docs/rules/
 * https://typescript-eslint.io/rules/
 * 
 */

//Let's grab the --env settings.
 let env = {};
 process.argv.find((element, index) => {
   if (element === '--env') {
     for (let arg of process.argv.slice(index + 1)) {
       let [key, value] = arg.split('=');
       env[key] = value;
     }
     return true;
   }
 });

//There are some rules that are ok to let slip during development, but need to generate errors when building for production.
//Unused variables is one of the bigger ones here.
const WARNING_IN_DEV_ERROR_IN_PROD = env.mode === 'production' ? 'error' : 'warn';

module.exports = {
  'root': true,
  'parser': '@typescript-eslint/parser',
  'plugins': [
    '@typescript-eslint'
  ],
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  'rules': {
    'semi': 2,
    'curly': 2,
    'arrow-body-style': ['error', 'always'],
    'arrow-parens': 2,
    '@typescript-eslint/array-type': ['error', {default: 'generic', readonly: 'generic'}],
    'quotes': ['error', 'single'],
    'eqeqeq': ['error', "always", {null: 'ignore'}],
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-unused-vars': [WARNING_IN_DEV_ERROR_IN_PROD, { args: 'none' }],
    '@typescript-eslint/type-annotation-spacing': 2,
    '@typescript-eslint/prefer-function-type': 2,
    '@typescript-eslint/explicit-function-return-type': 2,
    "@typescript-eslint/typedef": [
      2,
      {
        "parameter": true
      }
    ],
    'arrow-spacing': 2,
    'block-spacing': 2,
    'space-before-blocks': 2,
    'comma-spacing': ['error', {before: false, after: true}],
    'computed-property-spacing': 2,
    'func-call-spacing': 2,
    'key-spacing': 2,
    'keyword-spacing': 2,
    'object-curly-spacing': 2,
    'rest-spread-spacing': 2,
    'semi-spacing': 2,
    'switch-colon-spacing': 2,
    'template-curly-spacing': 2,
    'template-tag-spacing': 2,
    'space-infix-ops': 2,
    'space-unary-ops': 2,
    'space-in-parens': 2,
    'no-trailing-spaces': 2,
    'prefer-arrow-callback': 2,
    '@typescript-eslint/no-namespace': 'off'
  }
}