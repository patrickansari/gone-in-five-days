# gone-in-five-days

Google Apps Script for automatic Gmail housekeeping based on label names.

## Clone and run
````shell script
git clone git@github.com:patrickansari/gone-in-five-days.git
cd gone-in-five-days
npm install
npm test
````

## What it does

The script scans your Gmail user labels and applies actions to matching threads based on this format:

- `archive-in-days/<n>` → archive threads at age **n** days or older
- `gone-in-days/<n>` → move threads to trash at age **n** days or older

`n` must be a non-negative integer.

Actions run when:

- `daysOld >= n`

So a `.../5` label is processed starting on day 5 (not day 6).

## Current behavior

- Label matching is policy-based in `src/Code.js`.
- Archive and delete use a consistent Gmail search scope:
  - `label:<full-label-name>`
- Labels that do not match a supported prefix + numeric day value are ignored safely.

## Supported label examples

- `archive-in-days/0` (archive immediately)
- `archive-in-days/3`
- `gone-in-days/5`
- `gone-in-days/30`

Ignored examples:

- `archive-in-days/nope`
- `gone-in-days/NaN`
- `receipts`

## How to use

1. In Gmail, create labels following one of the supported formats above.
2. Apply those labels to threads you want managed.
3. Run `triggerMe()` manually once to validate behavior.
4. Add a time-driven trigger in Apps Script to run `triggerMe()` automatically (for example, daily).

## Logging

For each matched label, the script logs:

- per-thread action lines (subject + age)
- a summary line in this form:

`{label:<name>} <action>: <processed> of <total> conversations`

## Tests

Behavior is covered by tests in:

- `test/Code-test.js`

The test suite verifies:

- action mapping for both label prefixes
- boundary behavior at exactly `n` days
- consistent search scope
- safe handling of invalid/unrelated labels
