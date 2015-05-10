/**
 * Created by jean-sebastiencote on 11/1/14.
 */

var q = require('q');
var util = require('util');
global.Injector = require('jsai-injector');
var p = require('path');

var Processor = require('../index').Processor;
var Arguments = require('../index').Arguments;
var Argument = require('../index').Argument;
var NodeFactory = require('../index').NodeFactory;
var TaskNode = require('../index').TaskNode;
var ConditionNode = require('../index').ConditionNode;
var LoopNode = require('../index').LoopNode;
var ExecutionContext = require('../index').ExecutionContext;

var RuleEngine = require('jsai-ruleengine/RuleEvaluator').RuleEngine;

Processor.config({processorPath: p.resolve(__dirname + '/../SampleProcessors/')});
RuleEngine.config({
    ruleSetPath: p.resolve(__dirname + '/../SampleRules/'),
    rulePath: p.resolve(__dirname + '/../SampleRules/')
});

var Person = function (age, gender, maritalStatus) {
    this.age = age;
    this.gender = gender;
    this.maritalStatus = maritalStatus
};

var msg = require('jsai-servicemessage');
msg.configure({
    messageCreatedHandler: function (messge) {
        console.log('message created');
    },
    messageUpdatedHandler: function (messge) {
        console.log('message updated');
    }
});

