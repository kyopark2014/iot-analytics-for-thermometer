/// <reference types="node" />
import { AwsClients } from './aws';
import { AwsContext, ShellOptions, TestFixture } from './cdk';
import { TestContext } from './test-helpers';
export interface ActionOutput {
    actionSucceeded?: boolean;
    actionOutput?: any;
    shellOutput?: string;
}
/**
 * Higher order function to execute a block with a SAM Integration CDK app fixture
 */
export declare function withSamIntegrationCdkApp<A extends TestContext & AwsContext>(block: (context: SamIntegrationTestFixture) => Promise<void>): (context: A) => Promise<void>;
/**
 * SAM Integration test fixture for CDK - SAM integration test cases
 */
export declare function withSamIntegrationFixture(block: (context: SamIntegrationTestFixture) => Promise<void>): (context: TestContext) => Promise<void>;
export declare class SamIntegrationTestFixture extends TestFixture {
    readonly integTestDir: string;
    readonly stackNamePrefix: string;
    readonly output: NodeJS.WritableStream;
    readonly aws: AwsClients;
    constructor(integTestDir: string, stackNamePrefix: string, output: NodeJS.WritableStream, aws: AwsClients);
    samShell(command: string[], filter?: string, action?: () => any, options?: Omit<ShellOptions, 'cwd' | 'output'>): Promise<ActionOutput>;
    samBuild(stackName: string): Promise<ActionOutput>;
    samLocalStartApi(stackName: string, isBuilt: boolean, port: number, apiPath: string): Promise<ActionOutput>;
    /**
     * Cleanup leftover stacks and buckets
     */
    dispose(success: boolean): Promise<void>;
}
export declare function randomInteger(min: number, max: number): number;
/**
 * A shell command that does what you want
 *
 * Is platform-aware, handles errors nicely.
 */
export declare function shellWithAction(command: string[], filter?: string, action?: () => Promise<any>, options?: ShellOptions): Promise<ActionOutput>;
