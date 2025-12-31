// mf install command - HTTP URL-based package management

import * as path from 'path';
import {
  installPackage,
  listPackages,
  removePackage,
  verifyPackages,
  updatePackages,
  normalizeUrl,
  isCached,
} from '../../package/manager.js';
import { ExitCodes } from '../../errors.js';
import { colors } from '../colors.js';

export async function installCommand(args: string[]): Promise<number> {
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    printHelp();
    return ExitCodes.SUCCESS;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);
  const baseDir = process.cwd();

  try {
    switch (subcommand) {
      case 'add':
        return await addPackages(baseDir, subArgs);

      case 'remove':
      case 'rm':
        return await removePackages(baseDir, subArgs);

      case 'list':
      case 'ls':
        return listInstalledPackages(baseDir);

      case 'verify':
        return await verifyInstalledPackages(baseDir);

      case 'update':
        return await updateInstalledPackages(baseDir);

      default:
        // If not a subcommand, treat as URL(s) to install
        return await addPackages(baseDir, args);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(colors.error('error') + `: ${message}`);
    return ExitCodes.STATIC_ERROR;
  }
}

async function addPackages(baseDir: string, urls: string[]): Promise<number> {
  if (urls.length === 0) {
    console.error(colors.error('error') + ': No package URL specified');
    console.log('Usage: mf install <url> [url...]');
    return ExitCodes.STATIC_ERROR;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const urlOrShorthand of urls) {
    const normalizedUrl = normalizeUrl(urlOrShorthand);

    // Check if already cached
    if (isCached(baseDir, urlOrShorthand)) {
      console.log(colors.cyan('cached') + `: ${urlOrShorthand}`);
      console.log(`  → ${normalizedUrl}`);
      successCount++;
      continue;
    }

    console.log(colors.yellow('fetching') + `: ${urlOrShorthand}`);
    console.log(`  → ${normalizedUrl}`);

    try {
      const result = await installPackage(baseDir, urlOrShorthand);
      console.log(colors.green('installed') + `: ${result.url}`);
      console.log(`  hash: ${result.hash.slice(0, 16)}...`);
      console.log(`  path: ${path.relative(baseDir, result.path)}`);
      successCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(colors.error('failed') + `: ${urlOrShorthand}`);
      console.error(`  ${message}`);
      errorCount++;
    }
  }

  console.log('');
  if (errorCount > 0) {
    console.log(colors.yellow(`Installed ${successCount} package(s), ${errorCount} failed`));
    return ExitCodes.STATIC_ERROR;
  }

  console.log(colors.green(`Successfully installed ${successCount} package(s)`));
  return ExitCodes.SUCCESS;
}

async function removePackages(baseDir: string, urls: string[]): Promise<number> {
  if (urls.length === 0) {
    console.error(colors.error('error') + ': No package URL specified');
    console.log('Usage: mf install remove <url> [url...]');
    return ExitCodes.STATIC_ERROR;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const urlOrShorthand of urls) {
    const removed = removePackage(baseDir, urlOrShorthand);
    if (removed) {
      console.log(colors.green('removed') + `: ${urlOrShorthand}`);
      successCount++;
    } else {
      console.log(colors.yellow('not found') + `: ${urlOrShorthand}`);
      errorCount++;
    }
  }

  console.log('');
  console.log(`Removed ${successCount} package(s)`);
  return errorCount > 0 ? ExitCodes.STATIC_ERROR : ExitCodes.SUCCESS;
}

function listInstalledPackages(baseDir: string): number {
  const packages = listPackages(baseDir);

  if (packages.length === 0) {
    console.log('No packages installed.');
    console.log('');
    console.log('Install packages with:');
    console.log('  mf install github.com/user/repo/lib/chords.mf');
    return ExitCodes.SUCCESS;
  }

  console.log(`${packages.length} package(s) installed:\n`);

  for (const pkg of packages) {
    console.log(colors.cyan(pkg.url));
    console.log(`  hash: ${pkg.hash.slice(0, 16)}...`);
    console.log(`  fetched: ${pkg.fetchedAt}`);
  }

  return ExitCodes.SUCCESS;
}

async function verifyInstalledPackages(baseDir: string): Promise<number> {
  console.log('Verifying installed packages...\n');

  const result = await verifyPackages(baseDir);

  if (result.valid.length > 0) {
    console.log(colors.green(`✓ ${result.valid.length} package(s) valid`));
  }

  if (result.invalid.length > 0) {
    console.log(colors.error(`✗ ${result.invalid.length} package(s) modified:`));
    for (const url of result.invalid) {
      console.log(`  - ${url}`);
    }
  }

  if (result.missing.length > 0) {
    console.log(colors.yellow(`? ${result.missing.length} package(s) missing:`));
    for (const url of result.missing) {
      console.log(`  - ${url}`);
    }
  }

  if (result.invalid.length > 0 || result.missing.length > 0) {
    console.log('');
    console.log('Run "mf install update" to re-fetch packages.');
    return ExitCodes.STATIC_ERROR;
  }

  return ExitCodes.SUCCESS;
}

async function updateInstalledPackages(baseDir: string): Promise<number> {
  console.log('Updating all packages...\n');

  const result = await updatePackages(baseDir);

  if (result.updated.length > 0) {
    console.log(colors.green(`Updated ${result.updated.length} package(s):`));
    for (const url of result.updated) {
      console.log(`  - ${url}`);
    }
  }

  if (result.failed.length > 0) {
    console.log(colors.error(`Failed to update ${result.failed.length} package(s):`));
    for (const url of result.failed) {
      console.log(`  - ${url}`);
    }
    return ExitCodes.STATIC_ERROR;
  }

  if (result.updated.length === 0) {
    console.log('No packages to update.');
  }

  return ExitCodes.SUCCESS;
}

function printHelp(): void {
  console.log(`Usage: mf install [command] [options]

HTTP URL-based package management (like Go modules / Deno).
No central registry - packages are fetched directly from URLs.

Commands:
  <url> [url...]      Install package(s) from URL(s)
  add <url> [url...]  Same as above (explicit)
  remove <url>        Remove a package from cache
  list, ls            List installed packages
  verify              Verify package hashes match lock file
  update              Re-fetch all packages from URLs

URL Formats:
  Full URL:           https://example.com/lib/chords.mf
  GitHub shorthand:   github.com/user/repo/lib/chords.mf
  GitLab shorthand:   gitlab.com/user/repo/lib/utils.mf

Examples:
  mf install github.com/takomusic/stdlib/chords.mf
  mf install https://example.com/my-lib.mf
  mf install list
  mf install verify
  mf install update

Import in code:
  import { chord } from "github.com/user/repo/lib/chords.mf";
  import { func } from "https://example.com/lib/utils.mf";

Files:
  mf.lock       Lock file with package hashes
  .mf_cache/    Local cache of downloaded packages
`);
}
