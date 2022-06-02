"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const os = require("os");
const path = require("path");
const fs = require("fs-extra");
const nock = require("nock");
const logging = require("../lib/logging");
const notices_1 = require("../lib/notices");
const version = require("../lib/version");
const BASIC_NOTICE = {
    title: 'Toggling off auto_delete_objects for Bucket empties the bucket',
    issueNumber: 16603,
    overview: 'If a stack is deployed with an S3 bucket with auto_delete_objects=True, and then re-deployed with auto_delete_objects=False, all the objects in the bucket will be deleted.',
    components: [{
            name: 'cli',
            version: '<=1.126.0',
        }],
    schemaVersion: '1',
};
const MULTIPLE_AFFECTED_VERSIONS_NOTICE = {
    title: 'Error when building EKS cluster with monocdk import',
    issueNumber: 17061,
    overview: 'When using monocdk/aws-eks to build a stack containing an EKS cluster, error is thrown about missing lambda-layer-node-proxy-agent/layer/package.json.',
    components: [{
            name: 'cli',
            version: '<1.130.0 >=1.126.0',
        }],
    schemaVersion: '1',
};
const FRAMEWORK_2_1_0_AFFECTED_NOTICE = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: 'framework',
            version: '<= 2.1.0',
        }],
    schemaVersion: '1',
};
const NOTICE_FOR_APIGATEWAYV2 = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: '@aws-cdk/aws-apigatewayv2-alpha.',
            version: '<= 2.13.0-alpha.0',
        }],
    schemaVersion: '1',
};
const NOTICE_FOR_APIGATEWAY = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: '@aws-cdk/aws-apigateway',
            version: '<= 2.13.0-alpha.0',
        }],
    schemaVersion: '1',
};
const NOTICE_FOR_APIGATEWAYV2_CFN_STAGE = {
    title: 'Regression on module foobar',
    issueNumber: 1234,
    overview: 'Some bug description',
    components: [{
            name: 'aws-cdk-lib.aws_apigatewayv2.CfnStage',
            version: '<= 2.13.0-alpha.0',
        }],
    schemaVersion: '1',
};
describe('cli notices', () => {
    beforeAll(() => {
        jest
            .spyOn(version, 'versionNumber')
            .mockImplementation(() => '1.0.0');
    });
    afterAll(() => {
        jest.restoreAllMocks();
    });
    describe(notices_1.formatNotices, () => {
        test('correct format', () => {
            const result = notices_1.formatNotices([BASIC_NOTICE])[0];
            expect(result).toEqual(`16603	Toggling off auto_delete_objects for Bucket empties the bucket

	Overview: If a stack is deployed with an S3 bucket with
	          auto_delete_objects=True, and then re-deployed with
	          auto_delete_objects=False, all the objects in the bucket
	          will be deleted.

	Affected versions: cli: <=1.126.0

	More information at: https://github.com/aws/aws-cdk/issues/16603
`);
        });
        test('multiple affect versions', () => {
            const result = notices_1.formatNotices([MULTIPLE_AFFECTED_VERSIONS_NOTICE])[0];
            expect(result).toEqual(`17061	Error when building EKS cluster with monocdk import

	Overview: When using monocdk/aws-eks to build a stack containing an
	          EKS cluster, error is thrown about missing
	          lambda-layer-node-proxy-agent/layer/package.json.

	Affected versions: cli: <1.130.0 >=1.126.0

	More information at: https://github.com/aws/aws-cdk/issues/17061
`);
        });
    });
    describe(notices_1.filterNotices, () => {
        test('correctly filter notices on cli', () => {
            const notices = [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE];
            expect(notices_1.filterNotices(notices, {
                cliVersion: '1.0.0',
            })).toEqual([BASIC_NOTICE]);
            expect(notices_1.filterNotices(notices, {
                cliVersion: '1.129.0',
            })).toEqual([MULTIPLE_AFFECTED_VERSIONS_NOTICE]);
            expect(notices_1.filterNotices(notices, {
                cliVersion: '1.126.0',
            })).toEqual(notices);
            expect(notices_1.filterNotices(notices, {
                cliVersion: '1.130.0',
            })).toEqual([]);
        });
        test('correctly filter notices on framework', () => {
            const notices = [FRAMEWORK_2_1_0_AFFECTED_NOTICE];
            expect(notices_1.filterNotices(notices, {
                outdir: path.join(__dirname, 'cloud-assembly-trees/built-with-2_12_0'),
            })).toEqual([]);
            expect(notices_1.filterNotices(notices, {
                outdir: path.join(__dirname, 'cloud-assembly-trees/built-with-1_144_0'),
            })).toEqual([FRAMEWORK_2_1_0_AFFECTED_NOTICE]);
        });
        test('correctly filter notices on arbitrary modules', () => {
            const notices = [NOTICE_FOR_APIGATEWAYV2];
            // module-level match
            expect(notices_1.filterNotices(notices, {
                outdir: path.join(__dirname, 'cloud-assembly-trees/experimental-module'),
            })).toEqual([NOTICE_FOR_APIGATEWAYV2]);
            // no apigatewayv2 in the tree
            expect(notices_1.filterNotices(notices, {
                outdir: path.join(__dirname, 'cloud-assembly-trees/built-with-2_12_0'),
            })).toEqual([]);
            // module name mismatch: apigateway != apigatewayv2
            expect(notices_1.filterNotices([NOTICE_FOR_APIGATEWAY], {
                outdir: path.join(__dirname, 'cloud-assembly-trees/experimental-module'),
            })).toEqual([]);
            // construct-level match
            expect(notices_1.filterNotices([NOTICE_FOR_APIGATEWAYV2_CFN_STAGE], {
                outdir: path.join(__dirname, 'cloud-assembly-trees/experimental-module'),
            })).toEqual([NOTICE_FOR_APIGATEWAYV2_CFN_STAGE]);
        });
    });
    describe(notices_1.WebsiteNoticeDataSource, () => {
        const dataSource = new notices_1.WebsiteNoticeDataSource();
        test('returns data when download succeeds', async () => {
            const result = await mockCall(200, {
                notices: [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE],
            });
            expect(result).toEqual([BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE]);
        });
        test('returns appropriate error when the server returns an unexpected status code', async () => {
            const result = mockCall(500, {
                notices: [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE],
            });
            await expect(result).rejects.toThrow(/500/);
        });
        test('returns appropriate error when the server returns an unexpected structure', async () => {
            const result = mockCall(200, {
                foo: [BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE],
            });
            await expect(result).rejects.toThrow(/key is missing/);
        });
        test('returns appropriate error when the server returns invalid json', async () => {
            const result = mockCall(200, '-09aiskjkj838');
            await expect(result).rejects.toThrow(/Failed to parse/);
        });
        test('returns appropriate error when HTTPS call throws', async () => {
            const mockGet = jest.spyOn(https, 'get')
                .mockImplementation(() => { throw new Error('No connection'); });
            const result = dataSource.fetch();
            await expect(result).rejects.toThrow(/No connection/);
            mockGet.mockRestore();
        });
        test('returns appropriate error when the request has an error', async () => {
            nock('https://cli.cdk.dev-tools.aws.dev')
                .get('/notices.json')
                .replyWithError('DNS resolution failed');
            const result = dataSource.fetch();
            await expect(result).rejects.toThrow(/DNS resolution failed/);
        });
        test('returns appropriate error when the connection stays idle for too long', async () => {
            nock('https://cli.cdk.dev-tools.aws.dev')
                .get('/notices.json')
                .delayConnection(3500)
                .reply(200, {
                notices: [BASIC_NOTICE],
            });
            const result = dataSource.fetch();
            await expect(result).rejects.toThrow(/timed out/);
        });
        test('returns empty array when the request takes too long to finish', async () => {
            nock('https://cli.cdk.dev-tools.aws.dev')
                .get('/notices.json')
                .delayBody(3500)
                .reply(200, {
                notices: [BASIC_NOTICE],
            });
            const result = dataSource.fetch();
            await expect(result).rejects.toThrow(/timed out/);
        });
        function mockCall(statusCode, body) {
            nock('https://cli.cdk.dev-tools.aws.dev')
                .get('/notices.json')
                .reply(statusCode, body);
            return dataSource.fetch();
        }
    });
    describe(notices_1.CachedDataSource, () => {
        const fileName = path.join(os.tmpdir(), 'cache.json');
        const cachedData = [BASIC_NOTICE];
        const freshData = [MULTIPLE_AFFECTED_VERSIONS_NOTICE];
        beforeEach(() => {
            fs.writeFileSync(fileName, '');
        });
        test('retrieves data from the delegate cache when the file is empty', async () => {
            const dataSource = dataSourceWithDelegateReturning(freshData);
            const notices = await dataSource.fetch();
            expect(notices).toEqual(freshData);
        });
        test('retrieves data from the file when the data is still valid', async () => {
            fs.writeJsonSync(fileName, {
                notices: cachedData,
                expiration: Date.now() + 10000,
            });
            const dataSource = dataSourceWithDelegateReturning(freshData);
            const notices = await dataSource.fetch();
            expect(notices).toEqual(cachedData);
        });
        test('retrieves data from the delegate when the data is expired', async () => {
            fs.writeJsonSync(fileName, {
                notices: cachedData,
                expiration: 0,
            });
            const dataSource = dataSourceWithDelegateReturning(freshData);
            const notices = await dataSource.fetch();
            expect(notices).toEqual(freshData);
        });
        test('retrieves data from the delegate when the file cannot be read', async () => {
            const debugSpy = jest.spyOn(logging, 'debug');
            if (fs.existsSync('does-not-exist.json')) {
                fs.unlinkSync('does-not-exist.json');
            }
            const dataSource = dataSourceWithDelegateReturning(freshData, 'does-not-exist.json');
            const notices = await dataSource.fetch();
            expect(notices).toEqual(freshData);
            expect(debugSpy).not.toHaveBeenCalled();
            debugSpy.mockRestore();
        });
        test('retrieved data from the delegate when it is configured to ignore the cache', async () => {
            fs.writeJsonSync(fileName, {
                notices: cachedData,
                expiration: Date.now() + 10000,
            });
            const dataSource = dataSourceWithDelegateReturning(freshData, fileName, true);
            const notices = await dataSource.fetch();
            expect(notices).toEqual(freshData);
        });
        test('error in delegate gets turned into empty result by cached source', async () => {
            // GIVEN
            const delegate = {
                fetch: jest.fn().mockRejectedValue(new Error('fetching failed')),
            };
            const dataSource = new notices_1.CachedDataSource(fileName, delegate, true);
            // WHEN
            const notices = await dataSource.fetch();
            // THEN
            expect(notices).toEqual([]);
        });
        function dataSourceWithDelegateReturning(notices, file = fileName, ignoreCache = false) {
            const delegate = {
                fetch: jest.fn(),
            };
            delegate.fetch.mockResolvedValue(notices);
            return new notices_1.CachedDataSource(file, delegate, ignoreCache);
        }
    });
    describe(notices_1.generateMessage, () => {
        test('does not show anything when there are no notices', async () => {
            const dataSource = createDataSource();
            dataSource.fetch.mockResolvedValue([]);
            const result = await notices_1.generateMessage(dataSource, {
                acknowledgedIssueNumbers: [],
                outdir: '/tmp',
            });
            expect(result).toEqual('');
        });
        test('shows notices that pass the filter', async () => {
            const dataSource = createDataSource();
            dataSource.fetch.mockResolvedValue([BASIC_NOTICE, MULTIPLE_AFFECTED_VERSIONS_NOTICE]);
            const result = await notices_1.generateMessage(dataSource, {
                acknowledgedIssueNumbers: [17061],
                outdir: '/tmp',
            });
            expect(result).toEqual(`
NOTICES

16603	Toggling off auto_delete_objects for Bucket empties the bucket

	Overview: If a stack is deployed with an S3 bucket with
	          auto_delete_objects=True, and then re-deployed with
	          auto_delete_objects=False, all the objects in the bucket
	          will be deleted.

	Affected versions: cli: <=1.126.0

	More information at: https://github.com/aws/aws-cdk/issues/16603


If you don’t want to see a notice anymore, use "cdk acknowledge <id>". For example, "cdk acknowledge 16603".`);
        });
        function createDataSource() {
            return {
                fetch: jest.fn(),
            };
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibm90aWNlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6Qiw2QkFBNkI7QUFDN0IsK0JBQStCO0FBQy9CLDZCQUE2QjtBQUM3QiwwQ0FBMEM7QUFDMUMsNENBT3dCO0FBQ3hCLDBDQUEwQztBQUUxQyxNQUFNLFlBQVksR0FBRztJQUNuQixLQUFLLEVBQUUsZ0VBQWdFO0lBQ3ZFLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLFFBQVEsRUFBRSw2S0FBNks7SUFDdkwsVUFBVSxFQUFFLENBQUM7WUFDWCxJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxXQUFXO1NBQ3JCLENBQUM7SUFDRixhQUFhLEVBQUUsR0FBRztDQUNuQixDQUFDO0FBRUYsTUFBTSxpQ0FBaUMsR0FBRztJQUN4QyxLQUFLLEVBQUUscURBQXFEO0lBQzVELFdBQVcsRUFBRSxLQUFLO0lBQ2xCLFFBQVEsRUFBRSx3SkFBd0o7SUFDbEssVUFBVSxFQUFFLENBQUM7WUFDWCxJQUFJLEVBQUUsS0FBSztZQUNYLE9BQU8sRUFBRSxvQkFBb0I7U0FDOUIsQ0FBQztJQUNGLGFBQWEsRUFBRSxHQUFHO0NBQ25CLENBQUM7QUFFRixNQUFNLCtCQUErQixHQUFHO0lBQ3RDLEtBQUssRUFBRSw2QkFBNkI7SUFDcEMsV0FBVyxFQUFFLElBQUk7SUFDakIsUUFBUSxFQUFFLHNCQUFzQjtJQUNoQyxVQUFVLEVBQUUsQ0FBQztZQUNYLElBQUksRUFBRSxXQUFXO1lBQ2pCLE9BQU8sRUFBRSxVQUFVO1NBQ3BCLENBQUM7SUFDRixhQUFhLEVBQUUsR0FBRztDQUNuQixDQUFDO0FBRUYsTUFBTSx1QkFBdUIsR0FBRztJQUM5QixLQUFLLEVBQUUsNkJBQTZCO0lBQ3BDLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLFFBQVEsRUFBRSxzQkFBc0I7SUFDaEMsVUFBVSxFQUFFLENBQUM7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bSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIG5vY2sgZnJvbSAnbm9jayc7XG5pbXBvcnQgKiBhcyBsb2dnaW5nIGZyb20gJy4uL2xpYi9sb2dnaW5nJztcbmltcG9ydCB7XG4gIENhY2hlZERhdGFTb3VyY2UsXG4gIGZpbHRlck5vdGljZXMsXG4gIGZvcm1hdE5vdGljZXMsXG4gIGdlbmVyYXRlTWVzc2FnZSxcbiAgTm90aWNlLFxuICBXZWJzaXRlTm90aWNlRGF0YVNvdXJjZSxcbn0gZnJvbSAnLi4vbGliL25vdGljZXMnO1xuaW1wb3J0ICogYXMgdmVyc2lvbiBmcm9tICcuLi9saWIvdmVyc2lvbic7XG5cbmNvbnN0IEJBU0lDX05PVElDRSA9IHtcbiAgdGl0bGU6ICdUb2dnbGluZyBvZmYgYXV0b19kZWxldGVfb2JqZWN0cyBmb3IgQnVja2V0IGVtcHRpZXMgdGhlIGJ1Y2tldCcsXG4gIGlzc3VlTnVtYmVyOiAxNjYwMyxcbiAgb3ZlcnZpZXc6ICdJZiBhIHN0YWNrIGlzIGRlcGxveWVkIHdpdGggYW4gUzMgYnVja2V0IHdpdGggYXV0b19kZWxldGVfb2JqZWN0cz1UcnVlLCBhbmQgdGhlbiByZS1kZXBsb3llZCB3aXRoIGF1dG9fZGVsZXRlX29iamVjdHM9RmFsc2UsIGFsbCB0aGUgb2JqZWN0cyBpbiB0aGUgYnVja2V0IHdpbGwgYmUgZGVsZXRlZC4nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdjbGknLFxuICAgIHZlcnNpb246ICc8PTEuMTI2LjAnLFxuICB9XSxcbiAgc2NoZW1hVmVyc2lvbjogJzEnLFxufTtcblxuY29uc3QgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFID0ge1xuICB0aXRsZTogJ0Vycm9yIHdoZW4gYnVpbGRpbmcgRUtTIGNsdXN0ZXIgd2l0aCBtb25vY2RrIGltcG9ydCcsXG4gIGlzc3VlTnVtYmVyOiAxNzA2MSxcbiAgb3ZlcnZpZXc6ICdXaGVuIHVzaW5nIG1vbm9jZGsvYXdzLWVrcyB0byBidWlsZCBhIHN0YWNrIGNvbnRhaW5pbmcgYW4gRUtTIGNsdXN0ZXIsIGVycm9yIGlzIHRocm93biBhYm91dCBtaXNzaW5nIGxhbWJkYS1sYXllci1ub2RlLXByb3h5LWFnZW50L2xheWVyL3BhY2thZ2UuanNvbi4nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdjbGknLFxuICAgIHZlcnNpb246ICc8MS4xMzAuMCA+PTEuMTI2LjAnLFxuICB9XSxcbiAgc2NoZW1hVmVyc2lvbjogJzEnLFxufTtcblxuY29uc3QgRlJBTUVXT1JLXzJfMV8wX0FGRkVDVEVEX05PVElDRSA9IHtcbiAgdGl0bGU6ICdSZWdyZXNzaW9uIG9uIG1vZHVsZSBmb29iYXInLFxuICBpc3N1ZU51bWJlcjogMTIzNCxcbiAgb3ZlcnZpZXc6ICdTb21lIGJ1ZyBkZXNjcmlwdGlvbicsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2ZyYW1ld29yaycsXG4gICAgdmVyc2lvbjogJzw9IDIuMS4wJyxcbiAgfV0sXG4gIHNjaGVtYVZlcnNpb246ICcxJyxcbn07XG5cbmNvbnN0IE5PVElDRV9GT1JfQVBJR0FURVdBWVYyID0ge1xuICB0aXRsZTogJ1JlZ3Jlc3Npb24gb24gbW9kdWxlIGZvb2JhcicsXG4gIGlzc3VlTnVtYmVyOiAxMjM0LFxuICBvdmVydmlldzogJ1NvbWUgYnVnIGRlc2NyaXB0aW9uJyxcbiAgY29tcG9uZW50czogW3tcbiAgICBuYW1lOiAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXl2Mi1hbHBoYS4nLFxuICAgIHZlcnNpb246ICc8PSAyLjEzLjAtYWxwaGEuMCcsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG59O1xuXG5jb25zdCBOT1RJQ0VfRk9SX0FQSUdBVEVXQVkgPSB7XG4gIHRpdGxlOiAnUmVncmVzc2lvbiBvbiBtb2R1bGUgZm9vYmFyJyxcbiAgaXNzdWVOdW1iZXI6IDEyMzQsXG4gIG92ZXJ2aWV3OiAnU29tZSBidWcgZGVzY3JpcHRpb24nLFxuICBjb21wb25lbnRzOiBbe1xuICAgIG5hbWU6ICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheScsXG4gICAgdmVyc2lvbjogJzw9IDIuMTMuMC1hbHBoYS4wJyxcbiAgfV0sXG4gIHNjaGVtYVZlcnNpb246ICcxJyxcbn07XG5cbmNvbnN0IE5PVElDRV9GT1JfQVBJR0FURVdBWVYyX0NGTl9TVEFHRSA9IHtcbiAgdGl0bGU6ICdSZWdyZXNzaW9uIG9uIG1vZHVsZSBmb29iYXInLFxuICBpc3N1ZU51bWJlcjogMTIzNCxcbiAgb3ZlcnZpZXc6ICdTb21lIGJ1ZyBkZXNjcmlwdGlvbicsXG4gIGNvbXBvbmVudHM6IFt7XG4gICAgbmFtZTogJ2F3cy1jZGstbGliLmF3c19hcGlnYXRld2F5djIuQ2ZuU3RhZ2UnLFxuICAgIHZlcnNpb246ICc8PSAyLjEzLjAtYWxwaGEuMCcsXG4gIH1dLFxuICBzY2hlbWFWZXJzaW9uOiAnMScsXG59O1xuXG5kZXNjcmliZSgnY2xpIG5vdGljZXMnLCAoKSA9PiB7XG4gIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgamVzdFxuICAgICAgLnNweU9uKHZlcnNpb24sICd2ZXJzaW9uTnVtYmVyJylcbiAgICAgIC5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gJzEuMC4wJyk7XG4gIH0pO1xuXG4gIGFmdGVyQWxsKCgpID0+IHtcbiAgICBqZXN0LnJlc3RvcmVBbGxNb2NrcygpO1xuICB9KTtcblxuICBkZXNjcmliZShmb3JtYXROb3RpY2VzLCAoKSA9PiB7XG4gICAgdGVzdCgnY29ycmVjdCBmb3JtYXQnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBmb3JtYXROb3RpY2VzKFtCQVNJQ19OT1RJQ0VdKVswXTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoYDE2NjAzXHRUb2dnbGluZyBvZmYgYXV0b19kZWxldGVfb2JqZWN0cyBmb3IgQnVja2V0IGVtcHRpZXMgdGhlIGJ1Y2tldFxuXG5cdE92ZXJ2aWV3OiBJZiBhIHN0YWNrIGlzIGRlcGxveWVkIHdpdGggYW4gUzMgYnVja2V0IHdpdGhcblx0ICAgICAgICAgIGF1dG9fZGVsZXRlX29iamVjdHM9VHJ1ZSwgYW5kIHRoZW4gcmUtZGVwbG95ZWQgd2l0aFxuXHQgICAgICAgICAgYXV0b19kZWxldGVfb2JqZWN0cz1GYWxzZSwgYWxsIHRoZSBvYmplY3RzIGluIHRoZSBidWNrZXRcblx0ICAgICAgICAgIHdpbGwgYmUgZGVsZXRlZC5cblxuXHRBZmZlY3RlZCB2ZXJzaW9uczogY2xpOiA8PTEuMTI2LjBcblxuXHRNb3JlIGluZm9ybWF0aW9uIGF0OiBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzLzE2NjAzXG5gKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ211bHRpcGxlIGFmZmVjdCB2ZXJzaW9ucycsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGZvcm1hdE5vdGljZXMoW01VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV0pWzBdO1xuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChgMTcwNjFcdEVycm9yIHdoZW4gYnVpbGRpbmcgRUtTIGNsdXN0ZXIgd2l0aCBtb25vY2RrIGltcG9ydFxuXG5cdE92ZXJ2aWV3OiBXaGVuIHVzaW5nIG1vbm9jZGsvYXdzLWVrcyB0byBidWlsZCBhIHN0YWNrIGNvbnRhaW5pbmcgYW5cblx0ICAgICAgICAgIEVLUyBjbHVzdGVyLCBlcnJvciBpcyB0aHJvd24gYWJvdXQgbWlzc2luZ1xuXHQgICAgICAgICAgbGFtYmRhLWxheWVyLW5vZGUtcHJveHktYWdlbnQvbGF5ZXIvcGFja2FnZS5qc29uLlxuXG5cdEFmZmVjdGVkIHZlcnNpb25zOiBjbGk6IDwxLjEzMC4wID49MS4xMjYuMFxuXG5cdE1vcmUgaW5mb3JtYXRpb24gYXQ6IGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMTcwNjFcbmApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZShmaWx0ZXJOb3RpY2VzLCAoKSA9PiB7XG4gICAgdGVzdCgnY29ycmVjdGx5IGZpbHRlciBub3RpY2VzIG9uIGNsaScsICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBbQkFTSUNfTk9USUNFLCBNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdO1xuICAgICAgZXhwZWN0KGZpbHRlck5vdGljZXMobm90aWNlcywge1xuICAgICAgICBjbGlWZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgfSkpLnRvRXF1YWwoW0JBU0lDX05PVElDRV0pO1xuXG4gICAgICBleHBlY3QoZmlsdGVyTm90aWNlcyhub3RpY2VzLCB7XG4gICAgICAgIGNsaVZlcnNpb246ICcxLjEyOS4wJyxcbiAgICAgIH0pKS50b0VxdWFsKFtNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdKTtcblxuICAgICAgZXhwZWN0KGZpbHRlck5vdGljZXMobm90aWNlcywge1xuICAgICAgICBjbGlWZXJzaW9uOiAnMS4xMjYuMCcsXG4gICAgICB9KSkudG9FcXVhbChub3RpY2VzKTtcblxuICAgICAgZXhwZWN0KGZpbHRlck5vdGljZXMobm90aWNlcywge1xuICAgICAgICBjbGlWZXJzaW9uOiAnMS4xMzAuMCcsXG4gICAgICB9KSkudG9FcXVhbChbXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdjb3JyZWN0bHkgZmlsdGVyIG5vdGljZXMgb24gZnJhbWV3b3JrJywgKCkgPT4ge1xuICAgICAgY29uc3Qgbm90aWNlcyA9IFtGUkFNRVdPUktfMl8xXzBfQUZGRUNURURfTk9USUNFXTtcblxuICAgICAgZXhwZWN0KGZpbHRlck5vdGljZXMobm90aWNlcywge1xuICAgICAgICBvdXRkaXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcy9idWlsdC13aXRoLTJfMTJfMCcpLFxuICAgICAgfSkpLnRvRXF1YWwoW10pO1xuXG4gICAgICBleHBlY3QoZmlsdGVyTm90aWNlcyhub3RpY2VzLCB7XG4gICAgICAgIG91dGRpcjogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2Nsb3VkLWFzc2VtYmx5LXRyZWVzL2J1aWx0LXdpdGgtMV8xNDRfMCcpLFxuICAgICAgfSkpLnRvRXF1YWwoW0ZSQU1FV09SS18yXzFfMF9BRkZFQ1RFRF9OT1RJQ0VdKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ2NvcnJlY3RseSBmaWx0ZXIgbm90aWNlcyBvbiBhcmJpdHJhcnkgbW9kdWxlcycsICgpID0+IHtcbiAgICAgIGNvbnN0IG5vdGljZXMgPSBbTk9USUNFX0ZPUl9BUElHQVRFV0FZVjJdO1xuXG4gICAgICAvLyBtb2R1bGUtbGV2ZWwgbWF0Y2hcbiAgICAgIGV4cGVjdChmaWx0ZXJOb3RpY2VzKG5vdGljZXMsIHtcbiAgICAgICAgb3V0ZGlyOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2xvdWQtYXNzZW1ibHktdHJlZXMvZXhwZXJpbWVudGFsLW1vZHVsZScpLFxuICAgICAgfSkpLnRvRXF1YWwoW05PVElDRV9GT1JfQVBJR0FURVdBWVYyXSk7XG5cbiAgICAgIC8vIG5vIGFwaWdhdGV3YXl2MiBpbiB0aGUgdHJlZVxuICAgICAgZXhwZWN0KGZpbHRlck5vdGljZXMobm90aWNlcywge1xuICAgICAgICBvdXRkaXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcy9idWlsdC13aXRoLTJfMTJfMCcpLFxuICAgICAgfSkpLnRvRXF1YWwoW10pO1xuXG4gICAgICAvLyBtb2R1bGUgbmFtZSBtaXNtYXRjaDogYXBpZ2F0ZXdheSAhPSBhcGlnYXRld2F5djJcbiAgICAgIGV4cGVjdChmaWx0ZXJOb3RpY2VzKFtOT1RJQ0VfRk9SX0FQSUdBVEVXQVldLCB7XG4gICAgICAgIG91dGRpcjogcGF0aC5qb2luKF9fZGlybmFtZSwgJ2Nsb3VkLWFzc2VtYmx5LXRyZWVzL2V4cGVyaW1lbnRhbC1tb2R1bGUnKSxcbiAgICAgIH0pKS50b0VxdWFsKFtdKTtcblxuICAgICAgLy8gY29uc3RydWN0LWxldmVsIG1hdGNoXG4gICAgICBleHBlY3QoZmlsdGVyTm90aWNlcyhbTk9USUNFX0ZPUl9BUElHQVRFV0FZVjJfQ0ZOX1NUQUdFXSwge1xuICAgICAgICBvdXRkaXI6IHBhdGguam9pbihfX2Rpcm5hbWUsICdjbG91ZC1hc3NlbWJseS10cmVlcy9leHBlcmltZW50YWwtbW9kdWxlJyksXG4gICAgICB9KSkudG9FcXVhbChbTk9USUNFX0ZPUl9BUElHQVRFV0FZVjJfQ0ZOX1NUQUdFXSk7XG4gICAgfSk7XG5cbiAgfSk7XG5cbiAgZGVzY3JpYmUoV2Vic2l0ZU5vdGljZURhdGFTb3VyY2UsICgpID0+IHtcbiAgICBjb25zdCBkYXRhU291cmNlID0gbmV3IFdlYnNpdGVOb3RpY2VEYXRhU291cmNlKCk7XG5cbiAgICB0ZXN0KCdyZXR1cm5zIGRhdGEgd2hlbiBkb3dubG9hZCBzdWNjZWVkcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1vY2tDYWxsKDIwMCwge1xuICAgICAgICBub3RpY2VzOiBbQkFTSUNfTk9USUNFLCBNVUxUSVBMRV9BRkZFQ1RFRF9WRVJTSU9OU19OT1RJQ0VdLFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoW0JBU0lDX05PVElDRSwgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdyZXR1cm5zIGFwcHJvcHJpYXRlIGVycm9yIHdoZW4gdGhlIHNlcnZlciByZXR1cm5zIGFuIHVuZXhwZWN0ZWQgc3RhdHVzIGNvZGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBtb2NrQ2FsbCg1MDAsIHtcbiAgICAgICAgbm90aWNlczogW0JBU0lDX05PVElDRSwgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSxcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QocmVzdWx0KS5yZWplY3RzLnRvVGhyb3coLzUwMC8pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0dXJucyBhcHByb3ByaWF0ZSBlcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmV0dXJucyBhbiB1bmV4cGVjdGVkIHN0cnVjdHVyZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG1vY2tDYWxsKDIwMCwge1xuICAgICAgICBmb286IFtCQVNJQ19OT1RJQ0UsIE1VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV0sXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHJlc3VsdCkucmVqZWN0cy50b1Rocm93KC9rZXkgaXMgbWlzc2luZy8pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0dXJucyBhcHByb3ByaWF0ZSBlcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmV0dXJucyBpbnZhbGlkIGpzb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBtb2NrQ2FsbCgyMDAsICctMDlhaXNramtqODM4Jyk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChyZXN1bHQpLnJlamVjdHMudG9UaHJvdygvRmFpbGVkIHRvIHBhcnNlLyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdyZXR1cm5zIGFwcHJvcHJpYXRlIGVycm9yIHdoZW4gSFRUUFMgY2FsbCB0aHJvd3MnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrR2V0ID0gamVzdC5zcHlPbihodHRwcywgJ2dldCcpXG4gICAgICAgIC5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4geyB0aHJvdyBuZXcgRXJyb3IoJ05vIGNvbm5lY3Rpb24nKTsgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHJlc3VsdCkucmVqZWN0cy50b1Rocm93KC9ObyBjb25uZWN0aW9uLyk7XG5cbiAgICAgIG1vY2tHZXQubW9ja1Jlc3RvcmUoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3JldHVybnMgYXBwcm9wcmlhdGUgZXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBoYXMgYW4gZXJyb3InLCBhc3luYyAoKSA9PiB7XG4gICAgICBub2NrKCdodHRwczovL2NsaS5jZGsuZGV2LXRvb2xzLmF3cy5kZXYnKVxuICAgICAgICAuZ2V0KCcvbm90aWNlcy5qc29uJylcbiAgICAgICAgLnJlcGx5V2l0aEVycm9yKCdETlMgcmVzb2x1dGlvbiBmYWlsZWQnKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgICBhd2FpdCBleHBlY3QocmVzdWx0KS5yZWplY3RzLnRvVGhyb3coL0ROUyByZXNvbHV0aW9uIGZhaWxlZC8pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0dXJucyBhcHByb3ByaWF0ZSBlcnJvciB3aGVuIHRoZSBjb25uZWN0aW9uIHN0YXlzIGlkbGUgZm9yIHRvbyBsb25nJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbm9jaygnaHR0cHM6Ly9jbGkuY2RrLmRldi10b29scy5hd3MuZGV2JylcbiAgICAgICAgLmdldCgnL25vdGljZXMuanNvbicpXG4gICAgICAgIC5kZWxheUNvbm5lY3Rpb24oMzUwMClcbiAgICAgICAgLnJlcGx5KDIwMCwge1xuICAgICAgICAgIG5vdGljZXM6IFtCQVNJQ19OT1RJQ0VdLFxuICAgICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgICBhd2FpdCBleHBlY3QocmVzdWx0KS5yZWplY3RzLnRvVGhyb3coL3RpbWVkIG91dC8pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0dXJucyBlbXB0eSBhcnJheSB3aGVuIHRoZSByZXF1ZXN0IHRha2VzIHRvbyBsb25nIHRvIGZpbmlzaCcsIGFzeW5jICgpID0+IHtcbiAgICAgIG5vY2soJ2h0dHBzOi8vY2xpLmNkay5kZXYtdG9vbHMuYXdzLmRldicpXG4gICAgICAgIC5nZXQoJy9ub3RpY2VzLmpzb24nKVxuICAgICAgICAuZGVsYXlCb2R5KDM1MDApXG4gICAgICAgIC5yZXBseSgyMDAsIHtcbiAgICAgICAgICBub3RpY2VzOiBbQkFTSUNfTk9USUNFXSxcbiAgICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHJlc3VsdCkucmVqZWN0cy50b1Rocm93KC90aW1lZCBvdXQvKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIG1vY2tDYWxsKHN0YXR1c0NvZGU6IG51bWJlciwgYm9keTogYW55KTogUHJvbWlzZTxOb3RpY2VbXT4ge1xuICAgICAgbm9jaygnaHR0cHM6Ly9jbGkuY2RrLmRldi10b29scy5hd3MuZGV2JylcbiAgICAgICAgLmdldCgnL25vdGljZXMuanNvbicpXG4gICAgICAgIC5yZXBseShzdGF0dXNDb2RlLCBib2R5KTtcblxuICAgICAgcmV0dXJuIGRhdGFTb3VyY2UuZmV0Y2goKTtcbiAgICB9XG4gIH0pO1xuXG4gIGRlc2NyaWJlKENhY2hlZERhdGFTb3VyY2UsICgpID0+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguam9pbihvcy50bXBkaXIoKSwgJ2NhY2hlLmpzb24nKTtcbiAgICBjb25zdCBjYWNoZWREYXRhID0gW0JBU0lDX05PVElDRV07XG4gICAgY29uc3QgZnJlc2hEYXRhID0gW01VTFRJUExFX0FGRkVDVEVEX1ZFUlNJT05TX05PVElDRV07XG5cbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZU5hbWUsICcnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3JldHJpZXZlcyBkYXRhIGZyb20gdGhlIGRlbGVnYXRlIGNhY2hlIHdoZW4gdGhlIGZpbGUgaXMgZW1wdHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBkYXRhU291cmNlID0gZGF0YVNvdXJjZVdpdGhEZWxlZ2F0ZVJldHVybmluZyhmcmVzaERhdGEpO1xuXG4gICAgICBjb25zdCBub3RpY2VzID0gYXdhaXQgZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgICBleHBlY3Qobm90aWNlcykudG9FcXVhbChmcmVzaERhdGEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0cmlldmVzIGRhdGEgZnJvbSB0aGUgZmlsZSB3aGVuIHRoZSBkYXRhIGlzIHN0aWxsIHZhbGlkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZnMud3JpdGVKc29uU3luYyhmaWxlTmFtZSwge1xuICAgICAgICBub3RpY2VzOiBjYWNoZWREYXRhLFxuICAgICAgICBleHBpcmF0aW9uOiBEYXRlLm5vdygpICsgMTAwMDAsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBkYXRhU291cmNlV2l0aERlbGVnYXRlUmV0dXJuaW5nKGZyZXNoRGF0YSk7XG5cbiAgICAgIGNvbnN0IG5vdGljZXMgPSBhd2FpdCBkYXRhU291cmNlLmZldGNoKCk7XG5cbiAgICAgIGV4cGVjdChub3RpY2VzKS50b0VxdWFsKGNhY2hlZERhdGEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0cmlldmVzIGRhdGEgZnJvbSB0aGUgZGVsZWdhdGUgd2hlbiB0aGUgZGF0YSBpcyBleHBpcmVkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZnMud3JpdGVKc29uU3luYyhmaWxlTmFtZSwge1xuICAgICAgICBub3RpY2VzOiBjYWNoZWREYXRhLFxuICAgICAgICBleHBpcmF0aW9uOiAwLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBkYXRhU291cmNlID0gZGF0YVNvdXJjZVdpdGhEZWxlZ2F0ZVJldHVybmluZyhmcmVzaERhdGEpO1xuXG4gICAgICBjb25zdCBub3RpY2VzID0gYXdhaXQgZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgICBleHBlY3Qobm90aWNlcykudG9FcXVhbChmcmVzaERhdGEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgncmV0cmlldmVzIGRhdGEgZnJvbSB0aGUgZGVsZWdhdGUgd2hlbiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGRlYnVnU3B5ID0gamVzdC5zcHlPbihsb2dnaW5nLCAnZGVidWcnKTtcblxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoJ2RvZXMtbm90LWV4aXN0Lmpzb24nKSkge1xuICAgICAgICBmcy51bmxpbmtTeW5jKCdkb2VzLW5vdC1leGlzdC5qc29uJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBkYXRhU291cmNlV2l0aERlbGVnYXRlUmV0dXJuaW5nKGZyZXNoRGF0YSwgJ2RvZXMtbm90LWV4aXN0Lmpzb24nKTtcblxuICAgICAgY29uc3Qgbm90aWNlcyA9IGF3YWl0IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgICAgZXhwZWN0KG5vdGljZXMpLnRvRXF1YWwoZnJlc2hEYXRhKTtcbiAgICAgIGV4cGVjdChkZWJ1Z1NweSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcblxuICAgICAgZGVidWdTcHkubW9ja1Jlc3RvcmUoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3JldHJpZXZlZCBkYXRhIGZyb20gdGhlIGRlbGVnYXRlIHdoZW4gaXQgaXMgY29uZmlndXJlZCB0byBpZ25vcmUgdGhlIGNhY2hlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZnMud3JpdGVKc29uU3luYyhmaWxlTmFtZSwge1xuICAgICAgICBub3RpY2VzOiBjYWNoZWREYXRhLFxuICAgICAgICBleHBpcmF0aW9uOiBEYXRlLm5vdygpICsgMTAwMDAsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBkYXRhU291cmNlV2l0aERlbGVnYXRlUmV0dXJuaW5nKGZyZXNoRGF0YSwgZmlsZU5hbWUsIHRydWUpO1xuXG4gICAgICBjb25zdCBub3RpY2VzID0gYXdhaXQgZGF0YVNvdXJjZS5mZXRjaCgpO1xuXG4gICAgICBleHBlY3Qobm90aWNlcykudG9FcXVhbChmcmVzaERhdGEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnZXJyb3IgaW4gZGVsZWdhdGUgZ2V0cyB0dXJuZWQgaW50byBlbXB0eSByZXN1bHQgYnkgY2FjaGVkIHNvdXJjZScsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIEdJVkVOXG4gICAgICBjb25zdCBkZWxlZ2F0ZSA9IHtcbiAgICAgICAgZmV0Y2g6IGplc3QuZm4oKS5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ2ZldGNoaW5nIGZhaWxlZCcpKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBkYXRhU291cmNlID0gbmV3IENhY2hlZERhdGFTb3VyY2UoZmlsZU5hbWUsIGRlbGVnYXRlLCB0cnVlKTtcblxuICAgICAgLy8gV0hFTlxuICAgICAgY29uc3Qgbm90aWNlcyA9IGF3YWl0IGRhdGFTb3VyY2UuZmV0Y2goKTtcblxuICAgICAgLy8gVEhFTlxuICAgICAgZXhwZWN0KG5vdGljZXMpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gZGF0YVNvdXJjZVdpdGhEZWxlZ2F0ZVJldHVybmluZyhub3RpY2VzOiBOb3RpY2VbXSwgZmlsZTogc3RyaW5nID0gZmlsZU5hbWUsIGlnbm9yZUNhY2hlOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgIGNvbnN0IGRlbGVnYXRlID0ge1xuICAgICAgICBmZXRjaDogamVzdC5mbigpLFxuICAgICAgfTtcblxuICAgICAgZGVsZWdhdGUuZmV0Y2gubW9ja1Jlc29sdmVkVmFsdWUobm90aWNlcyk7XG4gICAgICByZXR1cm4gbmV3IENhY2hlZERhdGFTb3VyY2UoZmlsZSwgZGVsZWdhdGUsIGlnbm9yZUNhY2hlKTtcbiAgICB9XG4gIH0pO1xuXG4gIGRlc2NyaWJlKGdlbmVyYXRlTWVzc2FnZSwgKCkgPT4ge1xuICAgIHRlc3QoJ2RvZXMgbm90IHNob3cgYW55dGhpbmcgd2hlbiB0aGVyZSBhcmUgbm8gbm90aWNlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGRhdGFTb3VyY2UgPSBjcmVhdGVEYXRhU291cmNlKCk7XG4gICAgICBkYXRhU291cmNlLmZldGNoLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGVNZXNzYWdlKGRhdGFTb3VyY2UsIHtcbiAgICAgICAgYWNrbm93bGVkZ2VkSXNzdWVOdW1iZXJzOiBbXSxcbiAgICAgICAgb3V0ZGlyOiAnL3RtcCcsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCgnJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG93cyBub3RpY2VzIHRoYXQgcGFzcyB0aGUgZmlsdGVyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZGF0YVNvdXJjZSA9IGNyZWF0ZURhdGFTb3VyY2UoKTtcbiAgICAgIGRhdGFTb3VyY2UuZmV0Y2gubW9ja1Jlc29sdmVkVmFsdWUoW0JBU0lDX05PVElDRSwgTVVMVElQTEVfQUZGRUNURURfVkVSU0lPTlNfTk9USUNFXSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdlbmVyYXRlTWVzc2FnZShkYXRhU291cmNlLCB7XG4gICAgICAgIGFja25vd2xlZGdlZElzc3VlTnVtYmVyczogWzE3MDYxXSxcbiAgICAgICAgb3V0ZGlyOiAnL3RtcCcsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChgXG5OT1RJQ0VTXG5cbjE2NjAzXHRUb2dnbGluZyBvZmYgYXV0b19kZWxldGVfb2JqZWN0cyBmb3IgQnVja2V0IGVtcHRpZXMgdGhlIGJ1Y2tldFxuXG5cdE92ZXJ2aWV3OiBJZiBhIHN0YWNrIGlzIGRlcGxveWVkIHdpdGggYW4gUzMgYnVja2V0IHdpdGhcblx0ICAgICAgICAgIGF1dG9fZGVsZXRlX29iamVjdHM9VHJ1ZSwgYW5kIHRoZW4gcmUtZGVwbG95ZWQgd2l0aFxuXHQgICAgICAgICAgYXV0b19kZWxldGVfb2JqZWN0cz1GYWxzZSwgYWxsIHRoZSBvYmplY3RzIGluIHRoZSBidWNrZXRcblx0ICAgICAgICAgIHdpbGwgYmUgZGVsZXRlZC5cblxuXHRBZmZlY3RlZCB2ZXJzaW9uczogY2xpOiA8PTEuMTI2LjBcblxuXHRNb3JlIGluZm9ybWF0aW9uIGF0OiBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzLzE2NjAzXG5cblxuSWYgeW91IGRvbuKAmXQgd2FudCB0byBzZWUgYSBub3RpY2UgYW55bW9yZSwgdXNlIFwiY2RrIGFja25vd2xlZGdlIDxpZD5cIi4gRm9yIGV4YW1wbGUsIFwiY2RrIGFja25vd2xlZGdlIDE2NjAzXCIuYCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVEYXRhU291cmNlKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmV0Y2g6IGplc3QuZm4oKSxcbiAgICAgIH07XG4gICAgfVxuICB9KTtcbn0pO1xuIl19