/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function () {

    module.exports = {
        version: '0.1.1',
        processorName: 'TestProcessorWithError',
        nodeType: 'CompensatedNode',
        parameters: {
            compensationNode: {nodeType: 'NoOpTaskNode'},
            startNode: {
                nodeType: 'TestPredecessorToLoopTaskNode',
                parameters: {
                    successor: {
                        nodeType: 'LoopNode',
                        parameters: {
                            startNode: {
                                nodeType: 'CompensatedNode', parameters: {
                                    startNode: {
                                        nodeType: 'TestLoopTaskNode',
                                        parameters: {
                                            successor: {
                                                nodeType: 'Test2LoopTaskNode',
                                                parameters: {successor: {nodeType: 'Test4TaskNode'}}
                                            }
                                        }
                                    },
                                    compensationNode: {nodeType: 'TestCompensationToLoopTaskNode'}
                                }
                            },
                            condition: function (fact) {
                                return fact.request.data.index < 2;
                            },
                            successor: {nodeType: 'TestSuccessorToLoopTaskNode'}
                        }
                    }
                }
            }
        }
    };


})();