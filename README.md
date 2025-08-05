# Proxmox Frontend
## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: TanStack React Query
- **VNC Client**: noVNC 1.3.0
- **HTTP Client**: Axios

## Prerequisites
- Node.js (version 18 or higher recommended)
- npm or yarn package manager
- Proxmox VE server

## Quick Start
### 1. Clone the repository
```bash
git clone <your-repository-url>
cd proxmox-frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173/`
## Production Build
### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## One-liner Setup

For quick setup after cloning:
```bash
npm install && npm uninstall @novnc/novnc && npm install @novnc/novnc@1.3.0 && npm run dev
```

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration
### Proxmox Configuration
- Ensure your Proxmox server allows CORS requests from your frontend domain.
- edit /etc/lvm/lvm.conf on the host:
  Un-Comment and set the following:
  ```activation {
      thin_pool_autoextend_threshold = 75
      thin_pool_autoextend_percent   = 20
  }
  ```

## Troubleshooting
### Fix noVNC version (if needed)
If you encounter top-level await errors, run:
```bash
npm uninstall @novnc/novnc
npm install @novnc/novnc@1.3.0
```

### noVNC Top-level Await Error
If you encounter errors related to top-level await in noVNC:
1. **Solution**: Use noVNC version 1.3.0
   ```bash
   npm uninstall @novnc/novnc
   npm install @novnc/novnc@1.3.0
   ```

2. **Prevention**: Pin the version in `package.json`:
   ```json
   {
     "dependencies": {
       "@novnc/novnc": "1.3.0"
     }
   }
   ```

### Clear Cache Issues
If you encounter dependency issues:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Icons issue
npm install react-icons

### Node.js Version Issues
Check your Node.js version:
```bash
node --version  # Should be 18+
npm --version
```

**Note**: This project requires a running Proxmox VE server and proper network configuration for API access and VNC connections.
