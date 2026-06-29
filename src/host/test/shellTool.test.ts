import './vscodeStub'; // must come first: importing ../shellTool pulls in `vscode` at module load
import { test } from 'node:test';
import assert from 'node:assert';
import { capOutput, runShellCommand } from '../shellTool';

test('capOutput leaves short output untouched', () => {
  assert.equal(capOutput('hello', 100), 'hello');
});

test('capOutput truncates with a marker', () => {
  const r = capOutput('abcdef', 3);
  assert.ok(r.startsWith('abc'));
  assert.ok(/truncated/.test(r));
});

test('runShellCommand returns stdout and the exit code', async () => {
  const out = await runShellCommand('echo jotflow-shell-ok', process.cwd());
  assert.ok(out.includes('jotflow-shell-ok'), out);
  assert.ok(out.includes('exit code 0'), out);
});

test('runShellCommand captures stderr too', async () => {
  const out = await runShellCommand('echo oops 1>&2', process.cwd());
  assert.ok(out.includes('oops'), out);
});
