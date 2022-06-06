"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shellWithAction = exports.randomInteger = exports.SamIntegrationTestFixture = exports.withSamIntegrationFixture = exports.withSamIntegrationCdkApp = void 0;
const child_process = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const axios_1 = require("axios");
const cdk_1 = require("./cdk");
/**
 * Higher order function to execute a block with a SAM Integration CDK app fixture
 */
function withSamIntegrationCdkApp(block) {
    return async (context) => {
        const randy = cdk_1.randomString();
        const stackNamePrefix = `cdktest-${randy}`;
        const integTestDir = path.join(os.tmpdir(), `cdk-integ-${randy}`);
        context.output.write(` Stack prefix:   ${stackNamePrefix}\n`);
        context.output.write(` Test directory: ${integTestDir}\n`);
        context.output.write(` Region:         ${context.aws.region}\n`);
        await cdk_1.cloneDirectory(path.join(__dirname, '..', 'cli', 'sam_cdk_integ_app'), integTestDir, context.output);
        const fixture = new SamIntegrationTestFixture(integTestDir, stackNamePrefix, context.output, context.aws);
        let success = true;
        try {
            const installationVersion = cdk_1.FRAMEWORK_VERSION;
            if (cdk_1.MAJOR_VERSION === '1') {
                await cdk_1.installNpmPackages(fixture, {
                    '@aws-cdk/aws-iam': installationVersion,
                    '@aws-cdk/aws-apigateway': installationVersion,
                    '@aws-cdk/aws-lambda': installationVersion,
                    '@aws-cdk/aws-lambda-go': installationVersion,
                    '@aws-cdk/aws-lambda-nodejs': installationVersion,
                    '@aws-cdk/aws-lambda-python': installationVersion,
                    '@aws-cdk/aws-logs': installationVersion,
                    '@aws-cdk/core': installationVersion,
                    'constructs': '^3',
                });
            }
            else {
                const alphaInstallationVersion = installationVersion.includes('rc') ? installationVersion.replace('rc', 'alpha') : `${installationVersion}-alpha.0`;
                await cdk_1.installNpmPackages(fixture, {
                    'aws-cdk-lib': installationVersion,
                    '@aws-cdk/aws-lambda-go-alpha': alphaInstallationVersion,
                    '@aws-cdk/aws-lambda-python-alpha': alphaInstallationVersion,
                    'constructs': '^10',
                });
            }
            await block(fixture);
        }
        catch (e) {
            success = false;
            throw e;
        }
        finally {
            if (process.env.INTEG_NO_CLEAN) {
                process.stderr.write(`Left test directory in '${integTestDir}' ($INTEG_NO_CLEAN)\n`);
            }
            else {
                await fixture.dispose(success);
            }
        }
    };
}
exports.withSamIntegrationCdkApp = withSamIntegrationCdkApp;
/**
 * SAM Integration test fixture for CDK - SAM integration test cases
 */
