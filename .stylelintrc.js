module.exports = {
  // Extend the standard SCSS configuration
  extends: [
    'stylelint-config-standard-scss',
  ],

  // Specify overrides for SCSS files to ensure correct parsing
  // (Often needed even with the SCSS config)
  overrides: [
    {
      files: ["**/*.scss"], // Apply this override to all .scss files
      customSyntax: "postcss-scss", // Use the SCSS parser
    }
  ],

  // Add custom rules or disable existing ones here (optional)
  rules: {
    // --- Examples of customizing rules ---

    // Allow hyphens in class names (common in BEM, Bootstrap etc.)
    // The standard config might enforce camelCase or snake_case by default.
    // Setting it to null disables the check.
    'selector-class-pattern': null,

    // Allow any case for SCSS variable names (e.g., $primary-color AND $primaryColor)
    'scss/dollar-variable-pattern': null,

    // Enforce 2 spaces for indentation (override default if needed)
    'indentation': 2,

    // Don't require an empty line before comments (personal preference)
    'comment-empty-line-before': null,

    // Allow CSS variables with `--` prefix (standard)
    // If you use custom property patterns, adjust this regex.
    'custom-property-pattern': [
      // Standard CSS variable pattern OR your own pattern
      "^([a-z][a-z0-9]*)(-[a-z0-9]+)*$",
      {
        message: 'Expected custom property name to be kebab-case (e.g. --my-variable)',
      },
    ],

    // You might need to disable rules conflicting with Bootstrap/other frameworks
    // e.g., 'no-descending-specificity': null,

    // Find more rules: https://stylelint.io/user-guide/rules
    // SCSS specific rules: https://github.com/stylelint-scss/stylelint-scss#list-of-rules

    // Temporarily disable a rule if needed:
    // 'rule-to-disable': null,
  },
};