module.exports = {
    setUp: function (callback) {

        Injector.setBasePath(__dirname);

        Injector
            .register({dependency: '/TestClasses::TestTaskNode', name: 'TestTaskNode'})
            .register({dependency: '/TestClasses::Test2TaskNode', name: 'Test2TaskNode'})
            .register({dependency: '/TestClasses::Test3TaskNode', name: 'Test3TaskNode'})
            .register({dependency: '/TestClasses::Test4TaskNode', name: 'Test4TaskNode'})
            .register({dependency: '/TestClasses::TestLoopTaskNode', name: 'TestLoopTaskNode'})
            .register({dependency: '/TestClasses::TestConsoleLogTaskNode', name: 'TestConsoleLogTaskNode'})
            .register({dependency: '/TestClasses::Test2LoopTaskNode', name: 'Test2LoopTaskNode'})
            .register({
                dependency: '/TestClasses::TestRequestCancellationTaskNode',
                name: 'TestRequestCancellationTaskNode'
            })
            .register({
                dependency: '/TestClasses::TestPredecessorToLoopTaskNode',
                name: 'TestPredecessorToLoopTaskNode'
            })
            .register({dependency: '/TestClasses::TestSuccessorToLoopTaskNode', name: 'TestSuccessorToLoopTaskNode'})
            .register({
                dependency: '/TestClasses::TestCompensationToLoopTaskNode',
                name: 'TestCompensationToLoopTaskNode'
            });


        callback();
    },
    tearDown: function (callback) {
        // clean up
        callback();
    },
    t2estTaskNodeCanOnlyHaveANodeObjectSuccessor: function (test) {
        test.doesNotThrow(function () {
            var taskNode = NodeFactory.create('TaskNode', {successor: NodeFactory.create('TaskNode')});
        });

        test.throws(function () {
            var taskNode = NodeFactory.create('TaskNode', {successor: "something"});
        });

        test.done();
    },
    t3estConditionNodeHasMinimumRequirements: function (test) {

        test.doesNotThrow(function () {
            var conditionTask = NodeFactory.create('ConditionNode', {
                condition: {},
                trueSuccessor: NodeFactory.create('TaskNode')
            });
        });

        test.doesNotThrow(function () {
            var conditionTask = NodeFactory.create('ConditionNode', {
                condition: {},
                trueSuccessor: NodeFactory.create('TaskNode'),
                successor: NodeFactory.create('TaskNode')
            });

        });

        test.throws(function () {
            var conditionTask = NodeFactory.create('ConditionNode', {
                condition: {}
            });
        });

        test.throws(function () {
            var conditionTask = NodeFactory.create('ConditionNode');
        });
        test.done();
    },
    t4estCanInjectTaskNode: function (test) {

        var taskNode = Injector.resolve({target: 'TaskNode'});

        test.ok(taskNode);
        test.ok(taskNode instanceof TaskNode);

        test.done();
    },
    t5estCanInjectConditionNode: function (test) {
        var conditionNode = Injector.resolve({target: 'ConditionNode'})
        test.done();
    },
    t6estTaskCanExecute: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode");

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        taskNode.execute(context).then(function (responseContext) {
            test.ok(responseContext.data.length == 1);
            test.ok(responseContext.data[0] == "executed 1");

            test.ok(responseContext.request.data.length == 1, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 1");

            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });
    },
    testCanInjectIteratorNode: function (test) {
        var iteratorNode = Injector.resolve({target: "IteratorNode"});
        test.ok(iteratorNode);

        test.done();
    },
    testIteratorNode_WhenValidArrayIterator_IsInstantiated: function (test) {
        var iteratorNode = NodeFactory.create("IteratorNode", {
            iterator: [],
            successor: NodeFactory.create("NoOpTaskNode"),
            startNode: NodeFactory.create("NoOpTaskNode")
        });
        test.ok(iteratorNode);
        test.done();
    },
    testIteratorNode_WhenValidObjectIterator_IsInstantiated: function (test) {
        var iteratorNode = NodeFactory.create("IteratorNode", {
            iterator: {prop1: 'prop1', prop2: 'prop2'},
            successor: NodeFactory.create("NoOpTaskNode"),
            startNode: NodeFactory.create("NoOpTaskNode")
        });
        test.ok(iteratorNode);
        test.done();
    },
    testIteratorNode_WhenValidObjectFunctionIterator_IsInstantiated: function (test) {
        var iteratorNode = NodeFactory.create("IteratorNode", {
            iterator: new (function() {this.prop1 = "prop1", this.prop2 = "prop2"})(),
            successor: NodeFactory.create("NoOpTaskNode"),
            startNode: NodeFactory.create("NoOpTaskNode")
        });
        test.ok(iteratorNode);
        test.done();
    },
    testIteratorNode_WhenValidObjectFunctionIterator_CanExecute: function (test) {
        var iteratorNode = NodeFactory.create("IteratorNode", {
            iterator: "executionContext.request.data",
            startNode: NodeFactory.create("TestConsoleLogTaskNode"),
            successor: NodeFactory.create("TestConsoleLogTaskNode")
        });
        test.ok(iteratorNode);

        var request = {data: new (function() {this.prop1 = "prop1", this.prop2 = "prop2"})()};
        var context = new ExecutionContext({request: request});

        iteratorNode.execute(context).then(function(responseContext){
            test.ok(responseContext);
            test.ok(responseContext.data.steps[0] == "prop1");
            test.ok(responseContext.data.steps[1] == "prop2");

            test.ok(responseContext.isSuccess);
            test.ok(responseContext.errors.length == 0);

            test.done();
        });

        //test.done();
    },
    t7estTaskCanExecuteSequence: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode", {successor: NodeFactory.create('Test2TaskNode')});

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        taskNode.execute(context).then(function (responseContext) {
            test.ok(responseContext.data.length == 2);
            test.ok(responseContext.data[0] == "executed 1");
            test.ok(responseContext.data[1] == "executed 2");

            test.ok(responseContext.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 1");
            test.ok(responseContext.request.data[1] == "request data 2");

            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });

    },
    t8estTaskCanExecuteLongerSequence: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode",
            {
                successor: NodeFactory.create('Test2TaskNode',
                    {successor: NodeFactory.create('Test3TaskNode')})
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        taskNode.execute(context).then(function (responseContext) {
            test.ok(responseContext.data.length == 3);
            test.ok(responseContext.data[0] == "executed 1");
            test.ok(responseContext.data[1] == "executed 2");
            test.ok(responseContext.data[2] == "executed 3");

            test.ok(responseContext.request.data.length == 3, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 1");
            test.ok(responseContext.request.data[1] == "request data 2");
            test.ok(responseContext.request.data[2] == "request data 3");


            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });

    },
    t9estTaskCanTrapErrors: function (test) {
        var taskNode = NodeFactory.create("Test4TaskNode");

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        taskNode.execute(context).then(function (responseContext) {
            test.ok(responseContext.errors.length == 1);
            test.ok(responseContext.errors[0] == "Test Error");
            test.ok(responseContext.isSuccess == false);

            test.ok(responseContext.request.data.length == 0, "Unexpected number of items in request data");

            test.done();
        });

    },
    t10estTaskCanTrapErrorsInLongSequence: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode",
            {
                successor: NodeFactory.create('Test2TaskNode',
                    {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})})
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        taskNode.execute(context).then(function (responseContext) {
            test.ok(responseContext.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(responseContext.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(responseContext.isSuccess == false, "isSuccess should be false");

            test.ok(responseContext.data.length == 3);
            test.ok(responseContext.data[0] == "executed 1");
            test.ok(responseContext.data[1] == "executed 2");
            test.ok(responseContext.data[2] == "executed 3");

            test.ok(responseContext.request.data.length == 3, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 1");
            test.ok(responseContext.request.data[1] == "request data 2");
            test.ok(responseContext.request.data[2] == "request data 3");


            test.done();
        });

    },
    t11estTaskCanInstantiateConditional: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: true,
            successor: null,
            trueSuccessor: NodeFactory.create('TestTaskNode')
        });

        test.ok(node);
        test.done();
    },
    t12estTaskCanExecuteConditional: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return true
            },
            successor: null,
            trueSuccessor: NodeFactory.create('TestTaskNode')
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (responseContext) {

            test.ok(responseContext.data.length == 1);
            test.ok(responseContext.data[0] == "executed 1");

            test.ok(responseContext.request.data.length == 1, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 1");

            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });
    },
    t13estTaskCanExecuteConditionalWithSuccessor: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return true
            },
            successor: NodeFactory.create('Test2TaskNode'),
            trueSuccessor: NodeFactory.create('TestTaskNode')
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (responseContext) {

            test.ok(responseContext.data.length == 2, "Unexpected response items");
            test.ok(responseContext.data[0] == "executed 1");
            test.ok(responseContext.data[1] == "executed 2");

            test.ok(responseContext.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 1");
            test.ok(responseContext.request.data[1] == "request data 2");

            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });
    },
    t14estTaskCanExecuteFalseConditionalWithSuccessor: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return false;
            },
            successor: NodeFactory.create('Test2TaskNode'),
            trueSuccessor: NodeFactory.create('TestTaskNode'),
            falseSuccessor: NodeFactory.create('Test3TaskNode')
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (responseContext) {

            test.ok(responseContext.data.length == 2, "Unexpected response items");
            test.ok(responseContext.data[0] == "executed 3");
            test.ok(responseContext.data[1] == "executed 2");


            test.ok(responseContext.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(responseContext.request.data[0] == "request data 3");
            test.ok(responseContext.request.data[1] == "request data 2");

            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });
    },
    t15estTaskCanExecuteConditionalSequenceWithSuccessor: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return true;
            },
            successor: NodeFactory.create('Test2TaskNode'),
            trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')}),
            falseSuccessor: NodeFactory.create('Test3TaskNode')
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});


        node.execute(context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 2");

            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 2");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    t16estTaskCanExecuteStartPlusConditionalSequenceWithSuccessor: function (test) {

        var node = NodeFactory.create('Test3TaskNode',
            {
                successor: NodeFactory.create('ConditionNode',
                    {
                        condition: function () {
                            return true;
                        },
                        successor: NodeFactory.create('Test2TaskNode'),
                        trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')}),
                        falseSuccessor: NodeFactory.create('Test3TaskNode')
                    })
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 4, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 1");
            test.ok(context.data[2] == "executed 2");
            test.ok(context.data[3] == "executed 2");

            test.ok(response.request.data.length == 4, "Unexpected number of items in request data");
            test.ok(response.request.data[0] == "request data 3");
            test.ok(response.request.data[1] == "request data 1");
            test.ok(response.request.data[2] == "request data 2");
            test.ok(response.request.data[3] == "request data 2");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    t17estTaskCanExecuteStartPlusConditionalWithSuccessorAndErrorInTrueSuccessor: function (test) {
        var node = NodeFactory.create('Test3TaskNode',
            {
                successor: NodeFactory.create('ConditionNode',
                    {
                        condition: function () {
                            return true;
                        },
                        successor: NodeFactory.create('Test2TaskNode'),
                        trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test4TaskNode')}),
                        falseSuccessor: NodeFactory.create('Test3TaskNode')
                    })
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 1");

            test.ok(context.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 3");
            test.ok(context.request.data[1] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");


            test.done();
        });
    },
    t18estTaskCanExecuteStartPlusConditionalWithSuccessorAndErrorBeforeCondition: function (test) {
        var node = NodeFactory.create('Test4TaskNode',
            {
                successor: NodeFactory.create('ConditionNode',
                    {
                        condition: true,
                        successor: NodeFactory.create('Test2TaskNode'),
                        trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test4TaskNode')}),
                        falseSuccessor: NodeFactory.create('Test3TaskNode')
                    })
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.request.data.length == 0, "Unexpected number of items in request data");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");


            test.done();
        });
    },
    t19estTaskCanExecuteStartPlusConditionalWithSuccessorAndErrorSuccessor: function (test) {
        var node = NodeFactory.create('Test3TaskNode',
            {
                successor: NodeFactory.create('ConditionNode',
                    {
                        condition: function () {
                            return true;
                        },
                        successor: NodeFactory.create('Test4TaskNode'),
                        trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')}),
                        falseSuccessor: NodeFactory.create('Test3TaskNode')
                    })
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 1");
            test.ok(context.data[2] == "executed 2");

            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(context.request.data.length == 3, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 3");
            test.ok(context.request.data[1] == "request data 1");

            test.ok(context.request.data[2] == "request data 2");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == false, "isSuccess should be false");


            test.done();
        });
    },
    t20estTaskCanExecuteStartPlusConditionalWithSuccessorMissingFalseSuccessor: function (test) {
        var node = NodeFactory.create('Test3TaskNode',
            {
                successor: NodeFactory.create('ConditionNode',
                    {
                        condition: function () {
                            return false;
                        },
                        successor: NodeFactory.create('Test2TaskNode'),
                        trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')})
                    })
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (responseContext) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 2");


            test.ok(context.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 3");
            test.ok(context.request.data[1] == "request data 2");

            test.ok(responseContext.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(responseContext.isSuccess);

            test.done();
        });
    },
    t21estTaskCanExecuteStartPlusConditionalWithSuccessorMissingFalseSuccessorAndErrorInSuccessor: function (test) {
        var node = NodeFactory.create('Test3TaskNode',
            {
                successor: NodeFactory.create('ConditionNode',
                    {
                        condition: function () {
                            return false;
                        },
                        successor: NodeFactory.create('Test4TaskNode'),
                        trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')})
                    })
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 1, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");

            test.ok(context.request.data.length == 1, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 3");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    },
    t22estCompensatedTaskWithNoPredecessorAndNoSuccessorAndOneTaskNoError: function (test) {
        //expect to see only task executed

        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('TestTaskNode'),
                compensationNode: NodeFactory.create('Test2TaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 1, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");

            test.ok(context.request.data.length == 1, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 1");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);
            test.done();
        });

    },
    t23estCompensantedTaskWithNoPredecessorAndNoSuccessorOneTaskWithError: function (test) {

        //expect to see only compensated task executed

        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test4TaskNode'),
                compensationNode: NodeFactory.create('TestTaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 1, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");

            test.ok(context.request.data.length == 1, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == true, "isSuccess should be true");
            test.ok(response.isCompensated == true);

            test.done();
        });
    },
    t24estCompensantedTaskWithNoPredecessorAndNoSuccessorTwoTaskWithError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test4TaskNode')}),
                compensationNode: NodeFactory.create('TestTaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 1");


            test.ok(context.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 2");
            test.ok(context.request.data[1] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == true, "isSuccess should be true");
            test.ok(response.isCompensated == true);

            test.done();
        });
    },
    t25estCompensantedTaskWithNoPredecessorAndOneSuccessorOneTaskNoError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode'),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 3");

            test.ok(context.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 2");
            test.ok(context.request.data[1] == "request data 3");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    t26estCompensantedTaskWithNoPredecessorAndOneSuccessorOneTaskWithError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test4TaskNode')}),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 1");

            test.ok(context.request.data.length == 2, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 2");
            test.ok(context.request.data[1] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == true, "isSuccess should be true");
            test.ok(response.isCompensated == true);

            test.done();
        });
    },
    t27estCompensantedTaskWithNoPredecessorAndOneSuccessorTwoTaskNoError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode')}),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 3");
            test.ok(context.data[2] == "executed 3");

            test.ok(context.request.data.length == 3, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 2");
            test.ok(context.request.data[1] == "request data 3");
            test.ok(context.request.data[2] == "request data 3");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);
            //test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            //test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    },
    t28estCompensantedTaskWithNoPredecessorAndOneSuccessorTwoTaskWithError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 3");
            test.ok(context.data[2] == "executed 1");

            test.ok(context.request.data.length == 3, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 2");
            test.ok(context.request.data[1] == "request data 3");
            test.ok(context.request.data[2] == "request data 1");


            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == true, "isSuccess should be true");
            test.ok(response.isCompensated == true);

            test.done();
        });
    },
    t29estCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskNoError: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode')}),
                    compensationNode: NodeFactory.create('TestTaskNode'),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 4, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 3");

            test.ok(context.request.data.length == 4, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 1");
            test.ok(context.request.data[1] == "request data 2");
            test.ok(context.request.data[2] == "request data 3");
            test.ok(context.request.data[3] == "request data 3");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess, "isSuccess should be true");

            test.done();
        });
    },
    t30estCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskWithError: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    compensationNode: NodeFactory.create('TestTaskNode'),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 4, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 1");

            test.ok(context.request.data.length == 4, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 1");
            test.ok(context.request.data[1] == "request data 2");
            test.ok(context.request.data[2] == "request data 3");
            test.ok(context.request.data[3] == "request data 1");


            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == true, "isSuccess should be true");
            test.ok(response.isCompensated == true);

            test.done();
        });
    },
    t31estCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskWithError2Compensation: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    compensationNode: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')}),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 5, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 1");
            test.ok(context.data[4] == "executed 2");

            test.ok(context.request.data.length == 5, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 1");
            test.ok(context.request.data[1] == "request data 2");
            test.ok(context.request.data[2] == "request data 3");
            test.ok(context.request.data[3] == "request data 1");
            test.ok(context.request.data[4] == "request data 2");


            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == true, "isSuccess should be true");
            test.ok(response.isCompensated == true);

            test.done();
        });
    },
    t32estCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskWithError2CompensationWithError: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    compensationNode: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            test.ok(context.data.length == 5, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 1");
            test.ok(context.data[4] == "executed 2");

            test.ok(context.request.data.length == 5, "Unexpected number of items in request data");
            test.ok(context.request.data[0] == "request data 1");
            test.ok(context.request.data[1] == "request data 2");
            test.ok(context.request.data[2] == "request data 3");
            test.ok(context.request.data[3] == "request data 1");
            test.ok(context.request.data[4] == "request data 2");


            test.ok(response.errors.length == 2, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    },
    t33estLoopTaskNoPredecessorNoSuccessorShouldLoopTwice: function (test) {
        var node = NodeFactory.create('LoopNode', {
            startNode: NodeFactory.create('TestLoopTaskNode'),
            condition: function (fact) {
                return fact.request.data.index < 2;
            }
        });

        var request = {data: {index: 0}};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 2, "Unexpected response items");
                test.ok(context.data.steps[0] == "executed in loop");
                test.ok(context.data.steps[1] == "executed in loop");

                test.ok(context.request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    t34estLoopTaskwithPredecessorNoSuccessorShouldLoopTwice: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                startNode: NodeFactory.create('TestLoopTaskNode'),
                condition: function (fact) {
                    return fact.request.data.index < 2;
                }
            })
        });


        var request = {data: {index: 0}};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 3, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop");

                test.ok(context.request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    t35estLoopTaskwithPredecessorNoSuccessorAndLongSequenceShouldLoopTwice: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                startNode: NodeFactory.create('TestLoopTaskNode', {successor: NodeFactory.create('Test2LoopTaskNode')}),
                condition: function (fact) {
                    return fact.request.data.index < 2;
                }
            })
        });


        var request = {data: {index: 0}};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 5, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");
                test.ok(context.data.steps[3] == "executed in loop");
                test.ok(context.data.steps[4] == "executed in loop 2");

                test.ok(context.request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    t36estLoopTaskWithPredecessorAndSuccessorAndLongSequenceShouldLoopTwice: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                startNode: NodeFactory.create('TestLoopTaskNode', {successor: NodeFactory.create('Test2LoopTaskNode')}),
                condition: function (fact) {
                    return fact.request.data.index < 2;
                },
                successor: NodeFactory.create('TestSuccessorToLoopTaskNode')
            })
        });


        var request = {data: {index: 0}};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 6, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");
                test.ok(context.data.steps[3] == "executed in loop");
                test.ok(context.data.steps[4] == "executed in loop 2");
                test.ok(context.data.steps[5] == "passed in successor");

                test.ok(context.request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    t37estLoopTaskWithPredecessorAndSuccessorAndLongSequenceShouldStopOnError: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                startNode: NodeFactory.create('TestLoopTaskNode',
                    {
                        successor: NodeFactory.create('Test2LoopTaskNode',
                            {successor: NodeFactory.create('Test4TaskNode')})
                    }),
                condition: function (fact) {
                    return fact.request.data.index < 2;
                },
                successor: NodeFactory.create('TestSuccessorToLoopTaskNode')
            })
        });


        var request = {data: {index: 0}};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 3, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");

                test.ok(context.request.data.index == 1);


                test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == false, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    t38estLoopTaskWithPredecessorAndSuccessorAndLongSequenceShouldStopOnErrorWithCompensation: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                condition: function (fact) {
                    return fact.request.data.index < 2;
                },
                successor: NodeFactory.create('TestSuccessorToLoopTaskNode'),
                startNode: NodeFactory.create('CompensatedNode',
                    {
                        startNode: NodeFactory.create('TestLoopTaskNode',
                            {
                                successor: NodeFactory.create('Test2LoopTaskNode',
                                    {successor: NodeFactory.create('Test4TaskNode')})
                            }),
                        compensationNode: NodeFactory.create('TestCompensationToLoopTaskNode')

                    })
            })
        });


        var request = {data: {index: 0}};
        var context = new ExecutionContext({request: request});

        node.execute(context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 4, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");
                test.ok(context.data.steps[3] == "passed in compensation");

                test.ok(context.request.data.index == 1);


                test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be true");
                test.ok(response.isCompensated == true, "isCompensated should be true");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    t39estCanInstantiateProcessor: function (test) {

        var processor = Processor.getProcessor('testProcessor');

        test.ok(processor, "the processor is not instantiated");

        test.done();
    },
    t40estCanExecuteComplexProcessorWithError: function (test) {

        Processor.getProcessor('testProcessorWithError').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.data = {index: 0};

            processor.execute(request).then(function (response) {

                var p = processor;
                try {

                    test.ok(response.data.steps.length == 4, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "executed in loop");
                    test.ok(response.data.steps[2] == "executed in loop 2");
                    test.ok(response.data.steps[3] == "passed in compensation");

                    test.ok(request.data.index == 1);


                    test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == false, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    t41estCanExecuteComplexProcessor: function (test) {

        Processor.getProcessor('testProcessor').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.data = {index: 0};

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 6, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "executed in loop");
                    test.ok(response.data.steps[2] == "executed in loop 2");
                    test.ok(response.data.steps[3] == "executed in loop");
                    test.ok(response.data.steps[4] == "executed in loop 2");
                    test.ok(response.data.steps[5] == "passed in successor");

                    test.ok(request.data.index == 2);


                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    t43estCanExecuteComplexProcessorWithRuleEngine: function (test) {

        Processor.getProcessor('testProcessorWithRuleEngine').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.person = new Person(30, 'F', "Married");

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 4, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "executed in loop");
                    test.ok(response.data.steps[2] == "executed in loop 2");
                    test.ok(response.data.steps[3] == "passed in successor");


                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    t44estCanExecuteComplexProcessorWithLoopWithRuleEngine: function (test) {

        Processor.getProcessor('testProcessorWithLoopInRuleEngine').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.person = new Person(30, 'F', "Married");
            request.data.index = 0;

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 6, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "executed in loop");
                    test.ok(response.data.steps[2] == "executed in loop 2");
                    test.ok(response.data.steps[3] == "executed in loop");
                    test.ok(response.data.steps[4] == "executed in loop 2");
                    test.ok(response.data.steps[5] == "passed in successor");

                    test.ok(request.data.index == 2, 'Index is not correct');
                    console.log(request.data.index);

                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    t45estCanExecuteComplexProcessorWithLoopWithRuleEngineAndFalseConditiond: function (test) {

        Processor.getProcessor('testProcessorWithLoopInRuleEngine').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.person = new Person(30, 'M', "Married");
            request.data.index = 0;

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 2, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "passed in successor");

                    test.ok(request.data.index == 0, 'Index is not correct');
                    console.log(request.data.index);

                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    t46estCanExecuteComplexProcessorWithLoopWithRuleEngineAndFalseConditionWillLoopOnce: function (test) {

        Processor.getProcessor('testProcessorWithLoopInRuleEngine').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.person = new Person(30, 'F', "Married");
            request.data.changeAge = true;
            request.data.index = 0;

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 4, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "executed in loop");
                    test.ok(response.data.steps[2] == "executed in loop 2");
                    test.ok(response.data.steps[3] == "passed in successor");

                    test.ok(request.data.index == 1, 'Index is not correct');
                    console.log(request.data.index);

                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    t47estCanExecuteComplexProcessorWithLoopWithRuleEngineAndError: function (test) {

        Processor.getProcessor('testProcessorWithLoopInRuleEngineAndError').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.person = new Person(30, 'F', "Married");
            request.data.index = 0;

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 2, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "passed in successor");

                    test.ok(request.data.index == 0, 'Index is not correct');
                    console.log(request.data.index);

                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                    test.ok(response.isCompensated == false, "Should be compensated");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },
    testCanExecuteComplexProcessorWithCancellation: function (test) {

        Processor.getProcessor('testProcessorWithCancellation').then(function (processor) {

            var request = new processor.messaging.ServiceMessage();

            request.data = {index: 0};

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.steps.length == 3, "Unexpected response items");
                    test.ok(response.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.steps[1] == "executed in loop");
                    test.ok(response.data.steps[2] == "executed in loop 2");

                    test.ok(request.data.index == 1, "Index is expected to be 1");


                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });
        });
    },

    t42estLoad: function (test) {

        var promises = [];
        for (var i = 0; i < 1; i++) {
            Processor.getProcessor("testProcessor").then(function (processor) {
                var request = new processor.messaging.ServiceMessage();
                request.setCorrelationId();

                request.data = {index: 0};

                promises.push(processor.execute(request));

                if (i % 10 == 0) {
                    test.ok(Processor.Count > 0, 'Count is not greater than 0');
                }
            });

        }

        q.all(promises).then(function () {
            test.ok(Processor.Count == 0);
            test.done()
        })
    },

    testLoadInexistentProcessor: function (test) {
        Processor.getProcessor("invalid").then(function (processor) {
            test.ok(false, "should not be here");
        }).fail(function (error) {
            test.ok(true, 'expected failure of loading');
            test.done();
        })
    },
    testArgumentsCanBeCreated: function(test) {
        var args = new Arguments();
        test.ok(args);
        test.done();
    },
    testArgumentCanBeCreated: function(test) {
        var arg = new Argument({name: 'testArgument', direction: Argument.Direction.in, value: "test"});
        test.ok(arg.name=="testArgument", "Name is not set correctly");
        test.ok(arg.direction == Argument.Direction.in, "Direction is not set correctly");
        test.ok(arg.value == "test", "value is not set correctly");

        test.done();
    },
    testArgumentCannotBeCreatedWithInvalidDirection: function(test) {

        test.throws(function() {
            var arg = new Argument({name: 'testArgument', direction: "stuff", value: "test"});
        });
        test.done();


    },
    testArgumentWithoutDirectionWillBeInOut : function(test) {
        var arg = new Argument({name: 'testArgument', value: "test"});
        test.ok(arg.name=="testArgument", "Name is not set correctly");
        test.ok(arg.direction == Argument.Direction.inOut, "Direction is not set correctly");
        test.ok(arg.value == "test", "value is not set correctly");

        test.done();
    },
    testArgumentCanBeAddedToArguments: function(test) {
        var arg = new Argument({name: 'testArgument', value: "test"});
        var args= new Arguments();

        args.add(arg);
        test.ok(args.in.get("testArgument") == "test", "in argument set correctly");
        test.ok(args.out.get("testArgument") == "test", "out argument set correctly");

        test.done();
    }
};