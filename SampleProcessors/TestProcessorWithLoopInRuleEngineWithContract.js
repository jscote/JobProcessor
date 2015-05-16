/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function () {

    module.exports = {
        version: '0.1.1',
        processorName: 'TestProcessorWithRuleEngineWithContract',
        nodeType: 'CompensatedNode',
        parameters: {
            compensationNode: {nodeType: 'NoOpTaskNode'},
            startNode: {
                nodeType: 'TestPredecessorToLoopTaskNodeWithContract',
                parameters: {
                    mapIn: {"request.data.steps": "steps"},
                    mapOut: {"steps": "data.stepsFromArguments"},
                    successor: {
                        nodeType: 'LoopNode',
                        parameters: {
                            startNode: {
                                nodeType: 'TestLoopTaskNodeWithContract',
                                parameters: {
                                    successor: {
                                        nodeType: 'Test2LoopTaskNodeWithContract', parameters: {
                                            mapIn: {"data.stepsFromArguments": "steps"},
                                            mapOut: {"steps": "data.stepsFromArguments"}
                                        }
                                    },
                                    mapIn: {"data.stepsFromArguments": "steps"},
                                    mapOut: {"steps": "data.stepsFromArguments"}
                                }
                            },
                            condition: ['CounterRuleSet', 'SomeTest'],
                            successor: {
                                nodeType: 'TestSuccessorToLoopTaskNodeWithContract', parameters: {
                                    mapIn: {"data.stepsFromArguments": "steps"},
                                    mapOut: {"steps": "data.stepsFromArguments"}
                                }
                            }
                        }
                    }
                }
            }
        }
    };


})();