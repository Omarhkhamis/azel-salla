// postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': 'postcss-nesting',
    tailwindcss: {},
    'postcss-preset-env': {
      features: {
        'nesting-rules': true,
        // The store is Arabic-first. preset-env's logical-property transform
        // resolves `inset-inline-start`, `margin-inline-end`, `border-inline-*`
        // and friends against a hard-coded LTR direction, which silently
        // mirrors every one of them in an RTL page. Browsers resolve these
        // natively, so the transform is turned off and the direction is left
        // to the document.
        'logical-properties-and-values': false,
      },
    },
  }
}
