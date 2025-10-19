# Test Configuration Examples

This directory contains example test configurations for the GitLab crawler.

## Encrypted Configuration Files

Configuration files containing sensitive data (access tokens) are encrypted using [SOPS](https://github.com/mozilla/sops) with age encryption.

### Setup

1. Ensure SOPS is installed:
   ```bash
   brew install sops
   ```

2. Set the age key file location (add to your shell profile):
   ```bash
   export SOPS_AGE_KEY_FILE=$HOME/.config/sops/age/keys.txt
   ```

   **Note:** The project includes a `.sops.yaml` configuration, but SOPS still requires the `SOPS_AGE_KEY_FILE` environment variable to locate your private key for decryption.

### Usage

**Decrypt a config file:**
```bash
sops -d examples/unified-config.enc.yaml > examples/unified-config.yaml
```

**Edit encrypted config directly:**
```bash
sops examples/unified-config.enc.yaml
```

**Encrypt a new config file:**
```bash
sops -e examples/unified-config.yaml > examples/unified-config.enc.yaml
```

### Available Test Configurations

1. **unified-config.enc.yaml** - Basic E2E test with PAT authentication
   - Tests: areas + users steps
   - Instance: git.hnnl.eu
   - Encrypted with SOPS

2. **test-configs/dry-run-test.yaml** - Mock execution without API calls
   - Tests: areas + users + resources steps
   - Auth: Mock token (no real API calls)
   - No encryption needed

3. **test-configs/template-test.yaml** - Full configuration example
   - Tests: All steps with comprehensive validation
   - Shows: All available configuration options
   - Replace token placeholder with your token

4. **test-configs/test-suite.yaml** - Test suite orchestration
   - Runs: Multiple tests sequentially
   - Replace token placeholder with your token

### Security Notes

- **Never commit unencrypted config files** with real tokens to Git
- The `.gitignore` is configured to exclude `examples/unified-config.yaml`
- Always use the encrypted `.enc.yaml` versions for files with secrets
- Replace `YOUR_GITLAB_TOKEN_HERE` placeholders with your actual tokens
