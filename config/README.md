# config/

This directory stores local credentials created by the setup process.

- `team.env` — contains the Tunnel ID (created by configure.sh or the Web UI)
- API key is stored in **macOS Keychain**, not as a file

Both are excluded by `.gitignore`. Never commit credentials.