function withSamIntegrationFixture(block) {
    return cdk_1.withAws(withSamIntegrationCdkApp(block));
}
exports.withSamIntegrationFixture = withSamIntegrationFixture;
class SamIntegrationTestFixture extends cdk_1.TestFixture {
    constructor(integTestDir, stackNamePrefix, output, aws) {
        super(integTestDir, stackNamePrefix, output, aws);
        this.integTestDir = integTestDir;
        this.stackNamePrefix = stackNamePrefix;
        this.output = output;
        this.aws = aws;
    }
    async samShell(command, filter, action, options = {}) {
        return shellWithAction(command, filter, action, {
            output: this.output,
            cwd: path.join(this.integTestDir, 'cdk.out').toString(),
            ...options,
        });
    }
    async samBuild(stackName) {
        const fullStackName = this.fullStackName(stackName);
        const templatePath = path.join(this.integTestDir, 'cdk.out', `${fullStackName}.template.json`);
        const args = ['--template', templatePath.toString()];
        return this.samShell(['sam', 'build', ...args]);
    }
    async samLocalStartApi(stackName, isBuilt, port, apiPath) {
        const fullStackName = this.fullStackName(stackName);
        const templatePath = path.join(this.integTestDir, 'cdk.out', `${fullStackName}.template.json`);
        const args = isBuilt ? [] : ['--template', templatePath.toString()];
        args.push('--port');
        args.push(port.toString());
        return this.samShell(['sam', 'local', 'start-api', ...args], '(Press CTRL+C to quit)', () => {
            return new Promise((resolve, reject) => {
                axios_1.default.get(`http://127.0.0.1:${port}${apiPath}`).then(resp => {
                    resolve(resp.data);
                }).catch(error => {
                    reject(new Error(`Failed to invoke api path ${apiPath} on port ${port} with error ${error}`));
                });
            });
        });
    }
    /**
     * Cleanup leftover stacks and buckets
     */
    async dispose(success) {
        // If the tests completed successfully, happily delete the fixture
        // (otherwise leave it for humans to inspect)
        if (success) {
            cdk_1.rimraf(this.integTestDir);
        }
    }
}
exports.SamIntegrationTestFixture = SamIntegrationTestFixture;
function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
exports.randomInteger = randomInteger;
/**
 * A shell command that does what you want
 *
 * Is platform-aware, handles errors nicely.
 */
