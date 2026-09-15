# Release process

Split-Expense uses Semantic Versioning. Before a release, the maintainer:

1. Updates `CHANGELOG.md` and both package versions.
2. Opens a pull request and waits for all CI and CodeQL checks to pass.
3. Confirms both production dependency audits report zero vulnerabilities.
4. Runs the fast-check property-based security tests and resolves all
   static-analysis findings.
5. Merges the release commit, creates an annotated `vMAJOR.MINOR.PATCH` tag,
   pushes the tag, and publishes matching GitHub release notes.

Example after the release commit is on `main`:

```bash
git tag -a v1.0.0 -m "Split-Expense 1.0.0"
git push origin v1.0.0
```

Critical confirmed vulnerabilities are fixed and released rapidly. Confirmed
medium-or-higher vulnerabilities are fixed within 60 days.
