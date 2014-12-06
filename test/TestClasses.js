/**
 * Created by jean-sebastiencote on 11/2/14.
 */
(function (_, q, util, base) {

    var p = require('path');
    var ProcessorLoader = require('../Processor').ProcessorLoader;
    var NodeFactory = require('../Processor').NodeFactory;

    function TestTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestTaskNode';
    }

    util.inherits(TestTaskNode, base.TaskNode);

    TestTaskNode.prototype.handleRequest = function (context) {
        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {

            try {
                if (!Array.isArray(context.data)) context.data = [];
                context.data.push("executed 1");
            } catch (e) {
                console.log(e);
            }


            context.request.data.push("request data 1");


            dfd.resolve(context);
        });


        return dfd.promise;

    };

    function Test2TaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test2TaskNode';
    }

    util.inherits(Test2TaskNode, base.TaskNode);

    Test2TaskNode.prototype.handleRequest = function (context) {

        if (!Array.isArray(context.data)) context.data = [];
        context.data.push("executed 2");

        context.request.data.push("request data 2");

        return context;

    };

    function Test3TaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test3TaskNode';
    }

    util.inherits(Test3TaskNode, base.TaskNode);

    Test3TaskNode.prototype.handleRequest = function (context) {

        if (!Array.isArray(context.data)) context.data = [];
        context.data.push("executed 3");

        context.request.data.push("request data 3");

        return context;

    };

    function Test4TaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test4TaskNode';
    }

    util.inherits(Test4TaskNode, base.TaskNode);

    Test4TaskNode.prototype.handleRequest = function (context) {
        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {

            try {
                throw Error("Test Error");

                context.request.data.push("request data 4");
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

    TestLoopTaskNode.prototype.handleRequest = function (context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {

            context.request.data.index++;

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            if (!Array.isArray(context.data.steps)) context.data.steps = [];
            context.data.steps.push("executed in loop");

            return dfd.resolve(context);
        });

        return dfd.promise;

    };

    function Test2LoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'Test2LoopTaskNode';
    }

    util.inherits(Test2LoopTaskNode, base.TaskNode);

    Test2LoopTaskNode.prototype.handleRequest = function (context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("executed in loop 2");

            return dfd.resolve(context);
        });

        return dfd.promise;

    };


    function TestPredecessorToLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestPredecessorToLoopTaskNode';
    }

    util.inherits(TestPredecessorToLoopTaskNode, base.TaskNode);

    TestPredecessorToLoopTaskNode.prototype.handleRequest = function (context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {

            if (_.isUndefined(context.data)) context.data = {};

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("passed in predecessor");


            return dfd.resolve(context);
        });

        return dfd.promise;

    };

    function TestCompensationToLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestCompensationToLoopTaskNode';
    }

    util.inherits(TestCompensationToLoopTaskNode, base.TaskNode);

    TestCompensationToLoopTaskNode.prototype.handleRequest = function (context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("passed in compensation");


            return dfd.resolve(context);
        });

        return dfd.promise;

    };


    function TestSuccessorToLoopTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestSuccessorToLoopTaskNode';
    }

    util.inherits(TestSuccessorToLoopTaskNode, base.TaskNode);

    TestSuccessorToLoopTaskNode.prototype.handleRequest = function (context) {

        var self = this;
        var dfd = q.defer();

        process.nextTick(function () {
            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            context.data.steps.push("passed in successor");


            return dfd.resolve(context);
        });

        return dfd.promise;

    };

    var ProcessorTestLoader = function () {
        ProcessorLoader.call(this);
    };

    util.inherits(ProcessorTestLoader, ProcessorLoader);

    ProcessorTestLoader.prototype.load = function (processorName) {
        var testProcessor = {
            version: '0.1.1',
            processorName: 'TestProcessor',
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
    require(__dirname + '../../Processor')
);