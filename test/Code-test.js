const chai = require('chai');
const assert = chai.assert;

const gas = require('gas-local');
const glib = gas.require('./src');

const millisPerDay = 1000 * 60 * 60 * 24;

function userLabel(name) {
    return {
        getName: function () {
            return name;
        }
    };
}

function userThread(date, subject) {
    return {
        result: [],
        describe: function () {
            if (this.result.length === 0) return subject;
            return subject + ' -> ' + this.result.join(',');
        },
        getMessages: function () {
            return [{
                getDate: function () {
                    return date;
                }
            }];
        },
        getFirstMessageSubject: function () {
            return subject;
        },
        moveToTrash: function () {
            this.result.push('moveToTrash');
        },
        moveToArchive: function () {
            this.result.push('moveToArchive');
        }
    };
}

function makeFixture(now) {
    const archiveEq = userThread(new Date(now.getTime() - (3 * millisPerDay)), 'archive days = 3');
    const archiveOlder = userThread(new Date(now.getTime() - (4 * millisPerDay)), 'archive days = 4');
    const archiveYounger = userThread(new Date(now.getTime() - (2 * millisPerDay)), 'archive days = 2');

    const deleteEq = userThread(new Date(now.getTime() - (5 * millisPerDay)), 'delete days = 5');
    const deleteOlder = userThread(new Date(now.getTime() - (6 * millisPerDay)), 'delete days = 6');
    const deleteYounger = userThread(new Date(now.getTime() - (4 * millisPerDay)), 'delete days = 4');

    const invalidLabelThread = userThread(new Date(now.getTime() - (10 * millisPerDay)), 'invalid label should never be touched');

    const allLabelledMsgs = {
        'label:archive-in-days/3': [archiveEq, archiveOlder, archiveYounger],
        'label:gone-in-days/5': [deleteEq, deleteOlder, deleteYounger],
        'label:archive-in-days/nope': [invalidLabelThread],
        'label:receipts': [invalidLabelThread]
    };

    const searches = [];

    const gmail = {
        getUserLabels: function () {
            return [
                userLabel('archive-in-days/3'),
                userLabel('gone-in-days/5'),
                userLabel('archive-in-days/nope'),
                userLabel('receipts'),
                userLabel('gone-in-days/NaN')
            ];
        },
        search: function (s) {
            searches.push(s);
            return s in allLabelledMsgs ? allLabelledMsgs[s] : [];
        }
    };

    const logs = [];
    const logger = {
        log: function (msg) {
            logs.push(msg);
        }
    };

    return {
        gmail,
        logger,
        searches,
        logs,
        threads: {
            archiveEq,
            archiveOlder,
            archiveYounger,
            deleteEq,
            deleteOlder,
            deleteYounger,
            invalidLabelThread
        }
    };
}

describe('Code.js tests', function () {

    it('applies archive and delete actions using /<n> label policies', function () {
        const now = new Date('2026-06-29T12:00:00.000Z');
        const fixture = makeFixture(now);

        glib.findLabelledEmails(fixture.gmail, fixture.logger, now);

        assert.deepEqual(fixture.threads.archiveEq.result, ['moveToArchive']);
        assert.deepEqual(fixture.threads.archiveOlder.result, ['moveToArchive']);
        assert.deepEqual(fixture.threads.archiveYounger.result, []);

        assert.deepEqual(fixture.threads.deleteEq.result, ['moveToTrash']);
        assert.deepEqual(fixture.threads.deleteOlder.result, ['moveToTrash']);
        assert.deepEqual(fixture.threads.deleteYounger.result, []);
    });

    it('acts on the configured day (>= boundary)', function () {
        const now = new Date('2026-06-29T12:00:00.000Z');
        const fixture = makeFixture(now);

        glib.findLabelledEmails(fixture.gmail, fixture.logger, now);

        assert.include(fixture.threads.archiveEq.result, 'moveToArchive', 'archive should run when daysOld === period');
        assert.include(fixture.threads.deleteEq.result, 'moveToTrash', 'delete should run when daysOld === period');
    });

    it('uses consistent search scope for archive and delete labels (label:<name>)', function () {
        const now = new Date('2026-06-29T12:00:00.000Z');
        const fixture = makeFixture(now);

        glib.findLabelledEmails(fixture.gmail, fixture.logger, now);

        assert.include(fixture.searches, 'label:archive-in-days/3');
        assert.include(fixture.searches, 'label:gone-in-days/5');

        const hasInboxScopedSearch = fixture.searches.some(function (s) {
            return s.indexOf('label:inbox') !== -1;
        });
        assert.isFalse(hasInboxScopedSearch, 'should not use inbox-only scoped search anymore');
    });

    it('ignores invalid labels safely (non-numeric /<n> and unrelated labels)', function () {
        const now = new Date('2026-06-29T12:00:00.000Z');
        const fixture = makeFixture(now);

        glib.findLabelledEmails(fixture.gmail, fixture.logger, now);

        assert.deepEqual(fixture.threads.invalidLabelThread.result, []);

        const invalidSearches = fixture.searches.filter(function (s) {
            return s === 'label:archive-in-days/nope' || s === 'label:receipts' || s === 'label:gone-in-days/NaN';
        });
        assert.deepEqual(invalidSearches, [], 'invalid/unrelated labels should never trigger search or action');
    });

    it('logs summary lines for each valid policy search', function () {
        const now = new Date('2026-06-29T12:00:00.000Z');
        const fixture = makeFixture(now);

        glib.findLabelledEmails(fixture.gmail, fixture.logger, now);

        const archiveSummary = fixture.logs.find(function (line) {
            return String(line).indexOf('{label:archive-in-days/3} moveToArchive: 2 of 3 conversations') !== -1;
        });

        const deleteSummary = fixture.logs.find(function (line) {
            return String(line).indexOf('{label:gone-in-days/5} moveToTrash: 2 of 3 conversations') !== -1;
        });

        assert.isOk(archiveSummary);
        assert.isOk(deleteSummary);
    });
});
