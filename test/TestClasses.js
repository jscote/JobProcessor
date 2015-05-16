/**
 * Created by jean-sebastiencote on 11/2/14.
 */
(function (_, q, util, base) {

    var TaskContract = require('jsai-contract').Contract;
    var Argument = require('jsai-contract').Argument;

    function TestTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestTaskNode';

        this.contract = new TaskContract(
            [
                {name: "something", direction: Argument.Direction.in},
                {name: "somethingElse", direction: Argument.Direction.inOut},
                {name: "somethingOut", direction: Argument.Direction.out}
            ]);
    }

    util.inherits(TestTaskNode, base.TaskNode);

    TestTaskNode.prototype.handleRequest = function (context) {
        var dfd = q.defer();

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

        var dfd = q.defer();

        process.nextTick(function () {

            context.request.data.index++;

            if (_.isUndefined(context.data.steps)) {
                context.data.steps = [];
            }

            if(!_.isUndefined(context.request.person) && !_.isUndefined(context.request.data.changeAge) && context.request.data.changeAge == true) {
                context.request.person.age = 60;
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

    function TestRequestCancellationTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestSuccessorToLoopTaskNode';
    }

    util.inherits(TestRequestCancellationTaskNode, base.TaskNode);

    TestRequestCancellationTaskNode.prototype.handleRequest = function (context) {

        var dfd = q.defer();

        process.nextTick(function () {
            context.requestCancellation();
            return dfd.resolve(context);
        });

        return dfd.promise;

    };

    function TestConsoleLogTaskNode(serviceMessage) {
        base.TaskNode.call(this, serviceMessage);
        this.name = 'TestConsoleLogTaskNode';
    }

    util.inherits(TestConsoleLogTaskNode, base.TaskNode);

    TestConsoleLogTaskNode.prototype.handleRequest = function (context) {

        var dfd = q.defer();

        if (_.isUndefined(context.data)) context.data = {};

        if (_.isUndefined(context.data.steps)) {
            context.data.steps = [];
        }

        process.nextTick(function () {
            console.log(context.currentIteration);
            context.data.steps.push(context.currentIteration);
            return dfd.resolve(context);
        });

        return dfd.promise;

    };

    var fReWrittenCondition = function (evalContext) {
        var dfd = q.defer();

        var provider = Injector.resolve({target: 'votingCombinationProvider'});

        var id = evalContext.in.get("votingDescriptorId");

        provider.getVotingCombinationByVotingDescriptorId(id).then(function (combinations) {
            if (combinations.length == 0) {
                evalContext.fact.out.set("rejectionReason", "voting descriptor invalid - combination not found");
                dfd.resolve({isTrue: false});
                return;
            }
            var descriptors = combinations[0].getVotingDescriptors({votingDescriptorId: id});
            if (descriptors.length == 0) {
                evalContext.fact.out.set("rejectionReason", "voting descriptor invalid - descriptor not found");
                dfd.resolve({isTrue: false});
                return;
            }

            var descriptor = descriptors[0];

            var hierarchyProvider = Injector.resolve({target: 'votingHierarchyProvider'});

            hierarchyProvider.getVotingHierarchyById(combinations[0].votingHierarchyId).then(function (votingHierarchy) {

                if (votingHierarchy != null) {
                    var levels = _.filter(votingHierarchy.getLevels({level: descriptor.level}), _.matches({descriptor: descriptor.votingDescriptorId.split('-')[0]}));
                    if (levels.length > 0 && levels[0].isVotable === true) {
                        evalContext.fact.out.set("votingHierarchy", votingHierarchy);
                        evalContext.fact.out.set("votingDescriptor", descriptor);
                        evalContext.fact.out.set("votingCombination", combinations[0]);
                        dfd.resolve({isTrue: true});
                    } else {
                        evalContext.fact.out.set("rejectionReason", "voting descriptor invalid - level not found or doesn't accept vote");
                        dfd.resolve({isTrue: false});
                    }
                }

            }).fail(function (error) {
                evalContext.fact.out.set("rejectionReason", "voting descriptor invalid - error: " + error);
                dfd.resolve({isTrue: false});
            });
        }).fail(function (error) {
            evalContext.fact.out.set("rejectionReason", "voting descriptor invalid - error: " + error);
            dfd.resolve({isTrue: false});
        });

        return dfd.promise;
    };


    originalFunction = function (context) {
        var dfd = q.defer();
        var self = this;

        //If the vote is rejected because of an invalid voting descriptor, a lot will be missing for saving
        try {
            var obj = this.provider.create();
            obj.setFromVotingCombination({
                voteId: context.currentIteration.voteId,
                voterId: context.request.data.voterId,
                votingCombination: context.currentIteration.votingCombination
            });
            q.all(self.provider.save(obj)).then(function () {
                console.log("saved");
                dfd.resolve(context);
            }).fail(function (error) {
                dfd.reject(error);
            });


        }
        catch (error) {
            dfd.reject(error);
            console.log(error);
        } finally {
            return dfd.promise;
        }

    };

    ReWrittenhandleRequest = function (arguments) {
        var dfd = q.defer();
        var self = this;

        //If the vote is rejected because of an invalid voting descriptor, a lot will be missing for saving
        try {
            var obj = this.provider.create();
            obj.setFromVotingCombination({
                voteId: arguments.in.get("voteId"),
                voterId: arguments.in.get("voterId"),
                votingCombination: arguments.in.get("votingCombination")
            });
            q.all(self.provider.save(obj)).then(function () {
                console.log("saved");
                dfd.resolve(arguments);
            }).fail(function (error) {
                dfd.reject(error);
            });


        }
        catch (error) {
            dfd.reject(error);
            console.log(error);
        } finally {
            return dfd.promise;
        }

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
    module.exports.TestRequestCancellationTaskNode = TestRequestCancellationTaskNode;
    module.exports.TestConsoleLogTaskNode = TestConsoleLogTaskNode;

})(
    require('lodash'),
    require('q'),
    require('util'),
    require(__dirname + '../../index')
);