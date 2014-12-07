/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function () {

    module.exports = {
        version: '0.1.1',
        processorName: 'TestProcessorWithRuleEngine',
        nodeType: 'CompensatedNode',
        parameters: {
            compensationNode: {nodeType: 'TestCompensationToLoopTaskNode'},
            startNode: {
                nodeType: 'TestPredecessorToLoopTaskNode',
                parameters: {
                    successor: {
                        nodeType: 'LoopNode',
                        parameters: {
                            startNode: {
                                nodeType: 'TestLoopTaskNode',
                                parameters: {successor: {nodeType: 'Test2LoopTaskNode'}}
                            },
                            condition: ['CounterRuleSet', 'SomeTestWithError'],
                            successor: {nodeType: 'TestSuccessorToLoopTaskNode'}
                        }
                    }
                }
            }
        }
    };


})();