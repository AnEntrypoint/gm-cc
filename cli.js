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

  const filesToCopy = [["agents","agents"],["hooks","hooks"],[".mcp.json",".mcp.json"],["README.md","README.md"]];

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

  const pkg = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf-8'));
  const version = pkg.version;

  const cacheDir = path.join(destDir, 'plugins', 'cache', 'gm-cc', 'gm', version);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(path.join(cacheDir, '.claude-plugin'), { recursive: true });

  copyRecursive(path.join(srcDir, 'agents'), path.join(cacheDir, 'agents'));
  copyRecursive(path.join(srcDir, 'hooks'), path.join(cacheDir, 'hooks'));
  if (fs.existsSync(path.join(srcDir, 'skills'))) {
    copyRecursive(path.join(srcDir, 'skills'), path.join(cacheDir, 'skills'));
  }
  if (fs.existsSync(path.join(srcDir, '.mcp.json'))) {
    fs.copyFileSync(path.join(srcDir, '.mcp.json'), path.join(cacheDir, '.mcp.json'));
  }
  if (fs.existsSync(path.join(srcDir, 'CLAUDE.md'))) {
    fs.copyFileSync(path.join(srcDir, 'CLAUDE.md'), path.join(cacheDir, 'CLAUDE.md'));
  }
  if (fs.existsSync(path.join(srcDir, 'README.md'))) {
    fs.copyFileSync(path.join(srcDir, 'README.md'), path.join(cacheDir, 'README.md'));
  }

  const marketplaceSrc = path.join(srcDir, '.claude-plugin', 'marketplace.json');
  if (fs.existsSync(marketplaceSrc)) {
    fs.copyFileSync(marketplaceSrc, path.join(cacheDir, '.claude-plugin', 'marketplace.json'));
    fs.copyFileSync(marketplaceSrc, path.join(cacheDir, 'marketplace.json'));
  }

  const pluginJson = {
    name: 'gm',
    version,
    description: 'State machine agent with hooks, skills, and automated git enforcement',
    author: { name: 'AnEntrypoint', url: 'https://github.com/AnEntrypoint' },
    homepage: 'https://github.com/AnEntrypoint/gm',
    hooks: './hooks/hooks.json'
  };
  fs.writeFileSync(path.join(cacheDir, '.claude-plugin', 'plugin.json'), JSON.stringify(pluginJson, null, 2) + '\n');
  fs.writeFileSync(path.join(cacheDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2) + '\n');

  const installedPath = path.join(destDir, 'plugins', 'installed_plugins.json');
  let installed = {};
  try { installed = JSON.parse(fs.readFileSync(installedPath, 'utf-8')); } catch (e) {}
  delete installed.version;
  delete installed.plugins;
  installed['gm@gm-cc'] = [{ scope: 'user', installPath: cacheDir, version }];
  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2) + '\n');

  const settingsPath = path.join(destDir, 'settings.json');
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch (e) {}
  settings.enabledPlugins = settings.enabledPlugins || {};
  settings.enabledPlugins['gm@gm-cc'] = true;
  settings.extraKnownMarketplaces = settings.extraKnownMarketplaces || {};
  settings.extraKnownMarketplaces['gm-cc'] = { source: { source: 'github', repo: 'AnEntrypoint/gm-cc' } };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');



  const destPath = process.platform === 'win32' ? destDir.replace(/\\/g, '/') : destDir;
  console.log(`✓ gm-cc ${isUpgrade ? 'upgraded' : 'installed'} to ${destPath}`);
  console.log('Restart Claude Code to activate.');
} catch (e) {
  console.error('Installation failed:', e.message);
  process.exit(1);
}
