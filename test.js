'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Reproduce Mailspring's two-stage IPC deserialization without sending any mail.
class Model {
  fromJSON(json) {
    Object.assign(this, json);
    return this;
  }
}
class SyncbackMetadataTask extends Model {
  constructor(data = {}) {
    super();
    this.fromJSON(data);
    this.canBeUndone = !!this.undoValue;
  }
}
const payload = {
  pluginId: 'send-later',
  value: { isUndoSend: true, expiration: 1800000000 },
  undoValue: { isUndoSend: true, expiration: null },
};
const deserialize = json => new SyncbackMetadataTask().fromJSON(JSON.parse(JSON.stringify(json)));
assert.equal(deserialize(payload).canBeUndone, false, 'Reproduce the missing toast flag');

let mainWindow = false;
const plugin = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lib/main.js'), 'utf8'), {
  exports: plugin,
  require: name => {
    assert.equal(name, 'mailspring-exports');
    return { SyncbackMetadataTask };
  },
  AppEnv: { isMainWindow: () => mainWindow },
});

const original = SyncbackMetadataTask.prototype.fromJSON;
plugin.activate();
assert.equal(SyncbackMetadataTask.prototype.fromJSON, original, 'Ignore secondary windows');
mainWindow = true;
plugin.activate();
const patched = SyncbackMetadataTask.prototype.fromJSON;
plugin.activate();
assert.equal(SyncbackMetadataTask.prototype.fromJSON, patched, 'Activation is idempotent');

const received = deserialize(payload);
assert.equal(received.canBeUndone, true, 'Popout send reaches the native undo toast');
assert.deepEqual(received.value, payload.value, 'Keep the native send deadline');
assert.deepEqual(received.undoValue, payload.undoValue, 'Keep the native cancellation metadata');
assert.equal(new SyncbackMetadataTask(payload).canBeUndone, true, 'Inline sends still work');
assert.equal(deserialize({ value: { expiration: 1800000000 } }).canBeUndone, false);
assert.equal(deserialize({ ...payload, undoValue: null }).canBeUndone, false);
const task = new SyncbackMetadataTask();
assert.equal(task.fromJSON(payload), task, 'Preserve the deserialization return value');

plugin.deactivate();
plugin.deactivate();
assert.equal(SyncbackMetadataTask.prototype.fromJSON, original);
assert.equal(Object.hasOwn(SyncbackMetadataTask.prototype, 'fromJSON'), false);
plugin.activate();
assert.equal(deserialize(payload).canBeUndone, true, 'Reactivation works');
plugin.deactivate();

// Restore an existing own method exactly, including its property descriptor.
Object.defineProperty(SyncbackMetadataTask.prototype, 'fromJSON', {
  value: original, writable: true, configurable: true, enumerable: false,
});
const descriptor = Object.getOwnPropertyDescriptor(SyncbackMetadataTask.prototype, 'fromJSON');
plugin.activate();
plugin.deactivate();
assert.deepEqual(Object.getOwnPropertyDescriptor(SyncbackMetadataTask.prototype, 'fromJSON'), descriptor);
console.log('PASS: cross-window undo flag, inline sends, deadlines, non-undo tasks, plugin lifecycle');
