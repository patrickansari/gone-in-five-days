const chai = require('chai');
const assert = chai.assert;
const Code = require('../Code');

const millisPerDay = 1000 * 60 * 60 * 24;
const now = new Date();

function user_label(name) {
    return {
        getName: function () {
            return name;
        }
    }
}

function user_thread(date, subject) {
    return {
        result: [],
        describe: function () {
            if (this.result.length === 0)
                return subject;

            return subject + ' -> ' + this.result;
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
            this.result.push("moveToTrash");
        },
        moveToArchive: function () {
            this.result.push("moveToArchive");
        }
    };
}

const deletedIn5 = user_thread(Math.floor(now - (7 * millisPerDay)), "gone-in-5 (days > 5)");
const notDeletedIn5 = user_thread(Math.floor(now - (5 * millisPerDay)), "gone-in-5 (days = 5)");
const deletedIn2 = user_thread(Math.floor(now - (3 * millisPerDay)), "gone-in-2 (days > 2)");
const notDeletedIn2 = user_thread(Math.floor(now - (2 * millisPerDay)), "gone-in-2 (days = 2)");
const archivedIn1 = user_thread(Math.floor(now - (2 * millisPerDay)), "receipts (days > 1)");
const notArchivedIn1 = user_thread(Math.floor(now - (1 * millisPerDay)), "receipts (days = 0)");


const gone_in_days_5_messages = [
    deletedIn5,
    notDeletedIn5
];

const gone_in_days_2_messages = [
    deletedIn2,
    notDeletedIn2
];

const archive_in_days_1_messages = [
    archivedIn1,
    notArchivedIn1
];

const all_labelled_msgs = {
    "label:gone-in-days/5": gone_in_days_5_messages,
    'label:gone-in-days/2': gone_in_days_2_messages,
    'label:inbox label:receipts': archive_in_days_1_messages
}

let gmail = {
    getUserLabels: function () {
        return [
            user_label("gone-in-days/5"),
            user_label("gone-in-days/2"),
            user_label("receipts"),
            user_label("archive-in-days/1")
        ];
    },

    search: function (s) {
        return s in all_labelled_msgs ? all_labelled_msgs[s] : [];
    }
}

let logger = {
    log: function () {} // ignored for now
}


describe('Code.js tests', function () {
    let code;

    beforeEach(function () {
        code = new Code();
    });

    it('uses hard coded objects', function () {

        code.findEmails(gmail, logger, now);

        assert.equal(
            describe(),
            "gone-in-5 (days > 5) -> moveToTrash\n" +
            "gone-in-5 (days = 5)\n" +
            "gone-in-2 (days > 2) -> moveToTrash\n" +
            "gone-in-2 (days = 2)\n" +
            "receipts (days > 1) -> moveToArchive\n" +
            "receipts (days = 0)"
        );
    });

    function describe() {
        let actual = '';
        for (let v in all_labelled_msgs) {
            let messages = all_labelled_msgs[v];

            for (let i = 0; i < messages.length; i++)
                actual += messages[i].describe() + '\n';
        }

        return actual.trim();
    }
});