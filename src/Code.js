const millisPerDay = 1000 * 60 * 60 * 24;

// Label formats supported:
// - archive-in-days/<n>
// - gone-in-days/<n>
const labelPolicies = [
    { prefix: 'archive-in-days/', action: 'moveToArchive' },
    { prefix: 'gone-in-days/', action: 'moveToTrash' }
];

function triggerMe() {
    findLabelledEmails(GmailApp, Logger, new Date());
}

function findLabelledEmails(gmailApp = GmailApp, logger = Logger, now = new Date()) {
    const labels = gmailApp.getUserLabels();

    for (let i = 0; i < labels.length; i++) {
        const label = labels[i].getName();
        const rule = resolveRuleForLabel(label);
        if (!rule) continue;

        // Consistent behavior for archive + delete: label scope only
        const searchString = 'label:' + label;

        doHousekeeping(gmailApp, logger, now, searchString, rule.period, rule.action);
    }
}

function resolveRuleForLabel(label) {
    for (let i = 0; i < labelPolicies.length; i++) {
        const policy = labelPolicies[i];

        if (!label.startsWith(policy.prefix)) continue;

        const period = parseInt(label.substring(policy.prefix.length), 10);
        if (!isNaN(period) && period >= 0) {
            return {
                action: policy.action,
                period
            };
        }
    }

    return null;
}

function doHousekeeping(gmailApp, logger, now, searchString, period, action) {
    let total = 0;
    const threads = gmailApp.search(searchString);

    for (let i = 0; i < threads.length; i++) {
        const msgDate = threads[i].getMessages()[0].getDate();
        const daysOld = Math.floor((now - msgDate) / millisPerDay);

        // Perform action on the configured day (not the day after)
        if (daysOld >= period) {
            logger.log(threads[i].getFirstMessageSubject() + ' days old: ' + daysOld);
            total++;
            threads[i][action]();
        }
    }

    logger.log('{' + searchString + '} ' + action + ': ' + total + ' of ' + threads.length + ' conversations');
}
