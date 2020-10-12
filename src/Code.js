const millisPerDay = 1000 * 60 * 60 * 24;
const archiveLabels = new Set([
    'receipts',
    'archive-in-days/1'
]);

function triggerMe() {
    findLabelledEmails(GmailApp, Logger, new Date());
}

function findLabelledEmails(gmailApp = GmailApp, logger = Logger, now = new Date()) {
    let labels = gmailApp.getUserLabels();

    for (let i = 0; i < labels.length; i++) {

        let label = labels[i].getName();
        let theSlash = label.indexOf("/");

        if (theSlash !== -1) {
            let period = parseInt(label.substring(theSlash + 1));
            if (!isNaN(period)
                && label.indexOf("gone-in-days") !== -1) {
                doHousekeeping(
                    gmailApp,
                    logger,
                    now,
                    "label:gone-in-days/" + period.toString(),
                    period,
                    'moveToTrash');
            }
        } else if (archiveLabels.has(label)) {
            doHousekeeping(
                gmailApp,
                logger,
                now,
                'label:inbox label:' + label,
                1,
                'moveToArchive'
            );
        }
    }
}


function doHousekeeping(gmailApp, logger, now, searchString, period, action) {
    let total = 0;
    let threads = gmailApp.search(searchString);

    for (let i = 0; i < threads.length; i++) {
        let msgDate = threads[i].getMessages()[0].getDate();
        let daysOld = Math.floor((now - msgDate) / millisPerDay);

        if (daysOld > period) {
            logger.log(threads[i].getFirstMessageSubject() + " days old: " + daysOld);
            total++;
            threads[i][action]();
        }
    }

    logger.log('{' + searchString + '} ' + action + ': ' + total + ' of ' + threads.length + ' conversations');
}
