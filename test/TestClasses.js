/**
 * Created by jean-sebastiencote on 11/2/14.
 */
(function (_, q, util, base) {

    var p = require('path');
    var ProcessorLoader = require(p.resolve(__dirname + '../../../server/lib/Processor')).ProcessorLoader;
    var NodeFactory = require(p.resolve(__dirname + '../../../server/lib/Processor')).NodeFactory;

    function TestTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestTaskNode';
    }

    util.inherits(TestTaskNode, base.TaskNode);

    TestTaskNode.prototype.handleRequest = function (request, context) {
        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {

            var response = new self.messaging.ServiceResponse();
            try {
                if (!Array.isArray(context.data)) context.data = [];
                context.data.push("executed 1");
            } catch (e) {
                console.log(e);
            }


            request.data.push("request data 1");


            dfd.resolve(response);
        });


        return dfd.promise;

    };

    function Test2TaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test2TaskNode';
    }

    util.inherits(Test2TaskNode, base.TaskNode);

    Test2TaskNode.prototype.handleRequest = function (request, context) {
        var response = new this.messaging.ServiceResponse();

        if (!Array.isArray(context.data)) context.data = [];
        context.data.push("executed 2");

        request.data.push("request data 2");

        return response;

    };

    function Test3TaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test3TaskNode';
    }

    util.inherits(Test3TaskNode, base.TaskNode);

    Test3TaskNode.prototype.handleRequest = function (request, context) {
        var response = new this.messaging.ServiceResponse();

        if (!Array.isArray(context.data)) context.data = [];
        context.data.push("executed 3");

        request.data.push("request data 3");

        return response;

    };

    function Test4TaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test4TaskNode';
    }

    util.inherits(Test4TaskNode, base.TaskNode);

    Test4TaskNode.prototype.handleRequest = function (request, context) {
        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {

            try {
                throw Error("Test Error");

                request.data.push("request data 4");
            }
            catch (e) {
                dfd.reject(e);
                return;
            }

            dfd.resolve();

        });


        return dfd.promise;


    };

    function TestLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestLoopTaskNode';
    }

    util.inherits(TestLoopTaskNode, base.TaskNode);

    TestLoopTaskNode.prototype.handleRequest = function (request, context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {
            var response = new self.messaging.ServiceResponse();

            request.data.index++;

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            if (!Array.isArray(context.data.steps)) context.data.steps = [];
            context.data.steps.push("executed in loop");

            return dfd.resolve(response);
        });

        return dfd.promise;

    };

    function Test2LoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test2LoopTaskNode';
    }

    util.inherits(Test2LoopTaskNode, base.TaskNode);

    Test2LoopTaskNode.prototype.handleRequest = function (request, context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {
            var response = new self.messaging.ServiceResponse();

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("executed in loop 2");

            return dfd.resolve(response);
        });

        return dfd.promise;

    };


    function TestPredecessorToLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestPredecessorToLoopTaskNode';
    }

    util.inherits(TestPredecessorToLoopTaskNode, base.TaskNode);

    TestPredecessorToLoopTaskNode.prototype.handleRequest = function (request, context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {
            var response = new self.messaging.ServiceResponse();

            if (_.isUndefined(context.data)) context.data = {};

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("passed in predecessor");


            return dfd.resolve(response);
        });

        return dfd.promise;

    };

    function TestCompensationToLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestCompensationToLoopTaskNode';
    }

    util.inherits(TestCompensationToLoopTaskNode, base.TaskNode);

    TestCompensationToLoopTaskNode.prototype.handleRequest = function (request, context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {
            var response = new self.messaging.ServiceResponse();

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("passed in compensation");


            return dfd.resolve(response);
        });

        return dfd.promise;

    };


    function TestSuccessorToLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestSuccessorToLoopTaskNode';
    }

    util.inherits(TestSuccessorToLoopTaskNode, base.TaskNode);

    TestSuccessorToLoopTaskNode.prototype.handleRequest = function (request, context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {
            var response = new self.messaging.ServiceResponse();

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("passed in successor");


            return dfd.resolve(response);
        });

        return dfd.promise;

    };

    var ProcessorTestLoader = function () {
        ProcessorLoader.call(this);
    };

    util.inherits(ProcessorTestLoader, ProcessorLoader);

    ProcessorTestLoader.prototype.load = function (processorName) {
        var testProcessor = {
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
                                    nodeType: 'TestLoopTaskNode',
                                    parameters: {successor: {nodeType: 'Test2LoopTaskNode'}}
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

        return testProcessor;

    };


    var ProcessorTestErrorLoader = function () {
        ProcessorLoader.call(this);
    };

    util.inherits(ProcessorTestErrorLoader, ProcessorLoader);

    ProcessorTestErrorLoader.prototype.load = function (processorName) {

        var testProcessor = {
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

        return testProcessor;



    };


    module.exports.TestTaskNode = TestTaskNode;
    module.exports.Test2TaskNode = Test2TaskNode;
    module.exports.Test3TaskNode = Test3TaskNode;
    module.exports.Test4TaskNode = Test4TaskNode;
    module.exports.TestLoopTaskNode = TestLoopTaskNode;
    module.exports.Test2LoopTaskNode = Test2LoopTaskNode;
    module.exports.TestPredecessorToLoopTaskNode = TestPredecessorToLoopTaskNode;
    module.exports.TestSuccessorToLoopTaskNode = TestSuccessorToLoopTaskNode;
    module.exports.TestCompensationToLoopTaskNode = TestCompensationToLoopTaskNode;
    module.exports.ProcessorTestLoader = ProcessorTestLoader;
    module.exports.ProcessorTestErrorLoader = ProcessorTestErrorLoader;

})(
    require('lodash'),
    require('q'),
    require('util'),
    require(Injector.getBasePath() + '/lib/Processor')
);