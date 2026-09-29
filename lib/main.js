'use strict';

const { SyncbackMetadataTask } = require('mailspring-exports');

let originalDescriptor;
let patchedFromJSON;

exports.activate = function () {
  if (!AppEnv.isMainWindow() || patchedFromJSON) return;

  const prototype = SyncbackMetadataTask.prototype;
  originalDescriptor = Object.getOwnPropertyDescriptor(prototype, 'fromJSON');
  const originalFromJSON = prototype.fromJSON;

  patchedFromJSON = function (json) {
    const result = originalFromJSON.call(this, json);
    // IPC constructs an empty task before fromJSON; restore its constructor invariant.
    this.canBeUndone = !!this.undoValue;
    return result;
  };
  prototype.fromJSON = patchedFromJSON;
};

exports.deactivate = function () {
  if (!patchedFromJSON) return;

  const prototype = SyncbackMetadataTask.prototype;
  if (prototype.fromJSON === patchedFromJSON) {
    if (originalDescriptor) Object.defineProperty(prototype, 'fromJSON', originalDescriptor);
    else delete prototype.fromJSON;
  }
  patchedFromJSON = null;
};
