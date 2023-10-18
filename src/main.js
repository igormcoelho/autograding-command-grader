const core = require('@actions/core');
const { execSync } = require('child_process');

function btoa(str) {
    return Buffer.from(str).toString('base64');
}

function generateResult(status, testName, command, message, duration, maxScore) {
    return {
        version: 1,
        status: status,
        max_score: maxScore,
        tests: [{
            name: testName,
            status: status,
            score: status === 'pass' ? maxScore : 0,
            message: message,
            test_code: command,
            filename: "",
            line_no: 0,
            duration: duration
        }]
    };
}

function getErrorMessage(error, command) {
    if (error.message.includes("ETIMEDOUT")) {
        return "Command timed out";
    }
    if (error.message.includes("command not found")) {
        return `Unable to locate executable file: ${command}`;
    }
    if (error.message.includes("Command failed")) {
        return "failed with exit code 1";
    }
    return error.message;
}

function run() {
    const testName = core.getInput('test-name', { required: true });
    const setupCommand = core.getInput('setup-command');
    const command = core.getInput('command', { required: true });
    const timeout = parseFloat(core.getInput('timeout') || 60) * 60000; // Convert to minutes
    const maxScore = parseInt(core.getInput('max-score') || 0);

    let output = '';
    let startTime;
    let endTime;
    let result;

    try {
        if (setupCommand) {
            execSync(setupCommand, { timeout: timeout });
        }

        startTime = new Date();
        output = execSync(command, { timeout: timeout }).toString();
        endTime = new Date();

        result = generateResult('pass', testName, command, output, endTime - startTime, maxScore);

    } catch (error) {
        endTime = new Date();
        const errorMessage = getErrorMessage(error, command);
        result = generateResult('fail', testName, command, errorMessage, endTime - startTime, maxScore);
    }

    core.setOutput('result', btoa(JSON.stringify(result)));
}

run();
