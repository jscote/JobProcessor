/**
 * Created by jean-sebastiencote on 11/1/14.
 */
(function (util, _, q, process, log4js, Injector, serviceMessage, ruleEngineModule) {

    'use strict';
    /*
     Expected hierarchy of objects to deal with in the execution of a process. It all starts with a BlockNode, which will
     contain one or more child nodes.

     Node is an abstract class and has a successor. If successor is Null, no more processing forward. It also has a default
     ^    implementation of Execute, which just calls the successor if present
     |
     |
     |--TaskNode - has a HandleRequest method or something like that to do actual work
     |--ConditionNode - has a true successor, which is mandatory and a false successor, which is optional. The
     |                  regular successor is where process resumes after the condition block is evaluated
     |--CompensatedNode - executes all following nodes of the starting node in sequence but if there are any errors, will stop execution and run the compensation nodes.
     |--LoopNode - has a condition, which is evaluated by a rule set and a loopStartNode.
     |             the successor is where process resumes after the loop exits.
     |--IteratorNode - has an iterator to loop through until all items are iterated. For each item, the loopBlock will be called, which is a BlockNode

     */


    Injector.register({dependency: serviceMessage, name: 'serviceMessage'});
    var ruleEngine = Injector.resolve({target: 'ruleEngine'});


    var logger = log4js.getLogger();
    logger.setLevel('ERROR');

    function ExecutionContext(options) {

        serviceMessage.ServiceResponse.call(this, options);

        Object.defineProperty(this, 'request', {writable: true, enumerable: true, value: options.request});
        Object.defineProperty(this, 'steps', {writable: true, enumerable: true, value: []});
        Object.defineProperty(this, 'isCompensated', {writable: true, enumerable: true, value: false});
        Object.defineProperty(this, 'trackingEnabled', {writable: true, enumerable: true, value: true});
        Object.defineProperty(this, 'isCancellationRequested', {writable: true, enumerable: true, value: false});
        Object.defineProperty(this, 'version', {writable: true, enumerable: true, value: options.version || '0.1'});
        Object.defineProperty(this, 'processorName', {
            writable: true,
            enumerable: true,
            value: options.processorName || 'unknown'
        });

        this.emit('message.created', this);

    }

    util.inherits(ExecutionContext, serviceMessage.ServiceResponse);

    ExecutionContext.prototype.requestCancellation = function () {
        this.isCancellationRequested = true;
    };

    ExecutionContext.prototype.visiting = function (node, message, action) {

        if (!this.trackingEnabled) return;

        logger.info(message || '', action || 'Visiting ', node.name, ' for correlationId ', this.correlationId || "No Correlation Id");
        if (_.isUndefined(action)) {
            this.steps.push({begin: true, action: "visiting", name: node.name, message: message});
        } else {
            this.steps.push({begin: true, action: action, name: node.name, message: message});
        }
    };

    ExecutionContext.prototype.visited = function (node, message, action) {
        if (!this.trackingEnabled) return;

        logger.info(message || '', action || 'Visited ', node.name, ' for correlationId ', this.correlationId || "No Correlation Id");

        if (_.isUndefined(action)) {
            this.steps.push({begin: false, action: "visited", name: node.name, message: message});
        } else {
            this.steps.push({begin: false, action: action, name: node.name, message: message});
        }
    };


    function executeSuccessor(self, executionContext, dfd, executeFn) {
        if (executionContext.isSuccess && self.successor && !executionContext.isCancellationRequested) {
            process.nextTick(function () {
                q.fcall(executeFn.bind(self.successor), executionContext).then(function (successorResponseExecutionContext) {
                    dfd.resolve(successorResponseExecutionContext);
                });
            });
        } else {
            dfd.resolve(executionContext);
        }
    }

    function executeConditionBranch(branch, executionContext, self, dfd) {
        process.nextTick(function () {
            if (executionContext.isCancellationRequested) {
                dfd.resolve(executionContext);
            } else {
                q.fcall(branch.execute.bind(branch), executionContext).then(function (responseExecutionContext) {
                    executeSuccessor(self, responseExecutionContext, dfd, Node.prototype.execute);
                }, function (error) {
                    executionContext.addError(error.message);
                    dfd.resolve(executionContext);
                });
            }
        });
    }

    function Node(serviceMessage) {

        var _successor;
        Object.defineProperty(this, "successor", {
            get: function () {
                return _successor;
            },
            set: function (value) {
                if (!value) return;
                if (value instanceof Node) {
                    _successor = value;
                } else {
                    throw Error('Successor is not of type Node or one of its descendant');
                }
            }
        });

        var _name;
        Object.defineProperty(this, "name", {
            get: function () {
                return _name;
            },
            set: function (value) {
                if (_.isUndefined(value))
                    throw Error('A Name must be provided');
                if (_.isString(value)) {
                    _name = value;
                } else {
                    throw Error('name must be a string');
                }
            }
        });

        this.messaging = serviceMessage;
        this.name = 'Node';

        return this;
    }

    Node.prototype.initialize = function (params) {
        params = params || {};
        this.successor = params.successor;
        if (_.isUndefined(this.name)) this.name = params.name;

    };

    Node.prototype.execute = function (executionContext) {
        var self = this;
        var dfd = q.defer();
        try {
            executionContext.visiting(self);
            q.fcall(self.handleRequest.bind(self), executionContext).then(function (responseExecutionContext) {
                executionContext.visited(self);

                if (responseExecutionContext.hasErrors && !responseExecutionContext.isCompensated) {
                    responseExecutionContext.isSuccess = false;
                    dfd.resolve(responseExecutionContext);
                    return;
                }

                executeSuccessor(self, responseExecutionContext, dfd, self.successor ? self.successor.execute : null);
            }, function (error) {
                executionContext.addError(error.message);
                dfd.resolve(executionContext);
            }).done(function () {
                executionContext.update();
            });
        } catch (e) {
            executionContext.addError(e.message);
            executionContext.update();
            dfd.resolve(executionContext);
            return dfd.promise;
        }
        return dfd.promise;
    };


    Node.prototype.handleRequest = function () {
        throw Error("HandleRequest is not implemented");
    };


    function TaskNode(serviceMessage) {
        Node.call(this, serviceMessage);
        this.name = 'TaskNode';
        return this;
    }

    util.inherits(TaskNode, Node);

    TaskNode.prototype.initialize = function (params) {
        params = params || {};
        TaskNode.super_.prototype.initialize.call(this, params);
    };

    var evaluateCondition = function (condition, executionContext) {
        var dfd = q.defer();
        if (_.isFunction(condition)) {
            q.fcall(condition, executionContext).then(function (conditionResult) {
                dfd.resolve(conditionResult);
            }).fail(function () {
                dfd.resolve(false);
            });
        }

        if (_.isArray(condition) || _.isString(condition)) {
            var ruleSets = [];
            if (_.isString(condition)) {
                ruleSets.push(condition);
            } else {
                ruleSets = condition;
            }

            ruleEngine.evaluate(executionContext, ruleSets).then(function (conditionResult) {
                dfd.resolve(conditionResult.isTrue);
            }).fail(function () {
                dfd.resolve(false);
            });
        }

        return dfd.promise;
    };


    function ConditionNode(serviceMessage) {
        Node.call(this, serviceMessage);

        var _trueSuccessor;
        Object.defineProperty(this, "trueSuccessor", {
            get: function () {
                return _trueSuccessor;
            },
            set: function (value) {
                if (value && (value instanceof Node)) {
                    _trueSuccessor = value;
                } else {
                    throw Error('True Successor is not of type Node or one of its descendant');
                }
            }
        });


        var _falseSuccessor;
        Object.defineProperty(this, "falseSuccessor", {
            get: function () {
                return _falseSuccessor;
            },
            set: function (value) {
                if (!value) return;
                if (value instanceof Node) {
                    _falseSuccessor = value;
                } else {
                    throw Error('False Successor is not of type Node or one of its descendant');
                }
            }
        });

        var _condition;
        Object.defineProperty(this, "condition", {
            get: function () {
                return _condition;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A condition must be provided");
                //if(value instanceof Node) {
                _condition = value;
                //} else {
                //    throw Error('Condition is not of type XXX or one of its descendant');
                //}
            }
        });


        return this;
    }

    util.inherits(ConditionNode, Node);

    ConditionNode.prototype.initialize = function (params) {
        params = params || {};
        ConditionNode.super_.prototype.initialize.call(this, params);
        this.condition = params.condition;
        this.trueSuccessor = params.trueSuccessor;
        this.falseSuccessor = params.falseSuccessor;
        this.name = 'ConditionNode';
    };

    ConditionNode.prototype.execute = function (executionContext) {
        var dfd = q.defer();
        var self = this;
        executionContext.visiting(self, 'Evaluating Condition', 'Evaluating Condition');
        if (executionContext.isCancellationRequested) {
            dfd.resolve(executionContext);
        } else {
            q.fcall(evaluateCondition, self.condition, executionContext).then(function (conditionResult) {
                if (conditionResult) {
                    executionContext.visiting(self, 'Condition Evaluated true', 'Condition');
                    executionContext.visiting(self, '', 'Executing True Branch');
                    executeConditionBranch.call(self, self.trueSuccessor, executionContext, self, dfd);
                } else {
                    executionContext.visiting(self, 'Condition Evaluated false', 'Condition');
                    if (self.falseSuccessor) {
                        executionContext.visiting(self, '', 'Executing False Branch');
                        executeConditionBranch.call(self, self.falseSuccessor, executionContext, self, dfd);
                    } else {
                        if (self.successor) {
                            ConditionNode.super_.prototype.execute.call(self.successor, executionContext).then(function (successorExecutionContext) {
                                dfd.resolve(successorExecutionContext);
                            });
                        } else {
                            dfd.resolve(executionContext);
                        }
                    }
                }
            }).done(function () {
                executionContext.update();
            });
        }
        return dfd.promise;
    };

    function CompensatedNode(serviceMessage) {
        Node.call(this, serviceMessage);

        var _startNode;
        Object.defineProperty(this, "startNode", {
            get: function () {
                return _startNode;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A start node must be provided");
                if (value instanceof Node) {
                    _startNode = value;
                } else {
                    throw Error('StartNode is not of type Node or one of its descendant');
                }
            }
        });

        var _compensationNode;
        Object.defineProperty(this, "compensationNode", {
            get: function () {
                return _compensationNode;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A compensation node must be provided");
                if (value instanceof Node) {
                    _compensationNode = value;
                } else {
                    throw Error('Compensation Node is not of type Node or one of its descendant');
                }
            }
        });

        return this;
    }

    util.inherits(CompensatedNode, Node);

    CompensatedNode.prototype.initialize = function (params) {
        params = params || {};
        CompensatedNode.super_.prototype.initialize.call(this, params);
        this.startNode = params.startNode;
        this.compensationNode = params.compensationNode;
        this.name = 'Compensated Node';
    };

    CompensatedNode.prototype.execute = function (executionContext) {

        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {
            executionContext.visiting(self, 'Executing standard path', 'Executing Compensatable');
            if (executionContext.isCancellationRequested) {
                dfd.resolve(executionContext);
            } else {
                q.fcall(self.startNode.execute.bind(self.startNode), executionContext).then(function (responseExecutionContext) {
                    executionContext.visited(self, 'Standard path Completed', 'Compensatable Executed');

                    if (responseExecutionContext.isSuccess) {
                        //execute successor.... everything is good, let's move on
                        executeSuccessor(self, responseExecutionContext, dfd, self.successor ? self.successor.execute : null);
                    } else {
                        //we need to execute the compensation branch and then let bubble up the chain
                        process.nextTick(function () {
                            executionContext.visiting(self, 'Executing Compensation path', 'Executing Compensation');
                            responseExecutionContext.isSuccess = true;
                            responseExecutionContext.isCompensated = true;
                            q.fcall(self.compensationNode.execute.bind(self.compensationNode), responseExecutionContext).then(function (compensationResponseExecutionContext) {
                                executionContext.visited(self, 'Compensation path Completed', 'Compensation Executed');

                                dfd.resolve(compensationResponseExecutionContext);
                            });
                        });

                    }
                });
            }
        });

        return dfd.promise;
    };


    function LoopNode(serviceMessage) {
        Node.call(this, serviceMessage);

        var _condition;
        Object.defineProperty(this, "condition", {
            get: function () {
                return _condition;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A condition must be provided");
                //if(value instanceof Node) {
                _condition = value;
                //} else {
                //    throw Error('Condition is not of type XXX or one of its descendant');
                //}
            }
        });

        var _startNode;
        Object.defineProperty(this, "startNode", {
            get: function () {
                return _startNode;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A start node must be provided");
                if (value instanceof Node) {
                    _startNode = value;
                } else {
                    throw Error('StartNode is not of type Node or one of its descendant');
                }
            }
        });


        return this;
    }

    util.inherits(LoopNode, Node);

    LoopNode.prototype.initialize = function (params) {
        params = params || {};
        LoopNode.super_.prototype.initialize.call(this, params);
        this.condition = params.condition;
        this.startNode = params.startNode;
        this.name = 'Loop Node';

    };

    LoopNode.prototype.execute = function (executionContext) {
        var self = this;
        var dfd = q.defer();
        executionContext.visiting(self, 'Entering Loop', 'Executing Loop');
        self.loopWhile(executionContext).then(function (responseExecutionContext) {
            executionContext.visited(self, 'Exiting Loop', 'Loop Executed');
            if (responseExecutionContext.isCompensated) {
                dfd.resolve(responseExecutionContext);
                return;
            }
            executeSuccessor(self, responseExecutionContext, dfd, self.successor ? self.successor.execute : null);
        }, function (error) {

        }).done(function () {
            executionContext.update();
        });

        // The promise
        return dfd.promise;
    };


    LoopNode.prototype.loopWhile = function (executionContext) {
        var self = this;
        var dfd = q.defer();

        function loop(loopExecutionContext) {
            // When the result of calling `condition` is no longer true, we are
            // done.

            if (loopExecutionContext.isCompensated) {
                dfd.resolve(loopExecutionContext);
                return;
            }

            q.fcall(evaluateCondition, self.condition, executionContext).then(function (conditionResult) {

                //TODO Check if the response is containing isTrue, otherwise, use the result directly (this is necessary to integrate with rule engine)

                if (conditionResult) {
                    if (executionContext.isCancellationRequested) {
                        dfd.resolve(loopExecutionContext);
                    } else {
                        q.fcall(self.startNode.execute.bind(self.startNode), executionContext).then(function (innerLoopEvaluationContext) {
                            //copyResponseIntoAnother(loopExecutionContext, innerLoopEvaluationContext);
                            if (innerLoopEvaluationContext.isSuccess) {
                                loop(loopExecutionContext);
                            } else {
                                //When any of the successor within the loop returns an error, we exit the loop
                                return dfd.resolve(loopExecutionContext);
                            }
                        }, function (error) {
                            return dfd.reject(error);
                        });
                    }
                }
                else {

                    return dfd.resolve(loopExecutionContext);
                }

            }, function (error) {
                console.log("there is an error");
            }).done(function () {
                loopExecutionContext.update();
            });
        }

        // Start running the loop in the next tick so that this function is
        // completely async. It would be unexpected if `startNode` was called
        // synchronously the first time.
        process.nextTick(function () {
            loop(executionContext);
        });

        // The promise
        return dfd.promise;
    };

    function NoOpTaskNode(serviceMessage) {
        TaskNode.call(this, serviceMessage);
        this.name = 'NoOpTask';
        return this
    }

    util.inherits(NoOpTaskNode, TaskNode);

    NoOpTaskNode.prototype.handleRequest = function () {

        return new this.messaging.ServiceResponse();
    };

    function NodeFactory() {

    }

    NodeFactory.create = function (nodeType, params, resolutionName) {
        var node = Injector.resolve({target: nodeType, resolutionName: resolutionName});
        if (node) {
            node.initialize(params);
        }
        return node;
    };

    function ProcessorLoader() {

    }

    ProcessorLoader.prototype.load = function (processorName) {
        var dfd = q.defer();

        process.nextTick(function () {
            var processor;

            try {
                processor = require(engineConfig.processorPath + '/' + processorName);
            }
            catch (error) {
                dfd.reject("Processor doesn't exists");
            }

            dfd.resolve(processor);
        });

        return dfd.promise;
    };

    function ProcessorResolver(processorLoader) {

        var _processorLoader;
        Object.defineProperty(this, "processorLoader", {
            get: function () {
                return _processorLoader;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A ProcessorLoader must be used");
                if (value instanceof ProcessorLoader) {
                    _processorLoader = value;
                } else {
                    throw Error('ProcessorLoader is not of type ProcessorLoader or one of its descendant');
                }
            }
        });

        this.processorLoader = processorLoader;


        return this;
    }

    var cache = {};

    function ProcessorCache() {

    }

    ProcessorCache.add = function (name, processorDefinition) {
        cache[name] = processorDefinition;
    };

    ProcessorCache.get = function (name) {
        if (!_.isUndefined(cache[name])) return cache[name];

        return null;
    };

    ProcessorResolver.prototype.load = function (processorName) {

        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {

            var parsedProcessor = self.getFromCache(processorName);

            if (parsedProcessor == null) {
                q.fcall(self.processorLoader.load, processorName).then(function (processorDefinition) {
                    try {
                        parsedProcessor = self.parseProcessorDefinition(processorDefinition);
                        self.addToCache(processorName, parsedProcessor);
                        dfd.resolve(parsedProcessor);
                    } catch (error) {
                        dfd.reject(error);
                    }
                }).fail(function (error) {
                    dfd.reject(error);
                });

            } else {
                dfd.resolve(parsedProcessor);
            }
        });

        return dfd.promise;

    };

    ProcessorResolver.prototype.parseProcessorDefinition = function (processorDefinition) {

        if (_.isUndefined(processorDefinition) || !processorDefinition) {
            throw Error("Process definition is not provided");
        }


        function internalParse(innerDefinition) {
            var nodeType = '';
            var parameters = null;
            var inner = {};

            for (var prop in innerDefinition) {

                if (prop == 'nodeType') {
                    nodeType = innerDefinition[prop];
                } else if (prop == 'parameters') {
                    parameters = innerDefinition[prop];
                    if (!_.isUndefined(parameters)) {
                        for (var paramProp in parameters) {
                            if (paramProp == 'condition') {
                                inner[paramProp] = parameters[paramProp];
                            } else {
                                inner[paramProp] = internalParse(parameters[paramProp]);
                            }
                        }
                    }
                } else if (prop == 'version' || prop == 'processorName') {
                    continue;
                } else {
                    return innerDefinition[prop];
                }


            }

            var node = NodeFactory.create(nodeType, inner);
            return node;
        }

        var materializedDefinition = {};
        materializedDefinition = internalParse(processorDefinition);
        materializedDefinition.version = processorDefinition.version;
        materializedDefinition.processorName = processorDefinition.processorName;

        return materializedDefinition;
    };

    ProcessorResolver.prototype.addToCache = function (processorName, processorDefinition) {
        ProcessorCache.add(processorName, processorDefinition);
    };

    ProcessorResolver.prototype.getFromCache = function (processorName) {
        return ProcessorCache.get(processorName);
    };

    function Processor(serviceMessage, processorResolver) {

        CompensatedNode.call(this, serviceMessage);

        var _processorResolver;
        Object.defineProperty(this, "processorResolver", {
            get: function () {
                return _processorResolver;
            },
            set: function (value) {
                if (_.isUndefined(value)) throw Error("A ProcessorResolver must be used");
                if (value instanceof ProcessorResolver) {
                    _processorResolver = value;
                } else {
                    throw Error('ProcessorResolver is not of type ProcessorLoader or one of its descendant');
                }
            }
        });

        Object.defineProperty(this, 'version', {writable: true, enumerable: true});
        Object.defineProperty(this, 'processorName', {writable: true, enumerable: true});

        this.processorResolver = processorResolver;

        return this
    }

    util.inherits(Processor, CompensatedNode);

    Processor.prototype.initialize = function (params) {

    };

    Processor.prototype.load = function (processorName) {
        var params = {};
        var self = this;
        var dfd = q.defer();

        this.processorResolver.load(processorName).then(function (process) {
            params.startNode = process.startNode;
            params.compensationNode = process.compensationNode;
            self.version = process.version;
            self.processorName = process.processorName;

            Processor.super_.prototype.initialize.call(self, params);
            dfd.resolve();
        }).fail(function (error) {
            dfd.reject(error);
        });
        return dfd.promise;
    };

    Processor.prototype.execute = function (request) {


        var executionContext = new ExecutionContext({
            request: request,
            version: this.version,
            processorName: this.processorName
        });

        if ((request instanceof this.messaging.ServiceMessage)) {
            if (request.correlationId != null) {
                executionContext.correlationId = request.correlationId;
            } else {
                executionContext.setCorrelationId();
            }
        } else {
            executionContext.setCorrelationId();
        }

        var dfd = q.defer();
        Processor.Count++;
        Processor.super_.prototype.execute.call(this, executionContext).then(function (responseExecutionContext) {
            if (responseExecutionContext.isCompensated) responseExecutionContext.isSuccess = false;
            Processor.Count--;
            dfd.resolve(responseExecutionContext);
        });
        return dfd.promise;
    };

    Processor.Count = 0;

    var engineConfig = {};
    Processor.config = function (config) {
        engineConfig.processorPath = config.processorPath;
    };

    Processor.getProcessor = function (processorName) {
        var params = {name: processorName};
        var processor = NodeFactory.create('Processor', params);

        var dfd = q.defer();

        processor.load(processorName).then(function () {

            dfd.resolve(processor);

        }).fail(function (error) {
            dfd.reject(error);
        });

        return dfd.promise;
    };

    exports.Processor = Processor;
    exports.ProcessorLoader = ProcessorLoader;
    exports.ProcessorResolver = ProcessorResolver;
    exports.TaskNode = TaskNode;
    exports.ConditionNode = ConditionNode;
    exports.CompensatedNode = CompensatedNode;
    exports.NodeFactory = NodeFactory;
    exports.LoopNode = LoopNode;
    exports.NoOpTaskNode = NoOpTaskNode;
    exports.ExecutionContext = ExecutionContext;

    Injector.setBasePath(__dirname);
    Injector
        .register({dependency: '/index::TaskNode', name: 'TaskNode'})
        .register({dependency: '/index::ConditionNode', name: 'ConditionNode'})
        .register({dependency: '/index::CompensatedNode', name: 'CompensatedNode'})
        .register({dependency: '/index::LoopNode', name: 'LoopNode'})
        .register({dependency: '/index::Processor', name: 'Processor'})
        .register({dependency: '/index::NoOpTaskNode', name: 'NoOpTaskNode'})
        .register({dependency: '/index::ProcessorLoader', name: 'processorLoader'})
        .register({dependency: '/index::ProcessorResolver', name: 'processorResolver'})

})
(
    module.require('util'),
    module.require('lodash'),
    module.require('q'),
    process,
    require('log4js'),
    require('jsai-injector'),
    require('jsai-servicemessage'),
    require('jsai-ruleengine/RuleEvaluator')
);