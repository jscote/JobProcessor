/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function () {

    module.exports = {
        version: '0.1.1',
        processorName: 'TestProcessorWithCancellation',
        nodeType: 'CompensatedNode',
        parameters: {
            compensationNode: {nodeType: 'TestLoopTaskNode'},
            startNode: {
                nodeType: 'TestPredecessorToLoopTaskNode',
                parameters: {
                    successor: {
                        nodeType: 'LoopNode',
                        parameters: {
                            startNode: {
                                nodeType: 'TestLoopTaskNode',
                                parameters: {
                                    successor: {
                                        nodeType: 'Test2LoopTaskNode',
                                        parameters: {
                                            successor: {
                                                nodeType: 'TestRequestCancellationTaskNode'
                                            }
                                        }
                                    }
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