import globals from 'globals';

// Only the undefined-variable check: catches missing imports after the module split.
export default [
  { files: ['src/**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } }, rules: { 'no-undef': 'error', 'no-const-assign': 'error', 'no-import-assign': 'error' } }
];