async function shellWithAction(command, filter, action, options = {}) {
    var _a, _b;
    if (options.modEnv && options.env) {
        throw new Error('Use either env or modEnv but not both');
    }
    (_a = options.output) === null || _a === void 0 ? void 0 : _a.write(`💻 ${command.join(' ')}\n`);
    const env = (_b = options.env) !== null && _b !== void 0 ? _b : (options.modEnv ? { ...process.env, ...options.modEnv } : undefined);
    const child = child_process.spawn(command[0], command.slice(1), {
        ...options,
        env,
        // Need this for Windows where we want .cmd and .bat to be found as well.
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new Promise((resolve, reject) => {
        const out = new Array();
        const stdout = new Array();
        const stderr = new Array();
        let actionSucceeded = false;
        let actionOutput;
        let actionExecuted = false;
        function executeAction(chunk) {
            var _a;
            out.push(chunk);
            if (!actionExecuted && typeof filter === 'string' && out.toString().includes(filter) && typeof action === 'function') {
                actionExecuted = true;
                (_a = options.output) === null || _a === void 0 ? void 0 : _a.write('before executing action');
                action().then((output) => {
                    var _a;
                    (_a = options.output) === null || _a === void 0 ? void 0 : _a.write(`action output is ${output}`);
                    actionOutput = output;
                    actionSucceeded = true;
                }).catch((error) => {
                    var _a;
                    (_a = options.output) === null || _a === void 0 ? void 0 : _a.write(`action error is ${error}`);
                    actionSucceeded = false;
                    actionOutput = error;
                }).finally(() => {
                    var _a;
                    (_a = options.output) === null || _a === void 0 ? void 0 : _a.write('terminate sam sub process');
                    killSubProcess(child, command.join(' '));
                });
            }
        }
        child.stdout.on('data', chunk => {
            var _a;
            (_a = options.output) === null || _a === void 0 ? void 0 : _a.write(chunk);
            stdout.push(chunk);
            executeAction(chunk);
        });
        child.stderr.on('data', chunk => {
            var _a, _b;
            (_a = options.output) === null || _a === void 0 ? void 0 : _a.write(chunk);
            if ((_b = options.captureStderr) !== null && _b !== void 0 ? _b : true) {
                stderr.push(chunk);
            }
            executeAction(chunk);
        });
        child.once('error', reject);
        child.once('close', code => {
            const output = (Buffer.concat(stdout).toString('utf-8') + Buffer.concat(stderr).toString('utf-8')).trim();
            if (code == null || code === 0 || options.allowErrExit) {
                let result = new Array();
                result.push(actionOutput);
                result.push(output);
                resolve({
                    actionSucceeded: actionSucceeded,
                    actionOutput: actionOutput,
                    shellOutput: output,
                });
            }
            else {
                reject(new Error(`'${command.join(' ')}' exited with error code ${code}. Output: \n${output}`));
            }
        });
    });
}
exports.shellWithAction = shellWithAction;
function killSubProcess(child, command) {
    /**
     * Check if the sub process is running in container, so child_process.spawn will
     * create multiple processes, and to kill all of them we need to run different logic
     */
    if (fs.existsSync('/.dockerenv')) {
        child_process.exec(`for pid in $(ps -ef | grep "${command}" | awk '{print $2}'); do kill -2 $pid; done`);
    }
    else {
        child.kill('SIGINT');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2FtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUErQztBQUMvQyx5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLDZCQUE2QjtBQUM3QixpQ0FBMEI7QUFFMUIsK0JBTWU7QUFXZjs7R0FFRztBQUNILFNBQWdCLHdCQUF3QixDQUFxQyxLQUE0RDtJQUN2SSxPQUFPLEtBQUssRUFBRSxPQUFVLEVBQUUsRUFBRTtRQUMxQixNQUFNLEtBQUssR0FBRyxrQkFBWSxFQUFFLENBQUM7UUFDN0IsTUFBTSxlQUFlLEdBQUcsV0FBVyxLQUFLLEVBQUUsQ0FBQztRQUMzQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxhQUFhLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFbEUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLGVBQWUsSUFBSSxDQUFDLENBQUM7UUFDOUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLFlBQVksSUFBSSxDQUFDLENBQUM7UUFDM0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztRQUVqRSxNQUFNLG9CQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLFlBQVksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0csTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBeUIsQ0FDM0MsWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLENBQUMsTUFBTSxFQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVmLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztRQUNuQixJQUFJO1lBQ0YsTUFB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OEMsQ0FBQyxDQUFDO0tBQzFHO1NBQU07UUFDTCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3RCO0FBRUgsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNoaWxkX3Byb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcbmltcG9ydCB7IEF3c0NsaWVudHMgfSBmcm9tICcuL2F3cyc7XG5pbXBvcnQge1xuICBBd3NDb250ZXh0LFxuICBjbG9uZURpcmVjdG9yeSwgRlJBTUVXT1JLX1ZFUlNJT04sIGluc3RhbGxOcG1QYWNrYWdlcyxcbiAgTUFKT1JfVkVSU0lPTixcbiAgcmFuZG9tU3RyaW5nLCByaW1yYWYsIFNoZWxsT3B0aW9ucyxcbiAgVGVzdEZpeHR1cmUsIHdpdGhBd3MsXG59IGZyb20gJy4vY2RrJztcbmltcG9ydCB7IFRlc3RDb250ZXh0IH0gZnJvbSAnLi90ZXN0LWhlbHBlcnMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uT3V0cHV0IHtcbiAgYWN0aW9uU3VjY2VlZGVkPzogYm9vbGVhbjtcbiAgYWN0aW9uT3V0cHV0PzogYW55O1xuICBzaGVsbE91dHB1dD86IHN0cmluZztcbn1cblxuXG4vKipcbiAqIEhpZ2hlciBvcmRlciBmdW5jdGlvbiB0byBleGVjdXRlIGEgYmxvY2sgd2l0aCBhIFNBTSBJbnRlZ3JhdGlvbiBDREsgYXBwIGZpeHR1cmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhTYW1JbnRlZ3JhdGlvbkNka0FwcDxBIGV4dGVuZHMgVGVzdENvbnRleHQgJiBBd3NDb250ZXh0PihibG9jazogKGNvbnRleHQ6IFNhbUludGVncmF0aW9uVGVzdEZpeHR1cmUpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgcmV0dXJuIGFzeW5jIChjb250ZXh0OiBBKSA9PiB7XG4gICAgY29uc3QgcmFuZHkgPSByYW5kb21TdHJpbmcoKTtcbiAgICBjb25zdCBzdGFja05hbWVQcmVmaXggPSBgY2RrdGVzdC0ke3JhbmR5fWA7XG4gICAgY29uc3QgaW50ZWdUZXN0RGlyID0gcGF0aC5qb2luKG9zLnRtcGRpcigpLCBgY2RrLWludGVnLSR7cmFuZHl9YCk7XG5cbiAgICBjb250ZXh0Lm91dHB1dC53cml0ZShgIFN0YWNrIHByZWZpeDogICAke3N0YWNrTmFtZVByZWZpeH1cXG5gKTtcbiAgICBjb250ZXh0Lm91dHB1dC53cml0ZShgIFRlc3QgZGlyZWN0b3J5OiAke2ludGVnVGVzdERpcn1cXG5gKTtcbiAgICBjb250ZXh0Lm91dHB1dC53cml0ZShgIFJlZ2lvbjogICAgICAgICAke2NvbnRleHQuYXdzLnJlZ2lvbn1cXG5gKTtcblxuICAgIGF3YWl0IGNsb25lRGlyZWN0b3J5KHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdjbGknLCAnc2FtX2Nka19pbnRlZ19hcHAnKSwgaW50ZWdUZXN0RGlyLCBjb250ZXh0Lm91dHB1dCk7XG4gICAgY29uc3QgZml4dHVyZSA9IG5ldyBTYW1JbnRlZ3JhdGlvblRlc3RGaXh0dXJlKFxuICAgICAgaW50ZWdUZXN0RGlyLFxuICAgICAgc3RhY2tOYW1lUHJlZml4LFxuICAgICAgY29udGV4dC5vdXRwdXQsXG4gICAgICBjb250ZXh0LmF3cyk7XG5cbiAgICBsZXQgc3VjY2VzcyA9IHRydWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGluc3RhbGxhdGlvblZlcnNpb24gPSBGUkFNRVdPUktfVkVSU0lPTjtcblxuICAgICAgaWYgKE1BSk9SX1ZFUlNJT04gPT09ICcxJykge1xuICAgICAgICBhd2FpdCBpbnN0YWxsTnBtUGFja2FnZXMoZml4dHVyZSwge1xuICAgICAgICAgICdAYXdzLWNkay9hd3MtaWFtJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXknOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3MtbGFtYmRhJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWxhbWJkYS1nbyc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2F3cy1sYW1iZGEtbm9kZWpzJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWxhbWJkYS1weXRob24nOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdAYXdzLWNkay9hd3MtbG9ncyc6IGluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ0Bhd3MtY2RrL2NvcmUnOiBpbnN0YWxsYXRpb25WZXJzaW9uLFxuICAgICAgICAgICdjb25zdHJ1Y3RzJzogJ14zJyxcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBhbHBoYUluc3RhbGxhdGlvblZlcnNpb24gPSBpbnN0YWxsYXRpb25WZXJzaW9uLmluY2x1ZGVzKCdyYycpID8gaW5zdGFsbGF0aW9uVmVyc2lvbi5yZXBsYWNlKCdyYycsICdhbHBoYScpIDogYCR7aW5zdGFsbGF0aW9uVmVyc2lvbn0tYWxwaGEuMGA7XG4gICAgICAgIGF3YWl0IGluc3RhbGxOcG1QYWNrYWdlcyhmaXh0dXJlLCB7XG4gICAgICAgICAgJ2F3cy1jZGstbGliJzogaW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWxhbWJkYS1nby1hbHBoYSc6IGFscGhhSW5zdGFsbGF0aW9uVmVyc2lvbixcbiAgICAgICAgICAnQGF3cy1jZGsvYXdzLWxhbWJkYS1weXRob24tYWxwaGEnOiBhbHBoYUluc3RhbGxhdGlvblZlcnNpb24sXG4gICAgICAgICAgJ2NvbnN0cnVjdHMnOiAnXjEwJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBhd2FpdCBibG9jayhmaXh0dXJlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBpZiAocHJvY2Vzcy5lbnYuSU5URUdfTk9fQ0xFQU4pIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYExlZnQgdGVzdCBkaXJlY3RvcnkgaW4gJyR7aW50ZWdUZXN0RGlyfScgKCRJTlRFR19OT19DTEVBTilcXG5gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZpeHR1cmUuZGlzcG9zZShzdWNjZXNzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogU0FNIEludGVncmF0aW9uIHRlc3QgZml4dHVyZSBmb3IgQ0RLIC0gU0FNIGludGVncmF0aW9uIHRlc3QgY2FzZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpdGhTYW1JbnRlZ3JhdGlvbkZpeHR1cmUoYmxvY2s6IChjb250ZXh0OiBTYW1JbnRlZ3JhdGlvblRlc3RGaXh0dXJlKSA9PiBQcm9taXNlPHZvaWQ+KSB7XG4gIHJldHVybiB3aXRoQXdzPFRlc3RDb250ZXh0Pih3aXRoU2FtSW50ZWdyYXRpb25DZGtBcHAoYmxvY2spKTtcbn1cblxuZXhwb3J0IGNsYXNzIFNhbUludGVncmF0aW9uVGVzdEZpeHR1cmUgZXh0ZW5kcyBUZXN0Rml4dHVyZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBpbnRlZ1Rlc3REaXI6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhY2tOYW1lUHJlZml4OiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IG91dHB1dDogTm9kZUpTLldyaXRhYmxlU3RyZWFtLFxuICAgIHB1YmxpYyByZWFkb25seSBhd3M6IEF3c0NsaWVudHMpIHtcbiAgICBzdXBlcihpbnRlZ1Rlc3REaXIsIHN0YWNrTmFtZVByZWZpeCwgb3V0cHV0LCBhd3MpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNhbVNoZWxsKGNvbW1hbmQ6IHN0cmluZ1tdLCBmaWx0ZXI/OiBzdHJpbmcsIGFjdGlvbj86ICgpID0+IGFueSwgb3B0aW9uczogT21pdDxTaGVsbE9wdGlvbnMsICdjd2QnIHwgJ291dHB1dCc+ID0ge30pOiBQcm9taXNlPEFjdGlvbk91dHB1dD4ge1xuICAgIHJldHVybiBzaGVsbFdpdGhBY3Rpb24oY29tbWFuZCwgZmlsdGVyLCBhY3Rpb24sIHtcbiAgICAgIG91dHB1dDogdGhpcy5vdXRwdXQsXG4gICAgICBjd2Q6IHBhdGguam9pbih0aGlzLmludGVnVGVzdERpciwgJ2Nkay5vdXQnKS50b1N0cmluZygpLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzYW1CdWlsZChzdGFja05hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IGZ1bGxTdGFja05hbWUgPSB0aGlzLmZ1bGxTdGFja05hbWUoc3RhY2tOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBwYXRoLmpvaW4odGhpcy5pbnRlZ1Rlc3REaXIsICdjZGsub3V0JywgYCR7ZnVsbFN0YWNrTmFtZX0udGVtcGxhdGUuanNvbmApO1xuICAgIGNvbnN0IGFyZ3MgPSBbJy0tdGVtcGxhdGUnLCB0ZW1wbGF0ZVBhdGgudG9TdHJpbmcoKV07XG4gICAgcmV0dXJuIHRoaXMuc2FtU2hlbGwoWydzYW0nLCAnYnVpbGQnLCAuLi5hcmdzXSk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgc2FtTG9jYWxTdGFydEFwaShzdGFja05hbWU6IHN0cmluZywgaXNCdWlsdDogYm9vbGVhbiwgcG9ydDogbnVtYmVyLCBhcGlQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvbk91dHB1dD4ge1xuICAgIGNvbnN0IGZ1bGxTdGFja05hbWUgPSB0aGlzLmZ1bGxTdGFja05hbWUoc3RhY2tOYW1lKTtcbiAgICBjb25zdCB0ZW1wbGF0ZVBhdGggPSBwYXRoLmpvaW4odGhpcy5pbnRlZ1Rlc3REaXIsICdjZGsub3V0JywgYCR7ZnVsbFN0YWNrTmFtZX0udGVtcGxhdGUuanNvbmApO1xuICAgIGNvbnN0IGFyZ3MgPSBpc0J1aWx0PyBbXSA6IFsnLS10ZW1wbGF0ZScsIHRlbXBsYXRlUGF0aC50b1N0cmluZygpXTtcbiAgICBhcmdzLnB1c2goJy0tcG9ydCcpO1xuICAgIGFyZ3MucHVzaChwb3J0LnRvU3RyaW5nKCkpO1xuXG4gICAgcmV0dXJuIHRoaXMuc2FtU2hlbGwoWydzYW0nLCAnbG9jYWwnLCAnc3RhcnQtYXBpJywgLi4uYXJnc10sICcoUHJlc3MgQ1RSTCtDIHRvIHF1aXQpJywgKCk9PntcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxBY3Rpb25PdXRwdXQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgYXhpb3MuZ2V0KGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0ke2FwaVBhdGh9YCkudGhlbiggcmVzcCA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShyZXNwLmRhdGEpO1xuICAgICAgICB9KS5jYXRjaCggZXJyb3IgPT4ge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBpbnZva2UgYXBpIHBhdGggJHthcGlQYXRofSBvbiBwb3J0ICR7cG9ydH0gd2l0aCBlcnJvciAke2Vycm9yfWApKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnVwIGxlZnRvdmVyIHN0YWNrcyBhbmQgYnVja2V0c1xuICAgKi9cbiAgcHVibGljIGFzeW5jIGRpc3Bvc2Uoc3VjY2VzczogYm9vbGVhbikge1xuICAgIC8vIElmIHRoZSB0ZXN0cyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LCBoYXBwaWx5IGRlbGV0ZSB0aGUgZml4dHVyZVxuICAgIC8vIChvdGhlcndpc2UgbGVhdmUgaXQgZm9yIGh1bWFucyB0byBpbnNwZWN0KVxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICByaW1yYWYodGhpcy5pbnRlZ1Rlc3REaXIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmFuZG9tSW50ZWdlcihtaW46IG51bWJlciwgbWF4OiBudW1iZXIpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4pICsgbWluKTtcbn1cblxuLyoqXG4gKiBBIHNoZWxsIGNvbW1hbmQgdGhhdCBkb2VzIHdoYXQgeW91IHdhbnRcbiAqXG4gKiBJcyBwbGF0Zm9ybS1hd2FyZSwgaGFuZGxlcyBlcnJvcnMgbmljZWx5LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2hlbGxXaXRoQWN0aW9uKFxuICBjb21tYW5kOiBzdHJpbmdbXSwgZmlsdGVyPzogc3RyaW5nLCBhY3Rpb24/OiAoKSA9PiBQcm9taXNlPGFueT4sIG9wdGlvbnM6IFNoZWxsT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxBY3Rpb25PdXRwdXQ+IHtcbiAgaWYgKG9wdGlvbnMubW9kRW52ICYmIG9wdGlvbnMuZW52KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVc2UgZWl0aGVyIGVudiBvciBtb2RFbnYgYnV0IG5vdCBib3RoJyk7XG4gIH1cblxuICBvcHRpb25zLm91dHB1dD8ud3JpdGUoYPCfkrsgJHtjb21tYW5kLmpvaW4oJyAnKX1cXG5gKTtcblxuICBjb25zdCBlbnYgPSBvcHRpb25zLmVudiA/PyAob3B0aW9ucy5tb2RFbnYgPyB7IC4uLnByb2Nlc3MuZW52LCAuLi5vcHRpb25zLm1vZEVudiB9IDogdW5kZWZpbmVkKTtcblxuICBjb25zdCBjaGlsZCA9IGNoaWxkX3Byb2Nlc3Muc3Bhd24oY29tbWFuZFswXSwgY29tbWFuZC5zbGljZSgxKSwge1xuICAgIC4uLm9wdGlvbnMsXG4gICAgZW52LFxuICAgIC8vIE5lZWQgdGhpcyBmb3IgV2luZG93cyB3aGVyZSB3ZSB3YW50IC5jbWQgYW5kIC5iYXQgdG8gYmUgZm91bmQgYXMgd2VsbC5cbiAgICBzaGVsbDogdHJ1ZSxcbiAgICBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdwaXBlJ10sXG4gIH0pO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxBY3Rpb25PdXRwdXQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBvdXQgPSBuZXcgQXJyYXk8QnVmZmVyPigpO1xuICAgIGNvbnN0IHN0ZG91dCA9IG5ldyBBcnJheTxCdWZmZXI+KCk7XG4gICAgY29uc3Qgc3RkZXJyID0gbmV3IEFycmF5PEJ1ZmZlcj4oKTtcbiAgICBsZXQgYWN0aW9uU3VjY2VlZGVkID0gZmFsc2U7XG4gICAgbGV0IGFjdGlvbk91dHB1dDogYW55O1xuICAgIGxldCBhY3Rpb25FeGVjdXRlZCA9IGZhbHNlO1xuXG4gICAgZnVuY3Rpb24gZXhlY3V0ZUFjdGlvbihjaHVuazogYW55KSB7XG4gICAgICBvdXQucHVzaChjaHVuayk7XG4gICAgICBpZiAoIWFjdGlvbkV4ZWN1dGVkICYmIHR5cGVvZiBmaWx0ZXIgPT09ICdzdHJpbmcnICYmIG91dC50b1N0cmluZygpLmluY2x1ZGVzKGZpbHRlcikgJiYgdHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBhY3Rpb25FeGVjdXRlZCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMub3V0cHV0Py53cml0ZSgnYmVmb3JlIGV4ZWN1dGluZyBhY3Rpb24nKTtcbiAgICAgICAgYWN0aW9uKCkudGhlbigob3V0cHV0KSA9PiB7XG4gICAgICAgICAgb3B0aW9ucy5vdXRwdXQ/LndyaXRlKGBhY3Rpb24gb3V0cHV0IGlzICR7b3V0cHV0fWApO1xuICAgICAgICAgIGFjdGlvbk91dHB1dCA9IG91dHB1dDtcbiAgICAgICAgICBhY3Rpb25TdWNjZWVkZWQgPSB0cnVlO1xuICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICBvcHRpb25zLm91dHB1dD8ud3JpdGUoYGFjdGlvbiBlcnJvciBpcyAke2Vycm9yfWApO1xuICAgICAgICAgIGFjdGlvblN1Y2NlZWRlZCA9IGZhbHNlO1xuICAgICAgICAgIGFjdGlvbk91dHB1dCA9IGVycm9yO1xuICAgICAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICBvcHRpb25zLm91dHB1dD8ud3JpdGUoJ3Rlcm1pbmF0ZSBzYW0gc3ViIHByb2Nlc3MnKTtcbiAgICAgICAgICBraWxsU3ViUHJvY2VzcyhjaGlsZCwgY29tbWFuZC5qb2luKCcgJykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjaGlsZC5zdGRvdXQhLm9uKCdkYXRhJywgY2h1bmsgPT4ge1xuICAgICAgb3B0aW9ucy5vdXRwdXQ/LndyaXRlKGNodW5rKTtcbiAgICAgIHN0ZG91dC5wdXNoKGNodW5rKTtcbiAgICAgIGV4ZWN1dGVBY3Rpb24oY2h1bmspO1xuICAgIH0pO1xuXG4gICAgY2hpbGQuc3RkZXJyIS5vbignZGF0YScsIGNodW5rID0+IHtcbiAgICAgIG9wdGlvbnMub3V0cHV0Py53cml0ZShjaHVuayk7XG4gICAgICBpZiAob3B0aW9ucy5jYXB0dXJlU3RkZXJyID8/IHRydWUpIHtcbiAgICAgICAgc3RkZXJyLnB1c2goY2h1bmspO1xuICAgICAgfVxuICAgICAgZXhlY3V0ZUFjdGlvbihjaHVuayk7XG4gICAgfSk7XG5cbiAgICBjaGlsZC5vbmNlKCdlcnJvcicsIHJlamVjdCk7XG5cbiAgICBjaGlsZC5vbmNlKCdjbG9zZScsIGNvZGUgPT4ge1xuICAgICAgY29uc3Qgb3V0cHV0ID0gKEJ1ZmZlci5jb25jYXQoc3Rkb3V0KS50b1N0cmluZygndXRmLTgnKSArIEJ1ZmZlci5jb25jYXQoc3RkZXJyKS50b1N0cmluZygndXRmLTgnKSkudHJpbSgpO1xuICAgICAgaWYgKGNvZGUgPT0gbnVsbCB8fCBjb2RlID09PSAwIHx8IG9wdGlvbnMuYWxsb3dFcnJFeGl0KSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuICAgICAgICByZXN1bHQucHVzaChhY3Rpb25PdXRwdXQpO1xuICAgICAgICByZXN1bHQucHVzaChvdXRwdXQpO1xuICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICBhY3Rpb25TdWNjZWVkZWQ6IGFjdGlvblN1Y2NlZWRlZCxcbiAgICAgICAgICBhY3Rpb25PdXRwdXQ6IGFjdGlvbk91dHB1dCxcbiAgICAgICAgICBzaGVsbE91dHB1dDogb3V0cHV0LFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYCcke2NvbW1hbmQuam9pbignICcpfScgZXhpdGVkIHdpdGggZXJyb3IgY29kZSAke2NvZGV9LiBPdXRwdXQ6IFxcbiR7b3V0cHV0fWApKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICB9KTtcbn1cblxuZnVuY3Rpb24ga2lsbFN1YlByb2Nlc3MoY2hpbGQ6IGNoaWxkX3Byb2Nlc3MuQ2hpbGRQcm9jZXNzLCBjb21tYW5kOiBzdHJpbmcpIHtcbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBzdWIgcHJvY2VzcyBpcyBydW5uaW5nIGluIGNvbnRhaW5lciwgc28gY2hpbGRfcHJvY2Vzcy5zcGF3biB3aWxsXG4gICAqIGNyZWF0ZSBtdWx0aXBsZSBwcm9jZXNzZXMsIGFuZCB0byBraWxsIGFsbCBvZiB0aGVtIHdlIG5lZWQgdG8gcnVuIGRpZmZlcmVudCBsb2dpY1xuICAgKi9cbiAgaWYgKGZzLmV4aXN0c1N5bmMoJy8uZG9ja2VyZW52JykpIHtcbiAgICBjaGlsZF9wcm9jZXNzLmV4ZWMoYGZvciBwaWQgaW4gJChwcyAtZWYgfCBncmVwIFwiJHtjb21tYW5kfVwiIHwgYXdrICd7cHJpbnQgJDJ9Jyk7IGRvIGtpbGwgLTIgJHBpZDsgZG9uZWApO1xuICB9IGVsc2Uge1xuICAgIGNoaWxkLmtpbGwoJ1NJR0lOVCcpO1xuICB9XG5cbn0iXX0=