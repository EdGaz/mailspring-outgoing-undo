# Outgoing Undo for Mailspring

Restores Mailspring's built-in **Sending soon…** toast in the main window when
sending from a separate composer window. The existing countdown, **Undo**, and
**Send now instead** controls remain Mailspring's own controls.

## Install

1. Download `mailspring-outgoing-undo.zip` from the
   [latest release](https://github.com/EdGaz/mailspring-outgoing-undo/releases/latest).
2. Extract the ZIP. Copy the `mailspring-outgoing-undo` folder into Mailspring's
   `packages` directory (create `packages` if it doesn't exist).
3. Save open drafts and restart Mailspring.
4. Enable a nonzero **Undo Send** delay in Mailspring's sending preferences.

Typical package directories:

| Platform | Directory |
| --- | --- |
| macOS | `~/Library/Application Support/Mailspring/packages/` |
| Linux | `~/.config/Mailspring/packages/` |
| Windows | `%APPDATA%\Mailspring\packages\` |

Linux installations using a custom `XDG_CONFIG_HOME`, Snap, or a custom config
directory may use a different location. **Developer > Show Mailsync Logs**
opens the configuration directory; create/use its `packages` subdirectory.
The installed folder must contain `package.json` directly, without an extra
nested folder. No npm install or build is needed.

To remove it, delete `mailspring-outgoing-undo` from the packages directory and
restart Mailspring.

## Why it works

In Mailspring 1.25.0, `SyncbackMetadataTask` calculates `canBeUndone` in its
constructor. The cross-window action bridge reconstructs an empty task and
then fills it with `fromJSON`, leaving that flag false even when `undoValue`
is present. `UndoRedoStore` therefore ignores the task and shows no toast.

This plugin wraps that task's `fromJSON` in the main window to recalculate
the flag after loading the data. It restores the original method when disabled.
It adds no sending mechanism, network access, or dependencies.

## Compatibility and validation

The implementation was checked against Mailspring **1.25.0** (commit
`add26bb9`) on macOS. It uses an internal API; other versions may require
changes. Windows and Linux have not been tested.

The isolated regression check passes. A separate check against extracted
Mailspring 1.25.0 source reproduced the missing flag and verified that the
plugin lets the native undo store register the task and queue cancellation
metadata. **Live email sending and clicking the toast have not been tested.**

The plugin uses the existing undo-send delay. It cannot recall a message
after delivery or provide an undo window when the delay is disabled.

## Check

Run `node test.js` (or `npm test`) for the isolated regression check.

For a live check, send a test message to yourself from a new compose window,
then click **Undo** in the main window before the countdown ends. Confirm it
remains a draft. Also check a normal inline reply and **Send now instead**.
Automated checks do not send email.

Mailspring's package installation convention is documented in the
[official plugin starter](https://github.com/Foundry376/Mailspring-Plugin-Starter).

## Feedback

[Open an issue](https://github.com/EdGaz/mailspring-outgoing-undo/issues) with
your Mailspring version, operating system, Undo Send delay, and whether the
message was sent inline or from a separate window. Do not include private
message content or account credentials.

## License

[MIT](LICENSE). This is an unofficial community plugin.
