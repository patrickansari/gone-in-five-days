module.exports = function () {
    this.findEmails = function (gmail, logger, now) {
        findLabelledEmails(gmail, logger, now);
    };
};

/*
    Don't copy anything above this line to Google Apps Script. ====================
    Everything below here should be copied...
 */

const millisPerDay = 1000 * 60 * 60 * 24;

function findLabelledEmails(gmailApp = GmailApp, logger = Logger, now = new Date()) {
    let labels = gmailApp.getUserLabels();

    for (let i = 0; i < labels.length; i++) {

        let label = labels[i].getName();
        let theSlash = label.indexOf("/");

        if (theSlash !== -1) {
            let period = parseInt(label.substring(theSlash + 1));
            if (!isNaN(period)) {
                if (label.indexOf("gone-in-days") !== -1) {
                    housekeeping(period, gmailApp, logger, now, "label:gone-in-days/", 'moveToTrash');
                }

                if (label.indexOf("archive-in-days") !== -1) {
                    housekeeping(period, gmailApp, logger, now, "label:inbox label:archive-in-days/", 'moveToArchive');
                }
            }
        }
    }
}

function housekeeping(period, gmailApp, logger, now, search, action) {
    let total = 0;
    let searchString = search + period.toString();
    let threads = gmailApp.search(searchString);

    for (i = 0; i < threads.length; i++) {
        let daysOld = Math.floor((now - threads[i].getMessages()[0].getDate()) / millisPerDay);

        if (daysOld > period) {
            logger.log(threads[i].getFirstMessageSubject() + " days old: " + daysOld);
            total++;
            threads[i][action]();
        }
    }

    logger.log('{'+searchString + '} ' + action + ': ' + total + ' of ' + threads.length + ' conversations');
}
