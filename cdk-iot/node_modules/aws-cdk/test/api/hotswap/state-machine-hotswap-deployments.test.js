"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setup = require("./hotswap-test-setup");
let mockUpdateMachineDefinition;
let hotswapMockSdkProvider;
beforeEach(() => {
    hotswapMockSdkProvider = setup.setupHotswapTests();
    mockUpdateMachineDefinition = jest.fn();
    hotswapMockSdkProvider.setUpdateStateMachineMock(mockUpdateMachineDefinition);
});
test('returns undefined when a new StateMachine is added to the Stack', async () => {
    // GIVEN
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                },
            },
        },
    });
    // WHEN
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).toBeUndefined();
});
test('calls the updateStateMachine() API when it receives only a definitionString change without Fn::Join in a state machine', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: '{ Prop: "old-value" }',
                    StateMachineName: 'my-machine',
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: '{ Prop: "new-value" }',
                        StateMachineName: 'my-machine',
                    },
                },
            },
        },
    });
    // WHEN
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        definition: '{ Prop: "new-value" }',
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:my-machine',
    });
});
test('calls the updateStateMachine() API when it receives only a definitionString change with Fn::Join in a state machine', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: {
                        'Fn::Join': [
                            '\n',
                            [
                                '{',
                                '  "StartAt" : "SuccessState"',
                                '  "States" : {',
                                '    "SuccessState": {',
                                '      "Type": "Pass"',
                                '      "Result": "Success"',
                                '      "End": true',
                                '    }',
                                '  }',
                                '}',
                            ],
                        ],
                    },
                    StateMachineName: 'my-machine',
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: {
                            'Fn::Join': [
                                '\n',
                                [
                                    '{',
                                    '  "StartAt": "SuccessState",',
                                    '  "States": {',
                                    '    "SuccessState": {',
                                    '      "Type": "Succeed"',
                                    '    }',
                                    '  }',
                                    '}',
                                ],
                            ],
                        },
                        StateMachineName: 'my-machine',
                    },
                },
            },
        },
    });
    // WHEN
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        definition: JSON.stringify({
            StartAt: 'SuccessState',
            States: {
                SuccessState: {
                    Type: 'Succeed',
                },
            },
        }, null, 2),
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:my-machine',
    });
});
test('calls the updateStateMachine() API when it receives a change to the definitionString in a state machine that has no name', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: '{ "Prop" : "old-value" }',
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: '{ "Prop" : "new-value" }',
                    },
                },
            },
        },
    });
    // WHEN
    setup.pushStackResourceSummaries(setup.stackSummaryOf('Machine', 'AWS::StepFunctions::StateMachine', 'arn:aws:states:here:123456789012:stateMachine:my-machine'));
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        definition: '{ "Prop" : "new-value" }',
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:my-machine',
    });
});
test('does not call the updateStateMachine() API when it receives a change to a property that is not the definitionString in a state machine', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: '{ "Prop" : "old-value" }',
                    LoggingConfiguration: {
                        IncludeExecutionData: true,
                    },
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: '{ "Prop" : "new-value" }',
                        LoggingConfiguration: {
                            IncludeExecutionData: false,
                        },
                    },
                },
            },
        },
    });
    // WHEN
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).toBeUndefined();
    expect(mockUpdateMachineDefinition).not.toHaveBeenCalled();
});
test('does not call the updateStateMachine() API when a resource has a DefinitionString property but is not an AWS::StepFunctions::StateMachine is changed', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Machine: {
                Type: 'AWS::NotStepFunctions::NotStateMachine',
                Properties: {
                    DefinitionString: '{ Prop: "old-value" }',
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Machine: {
                    Type: 'AWS::NotStepFunctions::NotStateMachine',
                    Properties: {
                        DefinitionString: '{ Prop: "new-value" }',
                    },
                },
            },
        },
    });
    // WHEN
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).toBeUndefined();
    expect(mockUpdateMachineDefinition).not.toHaveBeenCalled();
});
test('can correctly hotswap old style synth changes', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Parameters: { AssetParam1: { Type: 'String' } },
        Resources: {
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: { Ref: 'AssetParam1' },
                    StateMachineName: 'machine-name',
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Parameters: { AssetParam2: { Type: String } },
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: { Ref: 'AssetParam2' },
                        StateMachineName: 'machine-name',
                    },
                },
            },
        },
    });
    // WHEN
    setup.pushStackResourceSummaries(setup.stackSummaryOf('Machine', 'AWS::StepFunctions::StateMachine', 'arn:aws:states:here:123456789012:stateMachine:my-machine'));
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact, { AssetParam2: 'asset-param-2' });
    // THEN
    expect(deployStackResult).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        definition: 'asset-param-2',
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:machine-name',
    });
});
test('calls the updateStateMachine() API when it receives a change to the definitionString that uses Attributes in a state machine', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Func: {
                Type: 'AWS::Lambda::Function',
            },
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: {
                        'Fn::Join': [
                            '\n',
                            [
                                '{',
                                '  "StartAt" : "SuccessState"',
                                '  "States" : {',
                                '    "SuccessState": {',
                                '      "Type": "Succeed"',
                                '    }',
                                '  }',
                                '}',
                            ],
                        ],
                    },
                    StateMachineName: 'my-machine',
                },
            },
        },
    });
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Func: {
                    Type: 'AWS::Lambda::Function',
                },
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: {
                            'Fn::Join': [
                                '',
                                [
                                    '"Resource": ',
                                    { 'Fn::GetAtt': ['Func', 'Arn'] },
                                ],
                            ],
                        },
                        StateMachineName: 'my-machine',
                    },
                },
            },
        },
    });
    // WHEN
    setup.pushStackResourceSummaries(setup.stackSummaryOf('Machine', 'AWS::StepFunctions::StateMachine', 'arn:aws:states:here:123456789012:stateMachine:my-machine'), setup.stackSummaryOf('Func', 'AWS::Lambda::Function', 'my-func'));
    const deployStackResult = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    // THEN
    expect(deployStackResult).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        definition: '"Resource": arn:aws:lambda:here:123456789012:function:my-func',
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:my-machine',
    });
});
test("will not perform a hotswap deployment if it cannot find a Ref target (outside the state machine's name)", async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Parameters: {
            Param1: { Type: 'String' },
        },
        Resources: {
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: {
                        'Fn::Join': [
                            '',
                            [
                                '{ Prop: "old-value" }, ',
                                '{ "Param" : ',
                                { 'Fn::Sub': '${Param1}' },
                                ' }',
                            ],
                        ],
                    },
                },
            },
        },
    });
    setup.pushStackResourceSummaries(setup.stackSummaryOf('Machine', 'AWS::StepFunctions::StateMachine', 'my-machine'));
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Parameters: {
                Param1: { Type: 'String' },
            },
            Resources: {
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: {
                            'Fn::Join': [
                                '',
                                [
                                    '{ Prop: "new-value" }, ',
                                    '{ "Param" : ',
                                    { 'Fn::Sub': '${Param1}' },
                                    ' }',
                                ],
                            ],
                        },
                    },
                },
            },
        },
    });
    // THEN
    await expect(() => hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact)).rejects.toThrow(/Parameter or resource 'Param1' could not be found for evaluation/);
});
test("will not perform a hotswap deployment if it doesn't know how to handle a specific attribute (outside the state machines's name)", async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Bucket: {
                Type: 'AWS::S3::Bucket',
            },
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: {
                        'Fn::Join': [
                            '',
                            [
                                '{ Prop: "old-value" }, ',
                                '{ "S3Bucket" : ',
                                { 'Fn::GetAtt': ['Bucket', 'UnknownAttribute'] },
                                ' }',
                            ],
                        ],
                    },
                    StateMachineName: 'my-machine',
                },
            },
        },
    });
    setup.pushStackResourceSummaries(setup.stackSummaryOf('Machine', 'AWS::StepFunctions::StateMachine', 'arn:aws:states:here:123456789012:stateMachine:my-machine'), setup.stackSummaryOf('Bucket', 'AWS::S3::Bucket', 'my-bucket'));
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Bucket: {
                    Type: 'AWS::S3::Bucket',
                },
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: {
                            'Fn::Join': [
                                '',
                                [
                                    '{ Prop: "new-value" }, ',
                                    '{ "S3Bucket" : ',
                                    { 'Fn::GetAtt': ['Bucket', 'UnknownAttribute'] },
                                    ' }',
                                ],
                            ],
                        },
                        StateMachineName: 'my-machine',
                    },
                },
            },
        },
    });
    // THEN
    await expect(() => hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact)).rejects.toThrow("We don't support the 'UnknownAttribute' attribute of the 'AWS::S3::Bucket' resource. This is a CDK limitation. Please report it at https://github.com/aws/aws-cdk/issues/new/choose");
});
test('knows how to handle attributes of the AWS::Events::EventBus resource', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            EventBus: {
                Type: 'AWS::Events::EventBus',
                Properties: {
                    Name: 'my-event-bus',
                },
            },
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: {
                        'Fn::Join': ['', [
                                '{"EventBus1Arn":"',
                                { 'Fn::GetAtt': ['EventBus', 'Arn'] },
                                '","EventBus1Name":"',
                                { 'Fn::GetAtt': ['EventBus', 'Name'] },
                                '","EventBus1Ref":"',
                                { Ref: 'EventBus' },
                                '"}',
                            ]],
                    },
                    StateMachineName: 'my-machine',
                },
            },
        },
    });
    setup.pushStackResourceSummaries(setup.stackSummaryOf('EventBus', 'AWS::Events::EventBus', 'my-event-bus'));
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                EventBus: {
                    Type: 'AWS::Events::EventBus',
                    Properties: {
                        Name: 'my-event-bus',
                    },
                },
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: {
                            'Fn::Join': ['', [
                                    '{"EventBus2Arn":"',
                                    { 'Fn::GetAtt': ['EventBus', 'Arn'] },
                                    '","EventBus2Name":"',
                                    { 'Fn::GetAtt': ['EventBus', 'Name'] },
                                    '","EventBus2Ref":"',
                                    { Ref: 'EventBus' },
                                    '"}',
                                ]],
                        },
                        StateMachineName: 'my-machine',
                    },
                },
            },
        },
    });
    // THEN
    const result = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    expect(result).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:my-machine',
        definition: JSON.stringify({
            EventBus2Arn: 'arn:aws:events:here:123456789012:event-bus/my-event-bus',
            EventBus2Name: 'my-event-bus',
            EventBus2Ref: 'my-event-bus',
        }),
    });
});
test('knows how to handle attributes of the AWS::DynamoDB::Table resource', async () => {
    // GIVEN
    setup.setCurrentCfnStackTemplate({
        Resources: {
            Table: {
                Type: 'AWS::DynamoDB::Table',
                Properties: {
                    KeySchema: [{
                            AttributeName: 'name',
                            KeyType: 'HASH',
                        }],
                    AttributeDefinitions: [{
                            AttributeName: 'name',
                            AttributeType: 'S',
                        }],
                    BillingMode: 'PAY_PER_REQUEST',
                },
            },
            Machine: {
                Type: 'AWS::StepFunctions::StateMachine',
                Properties: {
                    DefinitionString: '{}',
                    StateMachineName: 'my-machine',
                },
            },
        },
    });
    setup.pushStackResourceSummaries(setup.stackSummaryOf('Table', 'AWS::DynamoDB::Table', 'my-dynamodb-table'));
    const cdkStackArtifact = setup.cdkStackArtifactOf({
        template: {
            Resources: {
                Table: {
                    Type: 'AWS::DynamoDB::Table',
                    Properties: {
                        KeySchema: [{
                                AttributeName: 'name',
                                KeyType: 'HASH',
                            }],
                        AttributeDefinitions: [{
                                AttributeName: 'name',
                                AttributeType: 'S',
                            }],
                        BillingMode: 'PAY_PER_REQUEST',
                    },
                },
                Machine: {
                    Type: 'AWS::StepFunctions::StateMachine',
                    Properties: {
                        DefinitionString: {
                            'Fn::Join': ['', [
                                    '{"TableName":"',
                                    { Ref: 'Table' },
                                    '","TableArn":"',
                                    { 'Fn::GetAtt': ['Table', 'Arn'] },
                                    '"}',
                                ]],
                        },
                        StateMachineName: 'my-machine',
                    },
                },
            },
        },
    });
    // THEN
    const result = await hotswapMockSdkProvider.tryHotswapDeployment(cdkStackArtifact);
    expect(result).not.toBeUndefined();
    expect(mockUpdateMachineDefinition).toHaveBeenCalledWith({
        stateMachineArn: 'arn:aws:states:here:123456789012:stateMachine:my-machine',
        definition: JSON.stringify({
            TableName: 'my-dynamodb-table',
            TableArn: 'arn:aws:dynamodb:here:123456789012:table/my-dynamodb-table',
        }),
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtbWFjaGluZS1ob3Rzd2FwLWRlcGxveW1lbnRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGF0ZS1tYWNoaW5lLWhvdHN3YXAtZGVwbG95bWVudHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLDhDQUE4QztBQUU5QyxJQUFJLDJCQUFrSSxDQUFDO0FBQ3ZJLElBQUksc0JBQW9ELENBQUM7QUFFekQsVUFBVSxDQUFDLEdBQUcsRUFBRTtJQUNkLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ25ELDJCQUEyQixHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUN4QyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEtBQUssSUFBSSxFQUFFO0lBQ2pGLFFBQVE7SUFDUixNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztRQUNoRCxRQUFRLEVBQUU7WUFDUixTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxrQ0FBa0M7aUJBQ3pDO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUU5RixPQUFPO0lBQ1AsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsd0hBQXdILEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDeEksUUFBUTtJQUNSLEtBQUssQ0FBQywwQkFBMEIsQ0FBQztRQUMvQixTQUFTLEVBQUU7WUFDVCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsVUFBVSxFQUFFO29CQUNWLGdCQUFnQixFQUFFLHVCQUF1QjtvQkFDekMsZ0JBQWdCLEVBQUUsWUFBWTtpQkFDL0I7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUM7UUFDaEQsUUFBUSxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNULE9BQU8sRUFBRTtvQkFDUCxJQUFJLEVBQUUsa0NBQWtDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1YsZ0JBQWdCLEVBQUUsdUJBQXVCO3dCQUN6QyxnQkFBZ0IsRUFBRSxZQUFZO3FCQUMvQjtpQkFDRjthQUNGO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPO0lBQ1AsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFFOUYsT0FBTztJQUNQLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUM5QyxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQztRQUN2RCxVQUFVLEVBQUUsdUJBQXVCO1FBQ25DLGVBQWUsRUFBRSwwREFBMEQ7S0FDNUUsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMscUhBQXFILEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDckksUUFBUTtJQUNSLEtBQUssQ0FBQywwQkFBMEIsQ0FBQztRQUMvQixTQUFTLEVBQUU7WUFDVCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsVUFBVSxFQUFFO29CQUNWLGdCQUFnQixFQUFFO3dCQUNoQixVQUFVLEVBQUU7NEJBQ1YsSUFBSTs0QkFDSjtnQ0FDRSxHQUFHO2dDQUNILDhCQUE4QjtnQ0FDOUIsZ0JBQWdCO2dDQUNoQix1QkFBdUI7Z0NBQ3ZCLHNCQUFzQjtnQ0FDdEIsMkJBQTJCO2dDQUMzQixtQkFBbUI7Z0NBQ25CLE9BQU87Z0NBQ1AsS0FBSztnQ0FDTCxHQUFHOzZCQUNKO3lCQUNGO3FCQUNGO29CQUNELGdCQUFnQixFQUFFLFlBQVk7aUJBQy9CO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUU7b0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztvQkFDeEMsVUFBVSxFQUFFO3dCQUNWLGdCQUFnQixFQUFFOzRCQUNoQixVQUFVLEVBQUU7Z0NBQ1YsSUFBSTtnQ0FDSjtvQ0FDRSxHQUFHO29DQUNILDhCQUE4QjtvQ0FDOUIsZUFBZTtvQ0FDZix1QkFBdUI7b0NBQ3ZCLHlCQUF5QjtvQ0FDekIsT0FBTztvQ0FDUCxLQUFLO29DQUNMLEdBQUc7aUNBQ0o7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsZ0JBQWdCLEVBQUUsWUFBWTtxQkFDL0I7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRTlGLE9BQU87SUFDUCxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDOUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUMsb0JBQW9CLENBQUM7UUFDdkQsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDekIsT0FBTyxFQUFFLGNBQWM7WUFDdkIsTUFBTSxFQUFFO2dCQUNOLFlBQVksRUFBRTtvQkFDWixJQUFJLEVBQUUsU0FBUztpQkFDaEI7YUFDRjtTQUNGLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNYLGVBQWUsRUFBRSwwREFBMEQ7S0FDNUUsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsMEhBQTBILEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDMUksUUFBUTtJQUNSLEtBQUssQ0FBQywwQkFBMEIsQ0FBQztRQUMvQixTQUFTLEVBQUU7WUFDVCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsVUFBVSxFQUFFO29CQUNWLGdCQUFnQixFQUFFLDBCQUEwQjtpQkFDN0M7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUM7UUFDaEQsUUFBUSxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNULE9BQU8sRUFBRTtvQkFDUCxJQUFJLEVBQUUsa0NBQWtDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1YsZ0JBQWdCLEVBQUUsMEJBQTBCO3FCQUM3QztpQkFDRjthQUNGO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFFSCxPQUFPO0lBQ1AsS0FBSyxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLGtDQUFrQyxFQUFFLDBEQUEwRCxDQUFDLENBQUMsQ0FBQztJQUNsSyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUU5RixPQUFPO0lBQ1AsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzlDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO1FBQ3ZELFVBQVUsRUFBRSwwQkFBMEI7UUFDdEMsZUFBZSxFQUFFLDBEQUEwRDtLQUM1RSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyx3SUFBd0ksRUFBRSxLQUFLLElBQUksRUFBRTtJQUN4SixRQUFRO0lBQ1IsS0FBSyxDQUFDLDBCQUEwQixDQUFDO1FBQy9CLFNBQVMsRUFBRTtZQUNULE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsa0NBQWtDO2dCQUN4QyxVQUFVLEVBQUU7b0JBQ1YsZ0JBQWdCLEVBQUUsMEJBQTBCO29CQUM1QyxvQkFBb0IsRUFBRTt3QkFDcEIsb0JBQW9CLEVBQUUsSUFBSTtxQkFDM0I7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUM7UUFDaEQsUUFBUSxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNULE9BQU8sRUFBRTtvQkFDUCxJQUFJLEVBQUUsa0NBQWtDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1YsZ0JBQWdCLEVBQUUsMEJBQTBCO3dCQUM1QyxvQkFBb0IsRUFBRTs0QkFDcEIsb0JBQW9CLEVBQUUsS0FBSzt5QkFDNUI7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBRTlGLE9BQU87SUFDUCxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUMxQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxzSkFBc0osRUFBRSxLQUFLLElBQUksRUFBRTtJQUN0SyxRQUFRO0lBQ1IsS0FBSyxDQUFDLDBCQUEwQixDQUFDO1FBQy9CLFNBQVMsRUFBRTtZQUNULE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsd0NBQXdDO2dCQUM5QyxVQUFVLEVBQUU7b0JBQ1YsZ0JBQWdCLEVBQUUsdUJBQXVCO2lCQUMxQzthQUNGO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFDSCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQztRQUNoRCxRQUFRLEVBQUU7WUFDUixTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSx3Q0FBd0M7b0JBQzlDLFVBQVUsRUFBRTt3QkFDVixnQkFBZ0IsRUFBRSx1QkFBdUI7cUJBQzFDO2lCQUNGO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUU5RixPQUFPO0lBQ1AsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDMUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7SUFDL0QsUUFBUTtJQUNSLEtBQUssQ0FBQywwQkFBMEIsQ0FBQztRQUMvQixVQUFVLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDL0MsU0FBUyxFQUFFO1lBQ1QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxrQ0FBa0M7Z0JBQ3hDLFVBQVUsRUFBRTtvQkFDVixnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUU7b0JBQ3hDLGdCQUFnQixFQUFFLGNBQWM7aUJBQ2pDO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFFBQVEsRUFBRTtZQUNSLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUM3QyxTQUFTLEVBQUU7Z0JBQ1QsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxrQ0FBa0M7b0JBQ3hDLFVBQVUsRUFBRTt3QkFDVixnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUU7d0JBQ3hDLGdCQUFnQixFQUFFLGNBQWM7cUJBQ2pDO2lCQUNGO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxLQUFLLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsa0NBQWtDLEVBQUUsMERBQTBELENBQUMsQ0FBQyxDQUFDO0lBQ2xLLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBRWhJLE9BQU87SUFDUCxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDOUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUMsb0JBQW9CLENBQUM7UUFDdkQsVUFBVSxFQUFFLGVBQWU7UUFDM0IsZUFBZSxFQUFFLDREQUE0RDtLQUM5RSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyw4SEFBOEgsRUFBRSxLQUFLLElBQUksRUFBRTtJQUM5SSxRQUFRO0lBQ1IsS0FBSyxDQUFDLDBCQUEwQixDQUFDO1FBQy9CLFNBQVMsRUFBRTtZQUNULElBQUksRUFBRTtnQkFDSixJQUFJLEVBQUUsdUJBQXVCO2FBQzlCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxrQ0FBa0M7Z0JBQ3hDLFVBQVUsRUFBRTtvQkFDVixnQkFBZ0IsRUFBRTt3QkFDaEIsVUFBVSxFQUFFOzRCQUNWLElBQUk7NEJBQ0o7Z0NBQ0UsR0FBRztnQ0FDSCw4QkFBOEI7Z0NBQzlCLGdCQUFnQjtnQ0FDaEIsdUJBQXVCO2dDQUN2Qix5QkFBeUI7Z0NBQ3pCLE9BQU87Z0NBQ1AsS0FBSztnQ0FDTCxHQUFHOzZCQUNKO3lCQUNGO3FCQUNGO29CQUNELGdCQUFnQixFQUFFLFlBQVk7aUJBQy9CO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRTtnQkFDVCxJQUFJLEVBQUU7b0JBQ0osSUFBSSxFQUFFLHVCQUF1QjtpQkFDOUI7Z0JBQ0QsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxrQ0FBa0M7b0JBQ3hDLFVBQVUsRUFBRTt3QkFDVixnQkFBZ0IsRUFBRTs0QkFDaEIsVUFBVSxFQUFFO2dDQUNWLEVBQUU7Z0NBQ0Y7b0NBQ0UsY0FBYztvQ0FDZCxFQUFFLFlBQVksRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtpQ0FDbEM7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsZ0JBQWdCLEVBQUUsWUFBWTtxQkFDL0I7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLEtBQUssQ0FBQywwQkFBMEIsQ0FDOUIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsa0NBQWtDLEVBQUUsMERBQTBELENBQUMsRUFDL0gsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsU0FBUyxDQUFDLENBQ2pFLENBQUM7SUFDRixNQUFNLGlCQUFpQixHQUFHLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUU5RixPQUFPO0lBQ1AsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzlDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO1FBQ3ZELFVBQVUsRUFBRSwrREFBK0Q7UUFDM0UsZUFBZSxFQUFFLDBEQUEwRDtLQUM1RSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyx5R0FBeUcsRUFBRSxLQUFLLElBQUksRUFBRTtJQUN6SCxRQUFRO0lBQ1IsS0FBSyxDQUFDLDBCQUEwQixDQUFDO1FBQy9CLFVBQVUsRUFBRTtZQUNWLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7U0FDM0I7UUFDRCxTQUFTLEVBQUU7WUFDVCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsVUFBVSxFQUFFO29CQUNWLGdCQUFnQixFQUFFO3dCQUNoQixVQUFVLEVBQUU7NEJBQ1YsRUFBRTs0QkFDRjtnQ0FDRSx5QkFBeUI7Z0NBQ3pCLGNBQWM7Z0NBQ2QsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFO2dDQUMxQixJQUFJOzZCQUNMO3lCQUNGO3FCQUNGO2lCQUNGO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxrQ0FBa0MsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ3BILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFFBQVEsRUFBRTtZQUNSLFVBQVUsRUFBRTtnQkFDVixNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2FBQzNCO1lBQ0QsU0FBUyxFQUFFO2dCQUNULE9BQU8sRUFBRTtvQkFDUCxJQUFJLEVBQUUsa0NBQWtDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1YsZ0JBQWdCLEVBQUU7NEJBQ2hCLFVBQVUsRUFBRTtnQ0FDVixFQUFFO2dDQUNGO29DQUNFLHlCQUF5QjtvQ0FDekIsY0FBYztvQ0FDZCxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUU7b0NBQzFCLElBQUk7aUNBQ0w7NkJBQ0Y7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUNoQixzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUM5RCxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0VBQWtFLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxpSUFBaUksRUFBRSxLQUFLLElBQUksRUFBRTtJQUNqSixRQUFRO0lBQ1IsS0FBSyxDQUFDLDBCQUEwQixDQUFDO1FBQy9CLFNBQVMsRUFBRTtZQUNULE1BQU0sRUFBRTtnQkFDTixJQUFJLEVBQUUsaUJBQWlCO2FBQ3hCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxrQ0FBa0M7Z0JBQ3hDLFVBQVUsRUFBRTtvQkFDVixnQkFBZ0IsRUFBRTt3QkFDaEIsVUFBVSxFQUFFOzRCQUNWLEVBQUU7NEJBQ0Y7Z0NBQ0UseUJBQXlCO2dDQUN6QixpQkFBaUI7Z0NBQ2pCLEVBQUUsWUFBWSxFQUFFLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLEVBQUU7Z0NBQ2hELElBQUk7NkJBQ0w7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsZ0JBQWdCLEVBQUUsWUFBWTtpQkFDL0I7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBQ0gsS0FBSyxDQUFDLDBCQUEwQixDQUM5QixLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxrQ0FBa0MsRUFBRSwwREFBMEQsQ0FBQyxFQUMvSCxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLENBQUMsQ0FDL0QsQ0FBQztJQUNGLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRTtnQkFDVCxNQUFNLEVBQUU7b0JBQ04sSUFBSSxFQUFFLGlCQUFpQjtpQkFDeEI7Z0JBQ0QsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxrQ0FBa0M7b0JBQ3hDLFVBQVUsRUFBRTt3QkFDVixnQkFBZ0IsRUFBRTs0QkFDaEIsVUFBVSxFQUFFO2dDQUNWLEVBQUU7Z0NBQ0Y7b0NBQ0UseUJBQXlCO29DQUN6QixpQkFBaUI7b0NBQ2pCLEVBQUUsWUFBWSxFQUFFLENBQUMsUUFBUSxFQUFFLGtCQUFrQixDQUFDLEVBQUU7b0NBQ2hELElBQUk7aUNBQ0w7NkJBQ0Y7eUJBQ0Y7d0JBQ0QsZ0JBQWdCLEVBQUUsWUFBWTtxQkFDL0I7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUNoQixzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUM5RCxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMscUxBQXFMLENBQUMsQ0FBQztBQUMzTSxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxzRUFBc0UsRUFBRSxLQUFLLElBQUksRUFBRTtJQUN0RixRQUFRO0lBQ1IsS0FBSyxDQUFDLDBCQUEwQixDQUFDO1FBQy9CLFNBQVMsRUFBRTtZQUNULFFBQVEsRUFBRTtnQkFDUixJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixVQUFVLEVBQUU7b0JBQ1YsSUFBSSxFQUFFLGNBQWM7aUJBQ3JCO2FBQ0Y7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsVUFBVSxFQUFFO29CQUNWLGdCQUFnQixFQUFFO3dCQUNoQixVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0NBQ2YsbUJBQW1CO2dDQUNuQixFQUFFLFlBQVksRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsRUFBRTtnQ0FDckMscUJBQXFCO2dDQUNyQixFQUFFLFlBQVksRUFBRSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFBRTtnQ0FDdEMsb0JBQW9CO2dDQUNwQixFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUU7Z0NBQ25CLElBQUk7NkJBQ0wsQ0FBQztxQkFDSDtvQkFDRCxnQkFBZ0IsRUFBRSxZQUFZO2lCQUMvQjthQUNGO1NBQ0Y7S0FDRixDQUFDLENBQUM7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQzlCLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLHVCQUF1QixFQUFFLGNBQWMsQ0FBQyxDQUMxRSxDQUFDO0lBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUM7UUFDaEQsUUFBUSxFQUFFO1lBQ1IsU0FBUyxFQUFFO2dCQUNULFFBQVEsRUFBRTtvQkFDUixJQUFJLEVBQUUsdUJBQXVCO29CQUM3QixVQUFVLEVBQUU7d0JBQ1YsSUFBSSxFQUFFLGNBQWM7cUJBQ3JCO2lCQUNGO2dCQUNELE9BQU8sRUFBRTtvQkFDUCxJQUFJLEVBQUUsa0NBQWtDO29CQUN4QyxVQUFVLEVBQUU7d0JBQ1YsZ0JBQWdCLEVBQUU7NEJBQ2hCLFVBQVUsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQ0FDZixtQkFBbUI7b0NBQ25CLEVBQUUsWUFBWSxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUFFO29DQUNyQyxxQkFBcUI7b0NBQ3JCLEVBQUUsWUFBWSxFQUFFLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUFFO29DQUN0QyxvQkFBb0I7b0NBQ3BCLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRTtvQ0FDbkIsSUFBSTtpQ0FDTCxDQUFDO3lCQUNIO3dCQUNELGdCQUFnQixFQUFFLFlBQVk7cUJBQy9CO2lCQUNGO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILE9BQU87SUFDUCxNQUFNLE1BQU0sR0FBRyxNQUFNLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFFbkYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUNuQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQztRQUN2RCxlQUFlLEVBQUUsMERBQTBEO1FBQzNFLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ3pCLFlBQVksRUFBRSx5REFBeUQ7WUFDdkUsYUFBYSxFQUFFLGNBQWM7WUFDN0IsWUFBWSxFQUFFLGNBQWM7U0FDN0IsQ0FBQztLQUNILENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEtBQUssSUFBSSxFQUFFO0lBQ3JGLFFBQVE7SUFDUixLQUFLLENBQUMsMEJBQTBCLENBQUM7UUFDL0IsU0FBUyxFQUFFO1lBQ1QsS0FBSyxFQUFFO2dCQUNMLElBQUksRUFBRSxzQkFBc0I7Z0JBQzVCLFVBQVUsRUFBRTtvQkFDVixTQUFTLEVBQUUsQ0FBQzs0QkFDVixhQUFhLEVBQUUsTUFBTTs0QkFDckIsT0FBTyxFQUFFLE1BQU07eUJBQ2hCLENBQUM7b0JBQ0Ysb0JBQW9CLEVBQUUsQ0FBQzs0QkFDckIsYUFBYSxFQUFFLE1BQU07NEJBQ3JCLGFBQWEsRUFBRSxHQUFHO3lCQUNuQixDQUFDO29CQUNGLFdBQVcsRUFBRSxpQkFBaUI7aUJBQy9CO2FBQ0Y7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtDQUFrQztnQkFDeEMsVUFBVSxFQUFFO29CQUNWLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLGdCQUFnQixFQUFFLFlBQVk7aUJBQy9CO2FBQ0Y7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUNILEtBQUssQ0FBQywwQkFBMEIsQ0FDOUIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLENBQUMsQ0FDM0UsQ0FBQztJQUNGLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRTtnQkFDVCxLQUFLLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLHNCQUFzQjtvQkFDNUIsVUFBVSxFQUFFO3dCQUNWLFNBQVMsRUFBRSxDQUFDO2dDQUNWLGFBQWEsRUFBRSxNQUFNO2dDQUNyQixPQUFPLEVBQUUsTUFBTTs2QkFDaEIsQ0FBQzt3QkFDRixvQkFBb0IsRUFBRSxDQUFDO2dDQUNyQixhQUFhLEVBQUUsTUFBTTtnQ0FDckIsYUFBYSxFQUFFLEdBQUc7NkJBQ25CLENBQUM7d0JBQ0YsV0FBVyxFQUFFLGlCQUFpQjtxQkFDL0I7aUJBQ0Y7Z0JBQ0QsT0FBTyxFQUFFO29CQUNQLElBQUksRUFBRSxrQ0FBa0M7b0JBQ3hDLFVBQVUsRUFBRTt3QkFDVixnQkFBZ0IsRUFBRTs0QkFDaEIsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFO29DQUNmLGdCQUFnQjtvQ0FDaEIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFO29DQUNoQixnQkFBZ0I7b0NBQ2hCLEVBQUUsWUFBWSxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFO29DQUNsQyxJQUFJO2lDQUNMLENBQUM7eUJBQ0g7d0JBQ0QsZ0JBQWdCLEVBQUUsWUFBWTtxQkFDL0I7aUJBQ0Y7YUFDRjtTQUNGO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTztJQUNQLE1BQU0sTUFBTSxHQUFHLE1BQU0sc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUVuRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ25DLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO1FBQ3ZELGVBQWUsRUFBRSwwREFBMEQ7UUFDM0UsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDekIsU0FBUyxFQUFFLG1CQUFtQjtZQUM5QixRQUFRLEVBQUUsNERBQTREO1NBQ3ZFLENBQUM7S0FDSCxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0ZXBGdW5jdGlvbnMgfSBmcm9tICdhd3Mtc2RrJztcbmltcG9ydCAqIGFzIHNldHVwIGZyb20gJy4vaG90c3dhcC10ZXN0LXNldHVwJztcblxubGV0IG1vY2tVcGRhdGVNYWNoaW5lRGVmaW5pdGlvbjogKHBhcmFtczogU3RlcEZ1bmN0aW9ucy5UeXBlcy5VcGRhdGVTdGF0ZU1hY2hpbmVJbnB1dCkgPT4gU3RlcEZ1bmN0aW9ucy5UeXBlcy5VcGRhdGVTdGF0ZU1hY2hpbmVPdXRwdXQ7XG5sZXQgaG90c3dhcE1vY2tTZGtQcm92aWRlcjogc2V0dXAuSG90c3dhcE1vY2tTZGtQcm92aWRlcjtcblxuYmVmb3JlRWFjaCgoKSA9PiB7XG4gIGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIgPSBzZXR1cC5zZXR1cEhvdHN3YXBUZXN0cygpO1xuICBtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24gPSBqZXN0LmZuKCk7XG4gIGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIuc2V0VXBkYXRlU3RhdGVNYWNoaW5lTW9jayhtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24pO1xufSk7XG5cbnRlc3QoJ3JldHVybnMgdW5kZWZpbmVkIHdoZW4gYSBuZXcgU3RhdGVNYWNoaW5lIGlzIGFkZGVkIHRvIHRoZSBTdGFjaycsIGFzeW5jICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgY29uc3QgY2RrU3RhY2tBcnRpZmFjdCA9IHNldHVwLmNka1N0YWNrQXJ0aWZhY3RPZih7XG4gICAgdGVtcGxhdGU6IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBNYWNoaW5lOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gV0hFTlxuICBjb25zdCBkZXBsb3lTdGFja1Jlc3VsdCA9IGF3YWl0IGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIudHJ5SG90c3dhcERlcGxveW1lbnQoY2RrU3RhY2tBcnRpZmFjdCk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGVwbG95U3RhY2tSZXN1bHQpLnRvQmVVbmRlZmluZWQoKTtcbn0pO1xuXG50ZXN0KCdjYWxscyB0aGUgdXBkYXRlU3RhdGVNYWNoaW5lKCkgQVBJIHdoZW4gaXQgcmVjZWl2ZXMgb25seSBhIGRlZmluaXRpb25TdHJpbmcgY2hhbmdlIHdpdGhvdXQgRm46OkpvaW4gaW4gYSBzdGF0ZSBtYWNoaW5lJywgYXN5bmMgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBzZXR1cC5zZXRDdXJyZW50Q2ZuU3RhY2tUZW1wbGF0ZSh7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBNYWNoaW5lOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiAneyBQcm9wOiBcIm9sZC12YWx1ZVwiIH0nLFxuICAgICAgICAgIFN0YXRlTWFjaGluZU5hbWU6ICdteS1tYWNoaW5lJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IGNka1N0YWNrQXJ0aWZhY3QgPSBzZXR1cC5jZGtTdGFja0FydGlmYWN0T2Yoe1xuICAgIHRlbXBsYXRlOiB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgTWFjaGluZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogJ3sgUHJvcDogXCJuZXctdmFsdWVcIiB9JyxcbiAgICAgICAgICAgIFN0YXRlTWFjaGluZU5hbWU6ICdteS1tYWNoaW5lJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxuICAvLyBXSEVOXG4gIGNvbnN0IGRlcGxveVN0YWNrUmVzdWx0ID0gYXdhaXQgaG90c3dhcE1vY2tTZGtQcm92aWRlci50cnlIb3Rzd2FwRGVwbG95bWVudChjZGtTdGFja0FydGlmYWN0KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkZXBsb3lTdGFja1Jlc3VsdCkubm90LnRvQmVVbmRlZmluZWQoKTtcbiAgZXhwZWN0KG1vY2tVcGRhdGVNYWNoaW5lRGVmaW5pdGlvbikudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgIGRlZmluaXRpb246ICd7IFByb3A6IFwibmV3LXZhbHVlXCIgfScsXG4gICAgc3RhdGVNYWNoaW5lQXJuOiAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm15LW1hY2hpbmUnLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdjYWxscyB0aGUgdXBkYXRlU3RhdGVNYWNoaW5lKCkgQVBJIHdoZW4gaXQgcmVjZWl2ZXMgb25seSBhIGRlZmluaXRpb25TdHJpbmcgY2hhbmdlIHdpdGggRm46OkpvaW4gaW4gYSBzdGF0ZSBtYWNoaW5lJywgYXN5bmMgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBzZXR1cC5zZXRDdXJyZW50Q2ZuU3RhY2tUZW1wbGF0ZSh7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBNYWNoaW5lOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiB7XG4gICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICdcXG4nLFxuICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgJ3snLFxuICAgICAgICAgICAgICAgICcgIFwiU3RhcnRBdFwiIDogXCJTdWNjZXNzU3RhdGVcIicsXG4gICAgICAgICAgICAgICAgJyAgXCJTdGF0ZXNcIiA6IHsnLFxuICAgICAgICAgICAgICAgICcgICAgXCJTdWNjZXNzU3RhdGVcIjogeycsXG4gICAgICAgICAgICAgICAgJyAgICAgIFwiVHlwZVwiOiBcIlBhc3NcIicsXG4gICAgICAgICAgICAgICAgJyAgICAgIFwiUmVzdWx0XCI6IFwiU3VjY2Vzc1wiJyxcbiAgICAgICAgICAgICAgICAnICAgICAgXCJFbmRcIjogdHJ1ZScsXG4gICAgICAgICAgICAgICAgJyAgICB9JyxcbiAgICAgICAgICAgICAgICAnICB9JyxcbiAgICAgICAgICAgICAgICAnfScsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgU3RhdGVNYWNoaW5lTmFtZTogJ215LW1hY2hpbmUnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgY2RrU3RhY2tBcnRpZmFjdCA9IHNldHVwLmNka1N0YWNrQXJ0aWZhY3RPZih7XG4gICAgdGVtcGxhdGU6IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBNYWNoaW5lOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyxcbiAgICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiB7XG4gICAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgICAnXFxuJyxcbiAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAneycsXG4gICAgICAgICAgICAgICAgICAnICBcIlN0YXJ0QXRcIjogXCJTdWNjZXNzU3RhdGVcIiwnLFxuICAgICAgICAgICAgICAgICAgJyAgXCJTdGF0ZXNcIjogeycsXG4gICAgICAgICAgICAgICAgICAnICAgIFwiU3VjY2Vzc1N0YXRlXCI6IHsnLFxuICAgICAgICAgICAgICAgICAgJyAgICAgIFwiVHlwZVwiOiBcIlN1Y2NlZWRcIicsXG4gICAgICAgICAgICAgICAgICAnICAgIH0nLFxuICAgICAgICAgICAgICAgICAgJyAgfScsXG4gICAgICAgICAgICAgICAgICAnfScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTdGF0ZU1hY2hpbmVOYW1lOiAnbXktbWFjaGluZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gV0hFTlxuICBjb25zdCBkZXBsb3lTdGFja1Jlc3VsdCA9IGF3YWl0IGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIudHJ5SG90c3dhcERlcGxveW1lbnQoY2RrU3RhY2tBcnRpZmFjdCk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGVwbG95U3RhY2tSZXN1bHQpLm5vdC50b0JlVW5kZWZpbmVkKCk7XG4gIGV4cGVjdChtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICBkZWZpbml0aW9uOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBTdGFydEF0OiAnU3VjY2Vzc1N0YXRlJyxcbiAgICAgIFN0YXRlczoge1xuICAgICAgICBTdWNjZXNzU3RhdGU6IHtcbiAgICAgICAgICBUeXBlOiAnU3VjY2VlZCcsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sIG51bGwsIDIpLFxuICAgIHN0YXRlTWFjaGluZUFybjogJ2Fybjphd3M6c3RhdGVzOmhlcmU6MTIzNDU2Nzg5MDEyOnN0YXRlTWFjaGluZTpteS1tYWNoaW5lJyxcbiAgfSk7XG59KTtcblxudGVzdCgnY2FsbHMgdGhlIHVwZGF0ZVN0YXRlTWFjaGluZSgpIEFQSSB3aGVuIGl0IHJlY2VpdmVzIGEgY2hhbmdlIHRvIHRoZSBkZWZpbml0aW9uU3RyaW5nIGluIGEgc3RhdGUgbWFjaGluZSB0aGF0IGhhcyBubyBuYW1lJywgYXN5bmMgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBzZXR1cC5zZXRDdXJyZW50Q2ZuU3RhY2tUZW1wbGF0ZSh7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBNYWNoaW5lOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiAneyBcIlByb3BcIiA6IFwib2xkLXZhbHVlXCIgfScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBjZGtTdGFja0FydGlmYWN0ID0gc2V0dXAuY2RrU3RhY2tBcnRpZmFjdE9mKHtcbiAgICB0ZW1wbGF0ZToge1xuICAgICAgUmVzb3VyY2VzOiB7XG4gICAgICAgIE1hY2hpbmU6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIERlZmluaXRpb25TdHJpbmc6ICd7IFwiUHJvcFwiIDogXCJuZXctdmFsdWVcIiB9JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxuICAvLyBXSEVOXG4gIHNldHVwLnB1c2hTdGFja1Jlc291cmNlU3VtbWFyaWVzKHNldHVwLnN0YWNrU3VtbWFyeU9mKCdNYWNoaW5lJywgJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJywgJ2Fybjphd3M6c3RhdGVzOmhlcmU6MTIzNDU2Nzg5MDEyOnN0YXRlTWFjaGluZTpteS1tYWNoaW5lJykpO1xuICBjb25zdCBkZXBsb3lTdGFja1Jlc3VsdCA9IGF3YWl0IGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIudHJ5SG90c3dhcERlcGxveW1lbnQoY2RrU3RhY2tBcnRpZmFjdCk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGVwbG95U3RhY2tSZXN1bHQpLm5vdC50b0JlVW5kZWZpbmVkKCk7XG4gIGV4cGVjdChtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICBkZWZpbml0aW9uOiAneyBcIlByb3BcIiA6IFwibmV3LXZhbHVlXCIgfScsXG4gICAgc3RhdGVNYWNoaW5lQXJuOiAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm15LW1hY2hpbmUnLFxuICB9KTtcbn0pO1xuXG50ZXN0KCdkb2VzIG5vdCBjYWxsIHRoZSB1cGRhdGVTdGF0ZU1hY2hpbmUoKSBBUEkgd2hlbiBpdCByZWNlaXZlcyBhIGNoYW5nZSB0byBhIHByb3BlcnR5IHRoYXQgaXMgbm90IHRoZSBkZWZpbml0aW9uU3RyaW5nIGluIGEgc3RhdGUgbWFjaGluZScsIGFzeW5jICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgc2V0dXAuc2V0Q3VycmVudENmblN0YWNrVGVtcGxhdGUoe1xuICAgIFJlc291cmNlczoge1xuICAgICAgTWFjaGluZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogJ3sgXCJQcm9wXCIgOiBcIm9sZC12YWx1ZVwiIH0nLFxuICAgICAgICAgIExvZ2dpbmdDb25maWd1cmF0aW9uOiB7IC8vIG5vbi1kZWZpbml0aW9uU3RyaW5nIHByb3BlcnR5XG4gICAgICAgICAgICBJbmNsdWRlRXhlY3V0aW9uRGF0YTogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgY2RrU3RhY2tBcnRpZmFjdCA9IHNldHVwLmNka1N0YWNrQXJ0aWZhY3RPZih7XG4gICAgdGVtcGxhdGU6IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBNYWNoaW5lOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyxcbiAgICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiAneyBcIlByb3BcIiA6IFwibmV3LXZhbHVlXCIgfScsXG4gICAgICAgICAgICBMb2dnaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgICBJbmNsdWRlRXhlY3V0aW9uRGF0YTogZmFsc2UsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFdIRU5cbiAgY29uc3QgZGVwbG95U3RhY2tSZXN1bHQgPSBhd2FpdCBob3Rzd2FwTW9ja1Nka1Byb3ZpZGVyLnRyeUhvdHN3YXBEZXBsb3ltZW50KGNka1N0YWNrQXJ0aWZhY3QpO1xuXG4gIC8vIFRIRU5cbiAgZXhwZWN0KGRlcGxveVN0YWNrUmVzdWx0KS50b0JlVW5kZWZpbmVkKCk7XG4gIGV4cGVjdChtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24pLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG59KTtcblxudGVzdCgnZG9lcyBub3QgY2FsbCB0aGUgdXBkYXRlU3RhdGVNYWNoaW5lKCkgQVBJIHdoZW4gYSByZXNvdXJjZSBoYXMgYSBEZWZpbml0aW9uU3RyaW5nIHByb3BlcnR5IGJ1dCBpcyBub3QgYW4gQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUgaXMgY2hhbmdlZCcsIGFzeW5jICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgc2V0dXAuc2V0Q3VycmVudENmblN0YWNrVGVtcGxhdGUoe1xuICAgIFJlc291cmNlczoge1xuICAgICAgTWFjaGluZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpOb3RTdGVwRnVuY3Rpb25zOjpOb3RTdGF0ZU1hY2hpbmUnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogJ3sgUHJvcDogXCJvbGQtdmFsdWVcIiB9JyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IGNka1N0YWNrQXJ0aWZhY3QgPSBzZXR1cC5jZGtTdGFja0FydGlmYWN0T2Yoe1xuICAgIHRlbXBsYXRlOiB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgTWFjaGluZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6Ok5vdFN0ZXBGdW5jdGlvbnM6Ok5vdFN0YXRlTWFjaGluZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogJ3sgUHJvcDogXCJuZXctdmFsdWVcIiB9JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxuICAvLyBXSEVOXG4gIGNvbnN0IGRlcGxveVN0YWNrUmVzdWx0ID0gYXdhaXQgaG90c3dhcE1vY2tTZGtQcm92aWRlci50cnlIb3Rzd2FwRGVwbG95bWVudChjZGtTdGFja0FydGlmYWN0KTtcblxuICAvLyBUSEVOXG4gIGV4cGVjdChkZXBsb3lTdGFja1Jlc3VsdCkudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QobW9ja1VwZGF0ZU1hY2hpbmVEZWZpbml0aW9uKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xufSk7XG5cbnRlc3QoJ2NhbiBjb3JyZWN0bHkgaG90c3dhcCBvbGQgc3R5bGUgc3ludGggY2hhbmdlcycsIGFzeW5jICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgc2V0dXAuc2V0Q3VycmVudENmblN0YWNrVGVtcGxhdGUoe1xuICAgIFBhcmFtZXRlcnM6IHsgQXNzZXRQYXJhbTE6IHsgVHlwZTogJ1N0cmluZycgfSB9LFxuICAgIFJlc291cmNlczoge1xuICAgICAgTWFjaGluZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogeyBSZWY6ICdBc3NldFBhcmFtMScgfSxcbiAgICAgICAgICBTdGF0ZU1hY2hpbmVOYW1lOiAnbWFjaGluZS1uYW1lJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IGNka1N0YWNrQXJ0aWZhY3QgPSBzZXR1cC5jZGtTdGFja0FydGlmYWN0T2Yoe1xuICAgIHRlbXBsYXRlOiB7XG4gICAgICBQYXJhbWV0ZXJzOiB7IEFzc2V0UGFyYW0yOiB7IFR5cGU6IFN0cmluZyB9IH0sXG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgTWFjaGluZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogeyBSZWY6ICdBc3NldFBhcmFtMicgfSxcbiAgICAgICAgICAgIFN0YXRlTWFjaGluZU5hbWU6ICdtYWNoaW5lLW5hbWUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFdIRU5cbiAgc2V0dXAucHVzaFN0YWNrUmVzb3VyY2VTdW1tYXJpZXMoc2V0dXAuc3RhY2tTdW1tYXJ5T2YoJ01hY2hpbmUnLCAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLCAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm15LW1hY2hpbmUnKSk7XG4gIGNvbnN0IGRlcGxveVN0YWNrUmVzdWx0ID0gYXdhaXQgaG90c3dhcE1vY2tTZGtQcm92aWRlci50cnlIb3Rzd2FwRGVwbG95bWVudChjZGtTdGFja0FydGlmYWN0LCB7IEFzc2V0UGFyYW0yOiAnYXNzZXQtcGFyYW0tMicgfSk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGVwbG95U3RhY2tSZXN1bHQpLm5vdC50b0JlVW5kZWZpbmVkKCk7XG4gIGV4cGVjdChtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICBkZWZpbml0aW9uOiAnYXNzZXQtcGFyYW0tMicsXG4gICAgc3RhdGVNYWNoaW5lQXJuOiAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm1hY2hpbmUtbmFtZScsXG4gIH0pO1xufSk7XG5cbnRlc3QoJ2NhbGxzIHRoZSB1cGRhdGVTdGF0ZU1hY2hpbmUoKSBBUEkgd2hlbiBpdCByZWNlaXZlcyBhIGNoYW5nZSB0byB0aGUgZGVmaW5pdGlvblN0cmluZyB0aGF0IHVzZXMgQXR0cmlidXRlcyBpbiBhIHN0YXRlIG1hY2hpbmUnLCBhc3luYyAoKSA9PiB7XG4gIC8vIEdJVkVOXG4gIHNldHVwLnNldEN1cnJlbnRDZm5TdGFja1RlbXBsYXRlKHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEZ1bmM6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsXG4gICAgICB9LFxuICAgICAgTWFjaGluZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgRGVmaW5pdGlvblN0cmluZzoge1xuICAgICAgICAgICAgJ0ZuOjpKb2luJzogW1xuICAgICAgICAgICAgICAnXFxuJyxcbiAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICd7JyxcbiAgICAgICAgICAgICAgICAnICBcIlN0YXJ0QXRcIiA6IFwiU3VjY2Vzc1N0YXRlXCInLFxuICAgICAgICAgICAgICAgICcgIFwiU3RhdGVzXCIgOiB7JyxcbiAgICAgICAgICAgICAgICAnICAgIFwiU3VjY2Vzc1N0YXRlXCI6IHsnLFxuICAgICAgICAgICAgICAgICcgICAgICBcIlR5cGVcIjogXCJTdWNjZWVkXCInLFxuICAgICAgICAgICAgICAgICcgICAgfScsXG4gICAgICAgICAgICAgICAgJyAgfScsXG4gICAgICAgICAgICAgICAgJ30nLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIFN0YXRlTWFjaGluZU5hbWU6ICdteS1tYWNoaW5lJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IGNka1N0YWNrQXJ0aWZhY3QgPSBzZXR1cC5jZGtTdGFja0FydGlmYWN0T2Yoe1xuICAgIHRlbXBsYXRlOiB7XG4gICAgICBSZXNvdXJjZXM6IHtcbiAgICAgICAgRnVuYzoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLFxuICAgICAgICB9LFxuICAgICAgICBNYWNoaW5lOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyxcbiAgICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiB7XG4gICAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAnXCJSZXNvdXJjZVwiOiAnLFxuICAgICAgICAgICAgICAgICAgeyAnRm46OkdldEF0dCc6IFsnRnVuYycsICdBcm4nXSB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU3RhdGVNYWNoaW5lTmFtZTogJ215LW1hY2hpbmUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFdIRU5cbiAgc2V0dXAucHVzaFN0YWNrUmVzb3VyY2VTdW1tYXJpZXMoXG4gICAgc2V0dXAuc3RhY2tTdW1tYXJ5T2YoJ01hY2hpbmUnLCAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLCAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm15LW1hY2hpbmUnKSxcbiAgICBzZXR1cC5zdGFja1N1bW1hcnlPZignRnVuYycsICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCAnbXktZnVuYycpLFxuICApO1xuICBjb25zdCBkZXBsb3lTdGFja1Jlc3VsdCA9IGF3YWl0IGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIudHJ5SG90c3dhcERlcGxveW1lbnQoY2RrU3RhY2tBcnRpZmFjdCk7XG5cbiAgLy8gVEhFTlxuICBleHBlY3QoZGVwbG95U3RhY2tSZXN1bHQpLm5vdC50b0JlVW5kZWZpbmVkKCk7XG4gIGV4cGVjdChtb2NrVXBkYXRlTWFjaGluZURlZmluaXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICBkZWZpbml0aW9uOiAnXCJSZXNvdXJjZVwiOiBhcm46YXdzOmxhbWJkYTpoZXJlOjEyMzQ1Njc4OTAxMjpmdW5jdGlvbjpteS1mdW5jJyxcbiAgICBzdGF0ZU1hY2hpbmVBcm46ICdhcm46YXdzOnN0YXRlczpoZXJlOjEyMzQ1Njc4OTAxMjpzdGF0ZU1hY2hpbmU6bXktbWFjaGluZScsXG4gIH0pO1xufSk7XG5cbnRlc3QoXCJ3aWxsIG5vdCBwZXJmb3JtIGEgaG90c3dhcCBkZXBsb3ltZW50IGlmIGl0IGNhbm5vdCBmaW5kIGEgUmVmIHRhcmdldCAob3V0c2lkZSB0aGUgc3RhdGUgbWFjaGluZSdzIG5hbWUpXCIsIGFzeW5jICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgc2V0dXAuc2V0Q3VycmVudENmblN0YWNrVGVtcGxhdGUoe1xuICAgIFBhcmFtZXRlcnM6IHtcbiAgICAgIFBhcmFtMTogeyBUeXBlOiAnU3RyaW5nJyB9LFxuICAgIH0sXG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBNYWNoaW5lOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiB7XG4gICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgJ3sgUHJvcDogXCJvbGQtdmFsdWVcIiB9LCAnLFxuICAgICAgICAgICAgICAgICd7IFwiUGFyYW1cIiA6ICcsXG4gICAgICAgICAgICAgICAgeyAnRm46OlN1Yic6ICcke1BhcmFtMX0nIH0sXG4gICAgICAgICAgICAgICAgJyB9JyxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG4gIHNldHVwLnB1c2hTdGFja1Jlc291cmNlU3VtbWFyaWVzKHNldHVwLnN0YWNrU3VtbWFyeU9mKCdNYWNoaW5lJywgJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJywgJ215LW1hY2hpbmUnKSk7XG4gIGNvbnN0IGNka1N0YWNrQXJ0aWZhY3QgPSBzZXR1cC5jZGtTdGFja0FydGlmYWN0T2Yoe1xuICAgIHRlbXBsYXRlOiB7XG4gICAgICBQYXJhbWV0ZXJzOiB7XG4gICAgICAgIFBhcmFtMTogeyBUeXBlOiAnU3RyaW5nJyB9LFxuICAgICAgfSxcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBNYWNoaW5lOiB7XG4gICAgICAgICAgVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyxcbiAgICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiB7XG4gICAgICAgICAgICAgICdGbjo6Sm9pbic6IFtcbiAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgICAneyBQcm9wOiBcIm5ldy12YWx1ZVwiIH0sICcsXG4gICAgICAgICAgICAgICAgICAneyBcIlBhcmFtXCIgOiAnLFxuICAgICAgICAgICAgICAgICAgeyAnRm46OlN1Yic6ICcke1BhcmFtMX0nIH0sXG4gICAgICAgICAgICAgICAgICAnIH0nLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgYXdhaXQgZXhwZWN0KCgpID0+XG4gICAgaG90c3dhcE1vY2tTZGtQcm92aWRlci50cnlIb3Rzd2FwRGVwbG95bWVudChjZGtTdGFja0FydGlmYWN0KSxcbiAgKS5yZWplY3RzLnRvVGhyb3coL1BhcmFtZXRlciBvciByZXNvdXJjZSAnUGFyYW0xJyBjb3VsZCBub3QgYmUgZm91bmQgZm9yIGV2YWx1YXRpb24vKTtcbn0pO1xuXG50ZXN0KFwid2lsbCBub3QgcGVyZm9ybSBhIGhvdHN3YXAgZGVwbG95bWVudCBpZiBpdCBkb2Vzbid0IGtub3cgaG93IHRvIGhhbmRsZSBhIHNwZWNpZmljIGF0dHJpYnV0ZSAob3V0c2lkZSB0aGUgc3RhdGUgbWFjaGluZXMncyBuYW1lKVwiLCBhc3luYyAoKSA9PiB7XG4gIC8vIEdJVkVOXG4gIHNldHVwLnNldEN1cnJlbnRDZm5TdGFja1RlbXBsYXRlKHtcbiAgICBSZXNvdXJjZXM6IHtcbiAgICAgIEJ1Y2tldDoge1xuICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgIH0sXG4gICAgICBNYWNoaW5lOiB7XG4gICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICBEZWZpbml0aW9uU3RyaW5nOiB7XG4gICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICBbXG4gICAgICAgICAgICAgICAgJ3sgUHJvcDogXCJvbGQtdmFsdWVcIiB9LCAnLFxuICAgICAgICAgICAgICAgICd7IFwiUzNCdWNrZXRcIiA6ICcsXG4gICAgICAgICAgICAgICAgeyAnRm46OkdldEF0dCc6IFsnQnVja2V0JywgJ1Vua25vd25BdHRyaWJ1dGUnXSB9LFxuICAgICAgICAgICAgICAgICcgfScsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgU3RhdGVNYWNoaW5lTmFtZTogJ215LW1hY2hpbmUnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcbiAgc2V0dXAucHVzaFN0YWNrUmVzb3VyY2VTdW1tYXJpZXMoXG4gICAgc2V0dXAuc3RhY2tTdW1tYXJ5T2YoJ01hY2hpbmUnLCAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLCAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm15LW1hY2hpbmUnKSxcbiAgICBzZXR1cC5zdGFja1N1bW1hcnlPZignQnVja2V0JywgJ0FXUzo6UzM6OkJ1Y2tldCcsICdteS1idWNrZXQnKSxcbiAgKTtcbiAgY29uc3QgY2RrU3RhY2tBcnRpZmFjdCA9IHNldHVwLmNka1N0YWNrQXJ0aWZhY3RPZih7XG4gICAgdGVtcGxhdGU6IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBCdWNrZXQ6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyxcbiAgICAgICAgfSxcbiAgICAgICAgTWFjaGluZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgRGVmaW5pdGlvblN0cmluZzoge1xuICAgICAgICAgICAgICAnRm46OkpvaW4nOiBbXG4gICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgW1xuICAgICAgICAgICAgICAgICAgJ3sgUHJvcDogXCJuZXctdmFsdWVcIiB9LCAnLFxuICAgICAgICAgICAgICAgICAgJ3sgXCJTM0J1Y2tldFwiIDogJyxcbiAgICAgICAgICAgICAgICAgIHsgJ0ZuOjpHZXRBdHQnOiBbJ0J1Y2tldCcsICdVbmtub3duQXR0cmlidXRlJ10gfSxcbiAgICAgICAgICAgICAgICAgICcgfScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBTdGF0ZU1hY2hpbmVOYW1lOiAnbXktbWFjaGluZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gVEhFTlxuICBhd2FpdCBleHBlY3QoKCkgPT5cbiAgICBob3Rzd2FwTW9ja1Nka1Byb3ZpZGVyLnRyeUhvdHN3YXBEZXBsb3ltZW50KGNka1N0YWNrQXJ0aWZhY3QpLFxuICApLnJlamVjdHMudG9UaHJvdyhcIldlIGRvbid0IHN1cHBvcnQgdGhlICdVbmtub3duQXR0cmlidXRlJyBhdHRyaWJ1dGUgb2YgdGhlICdBV1M6OlMzOjpCdWNrZXQnIHJlc291cmNlLiBUaGlzIGlzIGEgQ0RLIGxpbWl0YXRpb24uIFBsZWFzZSByZXBvcnQgaXQgYXQgaHR0cHM6Ly9naXRodWIuY29tL2F3cy9hd3MtY2RrL2lzc3Vlcy9uZXcvY2hvb3NlXCIpO1xufSk7XG5cbnRlc3QoJ2tub3dzIGhvdyB0byBoYW5kbGUgYXR0cmlidXRlcyBvZiB0aGUgQVdTOjpFdmVudHM6OkV2ZW50QnVzIHJlc291cmNlJywgYXN5bmMgKCkgPT4ge1xuICAvLyBHSVZFTlxuICBzZXR1cC5zZXRDdXJyZW50Q2ZuU3RhY2tUZW1wbGF0ZSh7XG4gICAgUmVzb3VyY2VzOiB7XG4gICAgICBFdmVudEJ1czoge1xuICAgICAgICBUeXBlOiAnQVdTOjpFdmVudHM6OkV2ZW50QnVzJyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIE5hbWU6ICdteS1ldmVudC1idXMnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIE1hY2hpbmU6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIERlZmluaXRpb25TdHJpbmc6IHtcbiAgICAgICAgICAgICdGbjo6Sm9pbic6IFsnJywgW1xuICAgICAgICAgICAgICAne1wiRXZlbnRCdXMxQXJuXCI6XCInLFxuICAgICAgICAgICAgICB7ICdGbjo6R2V0QXR0JzogWydFdmVudEJ1cycsICdBcm4nXSB9LFxuICAgICAgICAgICAgICAnXCIsXCJFdmVudEJ1czFOYW1lXCI6XCInLFxuICAgICAgICAgICAgICB7ICdGbjo6R2V0QXR0JzogWydFdmVudEJ1cycsICdOYW1lJ10gfSxcbiAgICAgICAgICAgICAgJ1wiLFwiRXZlbnRCdXMxUmVmXCI6XCInLFxuICAgICAgICAgICAgICB7IFJlZjogJ0V2ZW50QnVzJyB9LFxuICAgICAgICAgICAgICAnXCJ9JyxcbiAgICAgICAgICAgIF1dLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgU3RhdGVNYWNoaW5lTmFtZTogJ215LW1hY2hpbmUnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcbiAgc2V0dXAucHVzaFN0YWNrUmVzb3VyY2VTdW1tYXJpZXMoXG4gICAgc2V0dXAuc3RhY2tTdW1tYXJ5T2YoJ0V2ZW50QnVzJywgJ0FXUzo6RXZlbnRzOjpFdmVudEJ1cycsICdteS1ldmVudC1idXMnKSxcbiAgKTtcbiAgY29uc3QgY2RrU3RhY2tBcnRpZmFjdCA9IHNldHVwLmNka1N0YWNrQXJ0aWZhY3RPZih7XG4gICAgdGVtcGxhdGU6IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBFdmVudEJ1czoge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OkV2ZW50czo6RXZlbnRCdXMnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIE5hbWU6ICdteS1ldmVudC1idXMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIE1hY2hpbmU6IHtcbiAgICAgICAgICBUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLFxuICAgICAgICAgIFByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIERlZmluaXRpb25TdHJpbmc6IHtcbiAgICAgICAgICAgICAgJ0ZuOjpKb2luJzogWycnLCBbXG4gICAgICAgICAgICAgICAgJ3tcIkV2ZW50QnVzMkFyblwiOlwiJyxcbiAgICAgICAgICAgICAgICB7ICdGbjo6R2V0QXR0JzogWydFdmVudEJ1cycsICdBcm4nXSB9LFxuICAgICAgICAgICAgICAgICdcIixcIkV2ZW50QnVzMk5hbWVcIjpcIicsXG4gICAgICAgICAgICAgICAgeyAnRm46OkdldEF0dCc6IFsnRXZlbnRCdXMnLCAnTmFtZSddIH0sXG4gICAgICAgICAgICAgICAgJ1wiLFwiRXZlbnRCdXMyUmVmXCI6XCInLFxuICAgICAgICAgICAgICAgIHsgUmVmOiAnRXZlbnRCdXMnIH0sXG4gICAgICAgICAgICAgICAgJ1wifScsXG4gICAgICAgICAgICAgIF1dLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFN0YXRlTWFjaGluZU5hbWU6ICdteS1tYWNoaW5lJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxuICAvLyBUSEVOXG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhvdHN3YXBNb2NrU2RrUHJvdmlkZXIudHJ5SG90c3dhcERlcGxveW1lbnQoY2RrU3RhY2tBcnRpZmFjdCk7XG5cbiAgZXhwZWN0KHJlc3VsdCkubm90LnRvQmVVbmRlZmluZWQoKTtcbiAgZXhwZWN0KG1vY2tVcGRhdGVNYWNoaW5lRGVmaW5pdGlvbikudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgIHN0YXRlTWFjaGluZUFybjogJ2Fybjphd3M6c3RhdGVzOmhlcmU6MTIzNDU2Nzg5MDEyOnN0YXRlTWFjaGluZTpteS1tYWNoaW5lJyxcbiAgICBkZWZpbml0aW9uOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBFdmVudEJ1czJBcm46ICdhcm46YXdzOmV2ZW50czpoZXJlOjEyMzQ1Njc4OTAxMjpldmVudC1idXMvbXktZXZlbnQtYnVzJyxcbiAgICAgIEV2ZW50QnVzMk5hbWU6ICdteS1ldmVudC1idXMnLFxuICAgICAgRXZlbnRCdXMyUmVmOiAnbXktZXZlbnQtYnVzJyxcbiAgICB9KSxcbiAgfSk7XG59KTtcblxudGVzdCgna25vd3MgaG93IHRvIGhhbmRsZSBhdHRyaWJ1dGVzIG9mIHRoZSBBV1M6OkR5bmFtb0RCOjpUYWJsZSByZXNvdXJjZScsIGFzeW5jICgpID0+IHtcbiAgLy8gR0lWRU5cbiAgc2V0dXAuc2V0Q3VycmVudENmblN0YWNrVGVtcGxhdGUoe1xuICAgIFJlc291cmNlczoge1xuICAgICAgVGFibGU6IHtcbiAgICAgICAgVHlwZTogJ0FXUzo6RHluYW1vREI6OlRhYmxlJyxcbiAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgIEtleVNjaGVtYTogW3tcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICduYW1lJyxcbiAgICAgICAgICAgIEtleVR5cGU6ICdIQVNIJyxcbiAgICAgICAgICB9XSxcbiAgICAgICAgICBBdHRyaWJ1dGVEZWZpbml0aW9uczogW3tcbiAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICduYW1lJyxcbiAgICAgICAgICAgIEF0dHJpYnV0ZVR5cGU6ICdTJyxcbiAgICAgICAgICB9XSxcbiAgICAgICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCcsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgTWFjaGluZToge1xuICAgICAgICBUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnLFxuICAgICAgICBQcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgRGVmaW5pdGlvblN0cmluZzogJ3t9JyxcbiAgICAgICAgICBTdGF0ZU1hY2hpbmVOYW1lOiAnbXktbWFjaGluZScsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuICBzZXR1cC5wdXNoU3RhY2tSZXNvdXJjZVN1bW1hcmllcyhcbiAgICBzZXR1cC5zdGFja1N1bW1hcnlPZignVGFibGUnLCAnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCAnbXktZHluYW1vZGItdGFibGUnKSxcbiAgKTtcbiAgY29uc3QgY2RrU3RhY2tBcnRpZmFjdCA9IHNldHVwLmNka1N0YWNrQXJ0aWZhY3RPZih7XG4gICAgdGVtcGxhdGU6IHtcbiAgICAgIFJlc291cmNlczoge1xuICAgICAgICBUYWJsZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OkR5bmFtb0RCOjpUYWJsZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgS2V5U2NoZW1hOiBbe1xuICAgICAgICAgICAgICBBdHRyaWJ1dGVOYW1lOiAnbmFtZScsXG4gICAgICAgICAgICAgIEtleVR5cGU6ICdIQVNIJyxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgQXR0cmlidXRlRGVmaW5pdGlvbnM6IFt7XG4gICAgICAgICAgICAgIEF0dHJpYnV0ZU5hbWU6ICduYW1lJyxcbiAgICAgICAgICAgICAgQXR0cmlidXRlVHlwZTogJ1MnLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgTWFjaGluZToge1xuICAgICAgICAgIFR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScsXG4gICAgICAgICAgUHJvcGVydGllczoge1xuICAgICAgICAgICAgRGVmaW5pdGlvblN0cmluZzoge1xuICAgICAgICAgICAgICAnRm46OkpvaW4nOiBbJycsIFtcbiAgICAgICAgICAgICAgICAne1wiVGFibGVOYW1lXCI6XCInLFxuICAgICAgICAgICAgICAgIHsgUmVmOiAnVGFibGUnIH0sXG4gICAgICAgICAgICAgICAgJ1wiLFwiVGFibGVBcm5cIjpcIicsXG4gICAgICAgICAgICAgICAgeyAnRm46OkdldEF0dCc6IFsnVGFibGUnLCAnQXJuJ10gfSxcbiAgICAgICAgICAgICAgICAnXCJ9JyxcbiAgICAgICAgICAgICAgXV0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgU3RhdGVNYWNoaW5lTmFtZTogJ215LW1hY2hpbmUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIC8vIFRIRU5cbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaG90c3dhcE1vY2tTZGtQcm92aWRlci50cnlIb3Rzd2FwRGVwbG95bWVudChjZGtTdGFja0FydGlmYWN0KTtcblxuICBleHBlY3QocmVzdWx0KS5ub3QudG9CZVVuZGVmaW5lZCgpO1xuICBleHBlY3QobW9ja1VwZGF0ZU1hY2hpbmVEZWZpbml0aW9uKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgc3RhdGVNYWNoaW5lQXJuOiAnYXJuOmF3czpzdGF0ZXM6aGVyZToxMjM0NTY3ODkwMTI6c3RhdGVNYWNoaW5lOm15LW1hY2hpbmUnLFxuICAgIGRlZmluaXRpb246IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIFRhYmxlTmFtZTogJ215LWR5bmFtb2RiLXRhYmxlJyxcbiAgICAgIFRhYmxlQXJuOiAnYXJuOmF3czpkeW5hbW9kYjpoZXJlOjEyMzQ1Njc4OTAxMjp0YWJsZS9teS1keW5hbW9kYi10YWJsZScsXG4gICAgfSksXG4gIH0pO1xufSk7XG4iXX0=