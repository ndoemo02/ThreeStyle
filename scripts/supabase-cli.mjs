import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

// The bundled CLI uses its own TLS runtime. Pass the OS-trusted public CA roots
// explicitly; retain certificate verification and never change global settings.
const temporaryRoot = path.resolve(tmpdir());
const directory = await mkdtemp(path.join(temporaryRoot, 'threestyle-supabase-'));
const env = { ...process.env };
// Supabase's shared Windows credential entry may be replaced by another login.
// Keep this project's standard CLI fallback credential in the user's home, never
// in the repository/deployment. Only this child process receives these settings.
const accountHome = path.join(homedir(), '.supabase-threestyle');
env.SUPABASE_HOME = accountHome;
env.SUPABASE_NO_KEYRING = '1';
try {
  const certs = typeof tls.getCACertificates === 'function'
    ? [...tls.getCACertificates('system'), ...tls.getCACertificates('extra')]
    : [];
  if (certs.length) {
    const caFile = path.join(directory, 'trusted-ca.pem');
    await writeFile(caFile, [...new Set(certs)].join('\n'));
    env.NODE_EXTRA_CA_CERTS = caFile;
  }
  const args = process.argv.slice(2);
  if (args[0] !== 'login' && !env.SUPABASE_ACCESS_TOKEN) {
    try {
      env.SUPABASE_ACCESS_TOKEN = (await readFile(path.join(accountHome, 'access-token'), 'utf8')).trim();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  // Human login must remain interactive even when launched from an agent terminal.
  const interactive = args[0] === 'login' ? ['--output-format', 'text', '--agent', 'no'] : [];
  // --no-browser belongs to the login subcommand, after its name.
  if (args[0] === 'login' && !args.some(arg => arg === '--no-browser' || arg.startsWith('--no-browser='))) {
    args.push('--no-browser');
  }
  let executable = process.execPath;
  let prefix = [fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url))];
  if (process.platform === 'win32') {
    // Kill the real child on Ctrl+C, rather than leaving its native login process
    // alive after terminating npm's intermediate Node wrapper.
    const require = createRequire(import.meta.url);
    executable = path.join(path.dirname(require.resolve(`@supabase/cli-windows-${process.arch}/package.json`)), 'bin', 'supabase.exe');
    prefix = [];
  }
  const child = spawn(executable, [...prefix, ...interactive, ...args], { stdio: 'inherit', env });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
} finally {
  if (path.dirname(path.resolve(directory)) !== temporaryRoot || !path.basename(directory).startsWith('threestyle-supabase-')) {
    throw new Error('Unexpected temporary certificate directory; cleanup stopped.');
  }
  await rm(directory, { recursive: true, force: true });
}
