# Security Policy

## Supported Version

Security fixes are applied to the latest release and the `main` branch.

## Reporting A Vulnerability

Use GitHub private vulnerability reporting for this repository. Do not open a
public issue containing exploit details, personal data, credentials, or unsafe
cleanup paths.

Include the affected version, Windows version, reproduction steps, impact, and
whether elevation is required. Please allow maintainers time to reproduce and
prepare a fix before public disclosure.

## Security Boundaries

The webview is not trusted with arbitrary privileged operations. Native Rust
commands must remain narrow, validate every input, and operate with standard
user rights unless the user explicitly approves a Windows UAC prompt.
