const fs = require('fs');
const { execSync } = require('child_process');

const originalBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

function run(cmd) {
    console.log('Running:', cmd);
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.error('Error running:', cmd);
    }
}

function processIssue(branchName, commitMsg, filePaths, editFn) {
    run(`git checkout -b ${branchName}`);
    filePaths.forEach(fp => {
        let content = fs.readFileSync(fp, 'utf8');
        content = editFn(content);
        fs.writeFileSync(fp, content);
    });
    run(`git add .`);
    run(`git commit -m "${commitMsg}"`);
    run(`git checkout ${originalBranch}`);
}

processIssue('fix/issue-1-trust-score-param', 'Fix missing param description for score in getRankDetails', ['src/trust.js'], content => {
    return content.replace('@param {number} score', '@param {number} score - The user\'s current trust score');
});

processIssue('fix/issue-2-trust-base-amount', 'Fix missing param description for baseAmount in calculateReward', ['src/trust.js'], content => {
    return content.replace('@param {number} baseAmount', '@param {number} baseAmount - The base reward amount');
});

processIssue('fix/issue-3-trust-calc-score-param', 'Fix missing param description for score in calculateReward', ['src/trust.js'], content => {
    return content.replace(/\* @param \{number\} score[\s\S]*?\* @returns \{number\}/, "* @param {number} score - The user's trust score\n     * @returns {number}");
});

processIssue('fix/issue-4-yield-temp-comment', 'Improve comment for default mesophilic temp', ['src/yield-optimizer.js'], content => {
    return content.replace('// Default mesophilic temp', '// Set to default mesophilic temperature.');
});

processIssue('fix/issue-5-cloud-sync-log', 'Remove unnecessary cloud sync engine log', ['src/cloud-sync.js'], content => {
    return content.replace(/.*console\.log\("☁️ Appwrite Cloud Sync Engine Initialized"\);.*\n?/, '');
});

processIssue('fix/issue-6-gps-recovery-log', 'Remove diagnostic console.log for GPS Recovery', ['src/app.js'], content => {
    return content.replace(/.*console\.log\('\[GPS Recovery\] Attempting auto-detection\.\.\.'\);.*\n?/, '');
});

processIssue('fix/issue-7-sw-registered-info', 'Change SW Registration success to console.info', ['src/app.js'], content => {
    return content.replace(/console\.log\('☁️ ReGenX SW v3 Registered'\);/, "console.info('☁️ ReGenX SW v3 Registered');");
});

processIssue('fix/issue-8-sw-registration-error', 'Change SW Registration failure to console.error', ['src/app.js'], content => {
    return content.replace(/console\.log\('SW Registration Failed', err\)/, "console.error('SW Registration Failed', err)");
});

processIssue('fix/issue-9-iot-scan-log', 'Remove unnecessary console.log for IoT Scan Saving', ['src/app.js'], content => {
    return content.replace(/.*console\.log\('IoT Scan Saved:', record\);.*\n?/, '');
});

processIssue('fix/issue-10-yield-optimal-temp-comment', 'Add explanatory comment for optimalTemp assignment', ['src/yield-optimizer.js'], content => {
    return content.replace('let optimalTemp = 37.5;', '// Start with a standard mesophilic temperature\n        let optimalTemp = 37.5;');
});
