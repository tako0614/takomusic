/**
 * TakoMusic Package Manager
 *
 * HTTP URL-based package management (like Go modules / Deno)
 * No central registry - packages are fetched directly from URLs.
 *
 * Usage:
 *   mf install https://github.com/user/repo/lib/chords.mf
 *   mf install github.com/user/repo  (shorthand)
 *
 * Import in code:
 *   import { func } from "https://github.com/user/repo/lib/chords.mf";
 *   import { func } from "github.com/user/repo/lib/chords.mf";
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

export interface PackageLock {
  version: 1;
  packages: Record<string, PackageEntry>;
}

export interface PackageEntry {
  url: string;
  hash: string;
  fetchedAt: string;
}

const LOCK_FILE = 'mf.lock';
const CACHE_DIR = '.mf_cache';

/**
 * Normalize URL to full HTTPS URL
 */
export function normalizeUrl(urlOrShorthand: string): string {
  // Already a full URL
  if (urlOrShorthand.startsWith('http://') || urlOrShorthand.startsWith('https://')) {
    return urlOrShorthand;
  }

  // GitHub shorthand: github.com/user/repo/path
  if (urlOrShorthand.startsWith('github.com/')) {
    const parts = urlOrShorthand.replace('github.com/', '').split('/');
    if (parts.length >= 2) {
      const user = parts[0];
      const repo = parts[1];
      const filePath = parts.slice(2).join('/') || 'lib/index.mf';
      // Use raw.githubusercontent.com for direct file access
      return `https://raw.githubusercontent.com/${user}/${repo}/main/${filePath}`;
    }
  }

  // GitLab shorthand: gitlab.com/user/repo/path
  if (urlOrShorthand.startsWith('gitlab.com/')) {
    const parts = urlOrShorthand.replace('gitlab.com/', '').split('/');
    if (parts.length >= 2) {
      const user = parts[0];
      const repo = parts[1];
      const filePath = parts.slice(2).join('/') || 'lib/index.mf';
      return `https://gitlab.com/${user}/${repo}/-/raw/main/${filePath}`;
    }
  }

  // Assume it's a relative or standard library path
  return urlOrShorthand;
}

/**
 * Convert URL to local cache path
 */
export function urlToCachePath(baseDir: string, url: string): string {
  // Create a safe filename from URL
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const filename = pathParts[pathParts.length - 1] || 'index.mf';
  const safeHost = urlObj.host.replace(/[^a-zA-Z0-9.-]/g, '_');

  return path.join(baseDir, CACHE_DIR, safeHost, hash, filename);
}

/**
 * Fetch content from URL
 */
export function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          fetchUrl(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      let data = '';
      response.setEncoding('utf-8');
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        resolve(data);
      });
      response.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Timeout fetching: ${url}`));
    });
  });
}

/**
 * Calculate SHA256 hash of content
 */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Load lock file
 */
export function loadLockFile(baseDir: string): PackageLock {
  const lockPath = path.join(baseDir, LOCK_FILE);

  if (!fs.existsSync(lockPath)) {
    return { version: 1, packages: {} };
  }

  try {
    const content = fs.readFileSync(lockPath, 'utf-8');
    return JSON.parse(content) as PackageLock;
  } catch {
    return { version: 1, packages: {} };
  }
}

/**
 * Save lock file
 */
export function saveLockFile(baseDir: string, lock: PackageLock): void {
  const lockPath = path.join(baseDir, LOCK_FILE);
  const content = JSON.stringify(lock, null, 2);
  fs.writeFileSync(lockPath, content, 'utf-8');
}

/**
 * Install a package from URL
 */
export async function installPackage(
  baseDir: string,
  urlOrShorthand: string
): Promise<{ url: string; path: string; hash: string }> {
  const url = normalizeUrl(urlOrShorthand);
  const cachePath = urlToCachePath(baseDir, url);

  // Fetch the content
  const content = await fetchUrl(url);
  const hash = hashContent(content);

  // Ensure cache directory exists
  const cacheDir = path.dirname(cachePath);
  fs.mkdirSync(cacheDir, { recursive: true });

  // Write to cache
  fs.writeFileSync(cachePath, content, 'utf-8');

  // Update lock file
  const lock = loadLockFile(baseDir);
  lock.packages[url] = {
    url,
    hash,
    fetchedAt: new Date().toISOString(),
  };
  saveLockFile(baseDir, lock);

  return { url, path: cachePath, hash };
}

/**
 * Resolve an import URL to a local file path
 */
export function resolveImport(baseDir: string, importUrl: string): string | null {
  // Standard library
  if (importUrl.startsWith('std:')) {
    return null; // Handled by compiler
  }

  // Relative import
  if (importUrl.startsWith('./') || importUrl.startsWith('../')) {
    return null; // Handled by compiler
  }

  // HTTP URL or shorthand
  const url = normalizeUrl(importUrl);

  // Check if it's an HTTP URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return null;
  }

  const cachePath = urlToCachePath(baseDir, url);

  if (fs.existsSync(cachePath)) {
    return cachePath;
  }

  return null;
}

/**
 * Check if a URL is cached and up to date
 */
export function isCached(baseDir: string, urlOrShorthand: string): boolean {
  const url = normalizeUrl(urlOrShorthand);
  const cachePath = urlToCachePath(baseDir, url);
  return fs.existsSync(cachePath);
}

/**
 * List all installed packages
 */
export function listPackages(baseDir: string): PackageEntry[] {
  const lock = loadLockFile(baseDir);
  return Object.values(lock.packages);
}

/**
 * Remove a package from cache
 */
export function removePackage(baseDir: string, urlOrShorthand: string): boolean {
  const url = normalizeUrl(urlOrShorthand);
  const cachePath = urlToCachePath(baseDir, url);

  // Remove from cache
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    // Try to remove parent directories if empty
    try {
      const parentDir = path.dirname(cachePath);
      fs.rmdirSync(parentDir);
      const grandParentDir = path.dirname(parentDir);
      fs.rmdirSync(grandParentDir);
    } catch {
      // Ignore errors when directories not empty
    }
  }

  // Remove from lock file
  const lock = loadLockFile(baseDir);
  if (lock.packages[url]) {
    delete lock.packages[url];
    saveLockFile(baseDir, lock);
    return true;
  }

  return false;
}

/**
 * Verify all packages match their recorded hashes
 */
export async function verifyPackages(baseDir: string): Promise<{ valid: string[]; invalid: string[]; missing: string[] }> {
  const lock = loadLockFile(baseDir);
  const valid: string[] = [];
  const invalid: string[] = [];
  const missing: string[] = [];

  for (const [url, entry] of Object.entries(lock.packages)) {
    const cachePath = urlToCachePath(baseDir, url);

    if (!fs.existsSync(cachePath)) {
      missing.push(url);
      continue;
    }

    const content = fs.readFileSync(cachePath, 'utf-8');
    const currentHash = hashContent(content);

    if (currentHash === entry.hash) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  }

  return { valid, invalid, missing };
}

/**
 * Update all packages (re-fetch from URLs)
 */
export async function updatePackages(baseDir: string): Promise<{ updated: string[]; failed: string[] }> {
  const lock = loadLockFile(baseDir);
  const updated: string[] = [];
  const failed: string[] = [];

  for (const url of Object.keys(lock.packages)) {
    try {
      await installPackage(baseDir, url);
      updated.push(url);
    } catch {
      failed.push(url);
    }
  }

  return { updated, failed };
}
