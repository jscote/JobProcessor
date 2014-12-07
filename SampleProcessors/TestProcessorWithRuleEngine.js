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
            compensationNode: {nodeType: 'NoOpTaskNode'},
            startNode: {
                nodeType: 'TestPredecessorToLoopTaskNode',
                parameters: {
                    successor: {
                        nodeType: 'ConditionNode',
                        parameters: {
                            trueSuccessor: {
                                nodeType: 'TestLoopTaskNode',
                                parameters: {successor: {nodeType: 'Test2LoopTaskNode'}}
                            },
                            condition: 'SomeTest',
                            successor: {nodeType: 'TestSuccessorToLoopTaskNode'}
                        }
                    }
                }
            }
        }
    };


})();