# CI/CD Dependencies Guide

## npm install vs npm ci

### Kapan menggunakan `npm ci`:
✅ **Gunakan di CI/CD pipeline ketika:**
- File `package-lock.json` ada dan up-to-date
- Anda ingin reproducible builds
- Speed dan reliability diprioritaskan
- Production deployments

### Kapan menggunakan `npm install`:
✅ **Gunakan ketika:**
- File `package-lock.json` tidak ada
- Development environment
- Anda ingin update dependencies
- Flexible dependency resolution dibutuhkan

## Setup untuk Project Ini

### 1. Generate package-lock.json (one-time setup)
```bash
# For npm workspaces, install from root only
npm install
# This installs both root AND client dependencies
```

### 2. Automated Setup
Jalankan script setup otomatis:
```bash
./scripts/setup-ci.sh
```

### 3. Jenkinsfile Strategy
Jenkinsfile sudah diupdate untuk:
- Cek keberadaan `package-lock.json`
- Gunakan `npm ci` jika ada, `npm install` jika tidak
- Handle both root dan client dependencies

## Best Practices

### Development
```bash
npm install          # Flexible, updates package-lock.json
```

### CI/CD Pipeline
```bash
npm ci              # Fast, reproducible, read-only
```

### Docker Builds
```dockerfile
# Copy package files first
COPY package*.json ./
# Use npm ci in production
RUN npm ci --only=production
```

## Troubleshooting

### Error: "npm ci can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync"
**Solusi:**
1. Delete `node_modules` dan `package-lock.json`
2. Run `npm install`
3. Commit updated `package-lock.json`

### Error: "npm ci requires a package-lock.json or npm-shrinkwrap.json"
**Solusi:**
1. Run `npm install` untuk generate `package-lock.json`
2. Atau gunakan fallback strategy seperti di Jenkinsfile

## Project Structure Dependencies

```
/
├── package.json           # Root dependencies & workspace config
├── package-lock.json      # Single lockfile for all workspaces
└── client/
    └── package.json       # Client workspace dependencies
```

**⚠️ Important:** This project uses **npm workspaces**. 
- Only ONE `package-lock.json` exists at root level
- All dependencies (root + client) are managed from root
- Client folder does NOT have its own `package-lock.json`

## Jenkins Pipeline Flow

1. **Install Dependencies** stage:
   - Check untuk `package-lock.json`
   - Gunakan `npm ci` atau `npm install` accordingly
   - Handle both root dan client

2. **Lint & Test** stage:
   - Dependencies sudah terinstall
   - Focus pada linting dan testing

3. **Build Images** stage:
   - Docker build menggunakan dependencies yang sudah terinstall