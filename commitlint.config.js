export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Header (subject line) constraints
    'header-max-length': [2, 'always', 65], // 65 chars to accommodate bead ID within the limit
    'type-case': [2, 'always', 'lowercase'],
    'type-empty': [2, 'always'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore'],
    ],
    'subject-case': [2, 'always', 'lowercase'],
    'subject-empty': [2, 'always'],
    'subject-full-stop': [2, 'never'],

    // Body constraints — body is mandatory and must explain WHY
    'body-leading-blank': [2, 'always'], // Blank line between header and body
    'body-empty': [2, 'never'], // Body is required
    'body-max-line-length': [2, 'always', 72], // Standard 72-char wrap
    'body-min-length': [2, 'always', 10], // Meaningful content minimum

    // Footer constraints — used for agent attribution
    'footer-leading-blank': [2, 'always'],
  },
};
