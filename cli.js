#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
const claudeDir = path.join(homeDir, '.claude');
const pluginsDir = path.join(claudeDir, 'plugins');
const destDir = path.join(pluginsDir, 'gm-cc');

const srcDir = __dirname;
const isUpgrade = fs.existsSync(destDir);

console.log(isUpgrade ? 'Upgrading gm-cc plugin...' : 'Installing gm-cc plugin...');

try {
  fs.mkdirSync(destDir, { recursive: true });

  const filesToCopy = [
    'agents',
    'hooks',
    'skills',
    '.mcp.json',
    '.claude-plugin',
    'plugin.json',
    'README.md',
    'CLAUDE.md'
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

  filesToCopy.forEach(name => copyRecursive(path.join(srcDir, name), path.join(destDir, name)));

  // Register in settings.json (enabledPlugins only, no hook injection)
  const settingsPath = path.join(claudeDir, 'settings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch (e) {}
  }
  if (!settings.enabledPlugins) settings.enabledPlugins = {};
  settings.enabledPlugins['gm@gm-cc'] = true;
  // Remove stale hook entries (handled by plugin hooks.json)
  if (settings.hooks) delete settings.hooks;
  // Register marketplace so Claude Code resolves gm@gm-cc locally
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  settings.extraKnownMarketplaces['gm-cc'] = { source: { source: 'directory', path: destDir } };
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  console.log('✓ Plugin registered in ~/.claude/settings.json');

  // Write installed_plugins.json so Claude Code loads from local cache
  const pluginVersion = require('./package.json').version;
  const installedPluginsPath = path.join(pluginsDir, 'installed_plugins.json');
  let installedPlugins = { version: 2, plugins: {} };
  if (fs.existsSync(installedPluginsPath)) {
    try { installedPlugins = JSON.parse(fs.readFileSync(installedPluginsPath, 'utf-8')); } catch (e) {}
  }
  if (!installedPlugins.plugins || Array.isArray(installedPlugins.plugins)) installedPlugins.plugins = {};
  const now = new Date().toISOString();
  const existing = Array.isArray(installedPlugins.plugins['gm@gm-cc']) ? installedPlugins.plugins['gm@gm-cc'][0] : null;
  // Also write cache dir so Claude Code finds it without network fetch
  const cacheDir = path.join(pluginsDir, 'cache', 'gm-cc', 'gm', pluginVersion);
  const filesToCache = ['agents', 'hooks', 'skills', '.mcp.json', '.claude-plugin', 'plugin.json', 'README.md', 'CLAUDE.md'];
  function copyRecursiveCache(src, dst) {
    if (!fs.existsSync(src)) return;
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      fs.readdirSync(src).forEach(f => copyRecursiveCache(path.join(src, f), path.join(dst, f)));
    } else { fs.copyFileSync(src, dst); }
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  filesToCache.forEach(name => copyRecursiveCache(path.join(destDir, name), path.join(cacheDir, name)));
  installedPlugins.plugins['gm@gm-cc'] = [{
    scope: 'user',
    installPath: cacheDir,
    version: pluginVersion,
    installedAt: existing?.installedAt || now,
    lastUpdated: now
  }];
  fs.writeFileSync(installedPluginsPath, JSON.stringify(installedPlugins, null, 2), 'utf-8');
  console.log('✓ Plugin registered in installed_plugins.json');

  console.log(`✓ gm-cc ${isUpgrade ? 'upgraded' : 'installed'} to ${destDir}`);
  console.log('Restart Claude Code to activate the gm plugin.');
} catch (e) {
  console.error('Installation failed:', e.message);
  process.exit(1);
}
