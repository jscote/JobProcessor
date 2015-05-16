/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function () {

    module.exports = {
        version: '0.1.1',
        processorName: 'TestProcessorWithContract',
        nodeType: 'CompensatedNode',
        parameters: {
            compensationNode: {nodeType: 'NoOpTaskNode'},
            startNode: {
                nodeType: 'TestWithContract',
                parameters: {
                    mapIn: {
                        "request.data.aTest": "somethingIn",
                        "request.data.bTest": "somethingInOut"
                    },
                    mapOut: {
                        "somethingOut": "data.aTest",
                        "somethingInOut": "data.bTest"
                    }
                }
            }
        }
    };


})();