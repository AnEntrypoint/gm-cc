#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
const destDir = path.join(homeDir, '.claude');

const srcDir = __dirname;
const isUpgrade = fs.existsSync(destDir);

console.log(isUpgrade ? 'Upgrading gm-cc...' : 'Installing gm-cc...');

try {
  fs.mkdirSync(destDir, { recursive: true });

  const filesToCopy = [
    ['agents', 'agents'],
    ['hooks', 'hooks'],
    ['.mcp.json', '.mcp.json'],
    ['README.md', 'README.md']
  ];

  function copyRecursive(src, dst) {
    if (!fs.existsSync(src)) return;
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      fs.readdirSync(src).forEach(f => copyRecursive(path.join(src, f), path.join(dst, f)));
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  filesToCopy.forEach(([src, dst]) => copyRecursive(path.join(srcDir, src), path.join(destDir, dst)));

  // Register hooks in ~/.claude/settings.json
  const settingsPath = path.join(destDir, 'settings.json');
  const hooksJsonPath = path.join(srcDir, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksJsonPath)) {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch (e) {}
    }
    const hooksTemplate = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));
    const destDirNorm = destDir.replace(/\\/g, '/');
    const hooksStr = JSON.stringify(hooksTemplate.hooks).replace(/\${CLAUDE_PLUGIN_ROOT}/g, destDirNorm);
    const newHooks = JSON.parse(hooksStr);
    if (!settings.hooks) settings.hooks = {};
    for (const [event, entries] of Object.entries(newHooks)) {
      if (!settings.hooks[event]) {
        settings.hooks[event] = entries;
      } else {
        settings.hooks[event] = settings.hooks[event].filter(e =>
          !e.hooks || !e.hooks.some(h => h.command && h.command.includes(destDirNorm))
        );
        settings.hooks[event].push(...entries);
      }
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('✓ Hooks registered in ~/.claude/settings.json');
  }

  const destPath = process.platform === 'win32'
    ? destDir.replace(/\\/g, '/')
    : destDir;
  console.log(`✓ gm-cc ${isUpgrade ? 'upgraded' : 'installed'} to ${destPath}`);
  console.log('Restart Claude Code to activate.');
} catch (e) {
  console.error('Installation failed:', e.message);
  process.exit(1);
}
