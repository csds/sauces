# Security Policy

## Scope

**L'arbre des sauces** is a static, single-page web application: no backend, no
user accounts, no database, and no runtime dependencies. The shipped page is a
self-contained HTML file, and the build tooling uses only the Node.js standard
library. The attack surface is therefore small.

## Supported versions

Only the current version on the `main` branch - and the page deployed from it -
is supported. There are no maintained older releases.

## Reporting a vulnerability

Please report security issues **privately** - do not open a public issue.

Use GitHub's private vulnerability reporting: go to the **Security** tab of this
repository and choose **Report a vulnerability**. (If it isn't available yet, the
maintainer can enable it under Settings → Security → Private vulnerability
reporting.) This keeps both the report and your contact details confidential
between you and the maintainer - no public email address required.

Please include steps to reproduce and the affected file(s). You'll get an
acknowledgement within a reasonable time, and credit for the find (if you'd
like it) once it's resolved.