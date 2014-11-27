/**
 * Created by jean-sebastiencote on 11/1/14.
 */

var p = require('path');
var q = require('q');
var util = require('util');
require(p.resolve(__dirname + '../../../server/config/injection'))(p.resolve(__dirname + '../../../server/'));


var Processor = require(p.resolve(__dirname + '../../../server/lib/Processor')).Processor;
var ProcessorLoader = require(p.resolve(__dirname + '../../../server/lib/Processor')).ProcessorLoader;
var NodeFactory = require(p.resolve(__dirname + '../../../server/lib/Processor')).NodeFactory;
var TaskNode = require(p.resolve(__dirname + '../../../server/lib/Processor')).TaskNode;
var ConditionNode = require(p.resolve(__dirname + '../../../server/lib/Processor')).ConditionNode;
var LoopNode = require(p.resolve(__dirname + '../../../server/lib/Processor')).LoopNode;



module.exports = {
    setUp: function (callback) {
        /*Injector
         .register({dependency: '/lib/Processor::TaskNode', name: 'TaskNode'})
         .register({dependency: '/lib/Processor::ConditionNode', name: 'ConditionNode'})
         .register({dependency: '/lib/TestClasses::TestTaskNode', name: 'TestTaskNode'})
         .register({dependency: '/lib/TestClasses::Test2TaskNode', name: 'Test2TaskNode'})
         .register({dependency: '/lib/TestClasses::Test3TaskNode', name: 'Test3TaskNode'})
         .register({dependency: '/lib/TestClasses::Test4TaskNode', name: 'Test4TaskNode'});*/
        callback();
    },
    tearDown: function (callback) {
        // clean up
        callback();
    },
    testCanInstantiateProcessor: function (test) {
        var processor = new Processor();

        test.ok(processor, "Processor is not properly created");
        test.done();
    },
    testTaskNodeCanOnlyHaveANodeObjectSuccessor: function (test) {
        test.doesNotThrow(function () {
            var taskNode = NodeFactory.create('TaskNode', {successor: NodeFactory.create('TaskNode')});
        });

        test.throws(function () {
            var taskNode = NodeFactory.create('TaskNode', {successor: "something"});
        });

        test.done();
    },
    testConditionNodeHasMinimumRequirements: function (test) {

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
    testCanInjectTaskNode: function (test) {

        var taskNode = Injector.resolve({target: 'TaskNode'});

        test.ok(taskNode);
        test.ok(taskNode instanceof TaskNode);

        test.done();
    },
    testCanInjectConditionNode: function (test) {
        var conditionNode = Injector.resolve({target: 'ConditionNode'})
        test.done();
    },
    testTaskCanExecute: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode");

        var request = {data: []};
        var context = {data: undefined};

        taskNode.execute(request, context).then(function (response) {
            test.ok(context.data.length == 1);
            test.ok(context.data[0] == "executed 1");

            test.ok(request.data.length == 1, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteSequence: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode", {successor: NodeFactory.create('Test2TaskNode')});

        var request = {data: []};
        var context = {data: undefined};

        taskNode.execute(request, context).then(function (response) {
            test.ok(context.data.length == 2);
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");

            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });

    },
    testTaskCanExecuteLongerSequence: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode",
            {
                successor: NodeFactory.create('Test2TaskNode',
                    {successor: NodeFactory.create('Test3TaskNode')})
            });

        var request = {data: []};
        var context = {data: undefined};

        taskNode.execute(request, context).then(function (response) {
            test.ok(context.data.length == 3);
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");

            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 3");

            console.log(context.data.join(', '));

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });

    },
    testTaskCanTrapErrors: function (test) {
        var taskNode = NodeFactory.create("Test4TaskNode");

        var request = {data: []};
        var context = {data: undefined};

        taskNode.execute(request, context).then(function (response) {
            test.ok(response.errors.length == 1);
            test.ok(response.errors[0] == "Test Error");
            test.ok(response.isSuccess == false);

            test.ok(request.data.length == 0, "Unexpected number of items in request data");

            test.done();
        });

    },
    testTaskCanTrapErrorsInLongSequence: function (test) {
        var taskNode = NodeFactory.create("TestTaskNode",
            {
                successor: NodeFactory.create('Test2TaskNode',
                    {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})})
            });

        var request = {data: []};
        var context = {data: undefined};

        taskNode.execute(request, context).then(function (response) {
            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.ok(context.data.length == 3);
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");

            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 3");

            console.log(context.data.join(', '));

            test.done();
        });

    },
    testTaskCanInstantiateConditional: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: true,
            successor: null,
            trueSuccessor: NodeFactory.create('TestTaskNode')
        });

        test.ok(node);
        test.done();
    },
    testTaskCanExecuteConditional: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return true
            },
            successor: null,
            trueSuccessor: NodeFactory.create('TestTaskNode')
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 1);
            test.ok(context.data[0] == "executed 1");

            test.ok(request.data.length == 1, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteConditionalWithSuccessor: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return true
            },
            successor: NodeFactory.create('Test2TaskNode'),
            trueSuccessor: NodeFactory.create('TestTaskNode')
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteFalseConditionalWithSuccessor: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return false;
            },
            successor: NodeFactory.create('Test2TaskNode'),
            trueSuccessor: NodeFactory.create('TestTaskNode'),
            falseSuccessor: NodeFactory.create('Test3TaskNode')
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 2");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 3");
            test.ok(request.data[1] == "request data 2");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteConditionalSequenceWithSuccessor: function (test) {

        var node = NodeFactory.create('ConditionNode', {
            condition: function () {
                return true;
            },
            successor: NodeFactory.create('Test2TaskNode'),
            trueSuccessor: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')}),
            falseSuccessor: NodeFactory.create('Test3TaskNode')
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 2");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 2");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteStartPlusConditionalSequenceWithSuccessor: function (test) {

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
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 4, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 1");
            test.ok(context.data[2] == "executed 2");
            test.ok(context.data[3] == "executed 2");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 4, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 3");
            test.ok(request.data[1] == "request data 1");
            test.ok(request.data[2] == "request data 2");
            test.ok(request.data[3] == "request data 2");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteStartPlusConditionalWithSuccessorAndErrorInTrueSuccessor: function (test) {
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
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 1");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 3");
            test.ok(request.data[1] == "request data 1");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");


            test.done();
        });
    },
    testTaskCanExecuteStartPlusConditionalWithSuccessorAndErrorBeforeCondition: function (test) {
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
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(request.data.length == 0, "Unexpected number of items in request data");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");


            test.done();
        });
    },
    testTaskCanExecuteStartPlusConditionalWithSuccessorAndErrorSuccessor: function (test) {
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
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 1");
            test.ok(context.data[2] == "executed 2");

            console.log(context.data.join(', '));


            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 3");
            test.ok(request.data[1] == "request data 1");

            test.ok(request.data[2] == "request data 2");

            console.log(request.data.join(', '));
            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == false, "isSuccess should be false");


            test.done();
        });
    },
    testTaskCanExecuteStartPlusConditionalWithSuccessorMissingFalseSuccessor: function (test) {
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
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");
            test.ok(context.data[1] == "executed 2");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 3");
            test.ok(request.data[1] == "request data 2");

            console.log(request.data.join(', '));

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    },
    testTaskCanExecuteStartPlusConditionalWithSuccessorMissingFalseSuccessorAndErrorInSuccessor: function (test) {
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
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 1, "Unexpected response items");
            test.ok(context.data[0] == "executed 3");

            console.log(context.data.join(', '));


            test.ok(request.data.length == 1, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 3");

            console.log(request.data.join(', '));
            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensatedTaskWithNoPredecessorAndNoSuccessorAndOneTaskNoError: function (test) {
        //expect to see only task executed

        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('TestTaskNode'),
                compensationNode: NodeFactory.create('Test2TaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 1, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");

            test.ok(request.data.length == 1, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);
            test.done();
        });

    }
    ,
    testCompensantedTaskWithNoPredecessorAndNoSuccessorOneTaskWithError: function (test) {

        //expect to see only compensated task executed

        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test4TaskNode'),
                compensationNode: NodeFactory.create('TestTaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 1, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");

            test.ok(request.data.length == 1, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithNoPredecessorAndNoSuccessorTwoTaskWithError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test4TaskNode')}),
                compensationNode: NodeFactory.create('TestTaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 1");


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 2");
            test.ok(request.data[1] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithNoPredecessorAndOneSuccessorOneTaskNoError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode'),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 3");


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 2");
            test.ok(request.data[1] == "request data 3");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);

            test.done();
        });
    }
    ,
    testCompensantedTaskWithNoPredecessorAndOneSuccessorOneTaskWithError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test4TaskNode')}),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 2, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 1");


            test.ok(request.data.length == 2, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 2");
            test.ok(request.data[1] == "request data 1");

            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithNoPredecessorAndOneSuccessorTwoTaskNoError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode')}),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 3");
            test.ok(context.data[2] == "executed 3");


            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 2");
            test.ok(request.data[1] == "request data 3");
            test.ok(request.data[2] == "request data 3");

            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess);
            //test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            //test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithNoPredecessorAndOneSuccessorTwoTaskWithError: function (test) {
        var node = NodeFactory.create('CompensatedNode',
            {
                startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                compensationNode: NodeFactory.create('TestTaskNode'),
                successor: NodeFactory.create('Test3TaskNode')
            });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 3, "Unexpected response items");
            test.ok(context.data[0] == "executed 2");
            test.ok(context.data[1] == "executed 3");
            test.ok(context.data[2] == "executed 1");


            test.ok(request.data.length == 3, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 2");
            test.ok(request.data[1] == "request data 3");
            test.ok(request.data[2] == "request data 1");


            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.errors[0] == "Test Error", "Didn't get expected error message");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskNoError: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode')}),
                    compensationNode: NodeFactory.create('TestTaskNode'),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 4, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 3");


            test.ok(request.data.length == 4, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 3");
            test.ok(request.data[3] == "request data 3");


            test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess, "isSuccess should be true");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskWithError: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    compensationNode: NodeFactory.create('TestTaskNode'),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 4, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 1");


            test.ok(request.data.length == 4, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 3");
            test.ok(request.data[3] == "request data 1");


            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    },
    testCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskWithError2Compensation: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    compensationNode: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode')}),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 5, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 1");
            test.ok(context.data[4] == "executed 2");


            test.ok(request.data.length == 5, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 3");
            test.ok(request.data[3] == "request data 1");
            test.ok(request.data[4] == "request data 2");


            test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testCompensantedTaskWithPredecessorAndOneSuccessorTwoTaskWithError2CompensationWithError: function (test) {
        var node = NodeFactory.create('TestTaskNode', {
            successor: NodeFactory.create('CompensatedNode',
                {
                    startNode: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test3TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    compensationNode: NodeFactory.create('TestTaskNode', {successor: NodeFactory.create('Test2TaskNode', {successor: NodeFactory.create('Test4TaskNode')})}),
                    successor: NodeFactory.create('Test3TaskNode')
                })
        });

        var request = {data: []};
        var context = {data: undefined};

        node.execute(request, context).then(function (response) {

            test.ok(context.data.length == 5, "Unexpected response items");
            test.ok(context.data[0] == "executed 1");
            test.ok(context.data[1] == "executed 2");
            test.ok(context.data[2] == "executed 3");
            test.ok(context.data[3] == "executed 1");
            test.ok(context.data[4] == "executed 2");


            test.ok(request.data.length == 5, "Unexpected number of items in request data");
            test.ok(request.data[0] == "request data 1");
            test.ok(request.data[1] == "request data 2");
            test.ok(request.data[2] == "request data 3");
            test.ok(request.data[3] == "request data 1");
            test.ok(request.data[4] == "request data 2");


            test.ok(response.errors.length == 2, "Errors doesn't have expected number of items");
            test.ok(response.isSuccess == false, "isSuccess should be false");

            test.done();
        });
    }
    ,
    testLoopTaskNoPredecessorNoSuccessorShouldLoopTwice: function (test) {
        var node = NodeFactory.create('LoopNode', {
            startNode: NodeFactory.create('TestLoopTaskNode'),
            condition: function (fact) {
                return fact.request.data.index < 2;
            }
        });

        var request = {data: {index: 0}};
        var context = {data: {}};

        node.execute(request, context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 2, "Unexpected response items");
                test.ok(context.data.steps[0] == "executed in loop");
                test.ok(context.data.steps[1] == "executed in loop");

                test.ok(request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    }
    ,
    testLoopTaskwithPredecessorNoSuccessorShouldLoopTwice: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                startNode: NodeFactory.create('TestLoopTaskNode'),
                condition: function (fact) {
                    return fact.request.data.index < 2;
                }
            })
        });


        var request = {data: {index: 0}};
        var context = {data: {}};

        node.execute(request, context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 3, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop");

                test.ok(request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    }
    ,
    testLoopTaskwithPredecessorNoSuccessorAndLongSequenceShouldLoopTwice: function (test) {
        var node = NodeFactory.create('TestPredecessorToLoopTaskNode', {
            successor: NodeFactory.create('LoopNode', {
                startNode: NodeFactory.create('TestLoopTaskNode', {successor: NodeFactory.create('Test2LoopTaskNode')}),
                condition: function (fact) {
                    return fact.request.data.index < 2;
                }
            })
        });


        var request = {data: {index: 0}};
        var context = {data: {}};

        node.execute(request, context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 5, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");
                test.ok(context.data.steps[3] == "executed in loop");
                test.ok(context.data.steps[4] == "executed in loop 2");

                test.ok(request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    }
    ,
    testLoopTaskWithPredecessorAndSuccessorAndLongSequenceShouldLoopTwice: function (test) {
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
        var context = {data: {}};

        node.execute(request, context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 6, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");
                test.ok(context.data.steps[3] == "executed in loop");
                test.ok(context.data.steps[4] == "executed in loop 2");
                test.ok(context.data.steps[5] == "passed in successor");

                test.ok(request.data.index == 2);


                test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == true, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    }
    ,
    testLoopTaskWithPredecessorAndSuccessorAndLongSequenceShouldStopOnError: function (test) {
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
        var context = {data: {}};

        node.execute(request, context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 3, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");

                test.ok(request.data.index == 1);


                test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == false, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    }
    ,
    testLoopTaskWithPredecessorAndSuccessorAndLongSequenceShouldStopOnErrorWithCompensation: function (test) {
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
        var context = {data: {}};

        node.execute(request, context).then(function (response) {

            try {
                test.ok(context.data.steps.length == 4, "Unexpected response items");
                test.ok(context.data.steps[0] == "passed in predecessor");
                test.ok(context.data.steps[1] == "executed in loop");
                test.ok(context.data.steps[2] == "executed in loop 2");
                test.ok(context.data.steps[3] == "passed in compensation");

                test.ok(request.data.index == 1);


                test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == false, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    },
    testCanInstantiateProcessor: function(test) {
        Injector.register({dependency: '/lib/TestClasses::ProcessorTestLoader', name: 'processorLoader'})

        var processor = Processor.getProcessor('testProcessor');

        test.ok(processor, "the processor is not instantiated");

        test.done();
    },
    testCanExecuteComplexProcessorWithError: function (test) {
        Injector.register({dependency: '/lib/TestClasses::ProcessorTestErrorLoader', name: 'processorLoader'})


        var processor = Processor.getProcessor('testProcessorWithError');

        var request = new processor.messaging.ServiceMessage();

        request.data = {index: 0};

        processor.execute(request).then(function (response) {

            var p = processor;
            try {

                test.ok(response.data.data.steps.length == 4, "Unexpected response items");
                test.ok(response.data.data.steps[0] == "passed in predecessor");
                test.ok(response.data.data.steps[1] == "executed in loop");
                test.ok(response.data.data.steps[2] == "executed in loop 2");
                test.ok(response.data.data.steps[3] == "passed in compensation");

                test.ok(request.data.index == 1);


                test.ok(response.errors.length == 1, "Errors doesn't have expected number of items");
                test.ok(response.isSuccess == false, "isSuccess should be false");
            } catch (e) {
                test.ok(false, "Error while executing");
                console.log(e.message);
            }


            test.done();
        });
    }
    ,
    testCanExecuteComplexProcessor: function (test) {
        Injector.register({dependency: '/lib/TestClasses::ProcessorTestLoader', name: 'processorLoader'})

        var processor = Processor.getProcessor('testProcessor');

        var request = new processor.messaging.ServiceMessage();

        request.data = {index: 0};

            processor.execute(request).then(function (response) {
                var p = processor;
                try {
                    test.ok(response.data.data.steps.length == 6, "Unexpected response items");
                    test.ok(response.data.data.steps[0] == "passed in predecessor");
                    test.ok(response.data.data.steps[1] == "executed in loop");
                    test.ok(response.data.data.steps[2] == "executed in loop 2");
                    test.ok(response.data.data.steps[3] == "executed in loop");
                    test.ok(response.data.data.steps[4] == "executed in loop 2");
                    test.ok(response.data.data.steps[5] == "passed in successor");

                    test.ok(request.data.index == 2);


                    test.ok(response.errors.length == 0, "Errors doesn't have expected number of items");
                    test.ok(response.isSuccess == true, "isSuccess should be false");
                } catch (e) {
                    test.ok(false, "Error while executing");
                    console.log(e.message);
                }


                test.done();
            });

    },
    testLoad: function(test)
    {
        Injector.register({dependency: '/lib/TestClasses::ProcessorTestLoader', name: 'processorLoader'})


        var promises = [];
        for(var i=0;i<10;i++){
            var processor = Processor.getProcessor("testProcessor");
            var request = new processor.messaging.ServiceMessage();
            request.SetCorrelationId();

            request.data = {index: 0};

            promises.push(processor.execute(request));

        }

        q.all(promises).then(function(){ test.done()})
    }
};