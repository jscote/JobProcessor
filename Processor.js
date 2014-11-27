/**
 * Created by jean-sebastiencote on 11/1/14.
 */
(function (util, _, q, process, log4js, Injector) {

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

    var logger = log4js.getLogger();


    function copyResponseIntoAnother(response, successorResponse) {
        response.errors = response.errors.concat(successorResponse.errors);
        response.isSuccess = !response.isSuccess ? response.isSuccess : successorResponse.isSuccess;

    }

    function executeSuccessor(self, response, request, context, dfd, executeFn) {
        if (response.isSuccess && self.successor) {
            process.nextTick(function () {
                q.fcall(executeFn.bind(self.successor), request, context).then(function (successorResponse) {

                    if (!successorResponse instanceof self.messaging.ServiceResponse) {
                        response = new self.messaging.ServiceResponse();
                        response.isSuccess = false;
                        response.errors.push("Invalid response type");
                        return response;
                    }
                    copyResponseIntoAnother(response, successorResponse);
                    dfd.resolve(response);
                });
            });
        } else {
            dfd.resolve(response);
        }
    }

    function executeConditionBranch(branch, request, context, self, dfd) {
        process.nextTick(function () {
            q.fcall(branch.execute.bind(branch), request, context).then(function (response) {
                executeSuccessor(self, response, request, context, dfd, Node.prototype.execute);
            }, function (error) {
                var response = new self.messaging.ServiceResponse();
                response.isSuccess = false;
                response.errors.push(error.message);
                dfd.resolve(response);
            });
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

        var _executionContext;
        Object.defineProperty(this, "executionContext", {
            get: function () {
                return _executionContext;
            },
            set: function (value) {
                _executionContext = value;
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

    Node.prototype.visit = function (request, action) {
        if (!_.isUndefined(this.executionContext)) {
            if (_.isUndefined(this.executionContext.steps)) {
                this.executionContext.steps = [];
            }

            if(_.isUndefined(action)) {
                this.executionContext.steps.push({action: "visiting", name: this.name});
            } else {
                this.executionContext.steps.push({action: action, name: this.name});
            }

        }
    };

    Node.prototype.execute = function (request, context) {

        if (this.successor) {
            this.successor.executionContext = this.executionContext;
        }

        var response;
        var self = this;
        var dfd = q.defer();
        try {
            this.visit(request);
            logger.info('Executing Handle Request for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
            q.fcall(self.handleRequest.bind(self), request, context).then(function (response) {
                logger.info('Done Executing Handle Request for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);

                if (!response instanceof self.messaging.ServiceResponse) {
                    response = new self.messaging.ServiceResponse();
                    response.isSuccess = false;
                    response.errors.push("Invalid response type");
                    dfd.resolve(response);
                    return;
                }

                if (response.errors.length > 0) {
                    response.isSuccess = false;
                    dfd.resolve(response);
                    return;

                }


                executeSuccessor(self, response, request, context, dfd, self.successor ? self.successor.execute : null);
            }, function (error) {
                response = new self.messaging.ServiceResponse();
                response.isSuccess = false;
                response.errors.push(error.message);
                dfd.resolve(response);
            }).done();
        } catch (e) {
            response = new self.messaging.ServiceResponse();
            response.isSuccess = false;
            response.errors.push(e.message);
            dfd.resolve(response);
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

        if (this.trueSuccessor) {
            this.trueSuccessor.executionContext = this.executionContext;
        }
        if (this.falseSuccessor) {
            this.falseSuccessor.executionContext = this.executionContext;
        }

    };


    ConditionNode.prototype.execute = function (request, context) {
        var dfd = q.defer();
        var self = this;
        this.visit(request, "Entering Condition");
        logger.info('Evaluating condition for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
        q.fcall(self.condition.bind(self), {request: request, context: context}).then(function (conditionResult) {
            if (conditionResult) {
                self.visit(request, "Condition evaluated to true");
                logger.info('Executing true Branch for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
                executeConditionBranch.call(self, self.trueSuccessor, request, context, self, dfd);
            } else {
                self.visit(request, "Condition evaluated to false");
                if (self.falseSuccessor) {
                    logger.info('Executing false Branch for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
                    executeConditionBranch.call(self, self.falseSuccessor, request, context, self, dfd);
                } else {
                    if (self.successor) {
                        ConditionNode.super_.prototype.execute.call(self.successor, request, context).then(function (successorResponse) {
                            dfd.resolve(successorResponse);
                        });
                    } else {
                        var response = new self.messaging.ServiceResponse();
                        dfd.resolve(response);
                    }
                }
            }
        });
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

        if (this.startNode) {
            this.startNode.executionContext = this.executionContext;
        }

        if (this.compensationNode) {
            this.compensationNode.executionContext = this.executionContext;
        }
    };

    CompensatedNode.prototype.execute = function (request, context) {

        var dfd = q.defer();
        var self = this;

        process.nextTick(function () {
            self.visit(request, "Executing Compensatable path");
            logger.info('Executing Compensatable path for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
            q.fcall(self.startNode.execute.bind(self.startNode), request, context).then(function (response) {
                logger.info('Execution of Compensatable path completed for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);

                if (!response instanceof self.messaging.ServiceResponse) {
                    response = new self.messaging.ServiceResponse();
                    response.isSuccess = false;
                    response.errors.push("Invalid response type");
                    dfd.resolve(response);
                    return;
                }

                if (response.isSuccess) {
                    //execute successor.... everything is good, let's move on
                    executeSuccessor(self, response, request, context, dfd, self.successor ? self.successor.execute : null);
                } else {
                    //we need to execute the compensation branch and then let bubble up the chain
                    process.nextTick(function () {
                        self.visit(request, "Entered Compensation");
                        logger.info('Executing Compensation path for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
                        q.fcall(self.compensationNode.execute.bind(self.compensationNode), request, context).then(function (compensationResponse) {
                            logger.info('Execution of Compensation path completed for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);

                            if (!compensationResponse instanceof self.messaging.ServiceResponse) {
                                compensationResponse = new self.messaging.ServiceResponse();
                                compensationResponse.isSuccess = false;
                                compensationResponse.errors.push("Invalid response type");
                                dfd.resolve(compensationResponse);
                                return;
                            }

                            copyResponseIntoAnother(response, compensationResponse);

                            dfd.resolve(response);
                        });
                    });

                }
            });
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

        if (this.startNode) {
            this.startNode.executionContext = this.executionContext;
        }

        if (this.successor) {
            this.successor.executionContext = this.executionContext;
        }

    };

    LoopNode.prototype.execute = function (request, context) {
        var self = this;
        var dfd = q.defer();
        this.visit(request);
        self.loopWhile(request, context).then(function (response) {
            executeSuccessor(self, response, request, context, dfd, self.successor ? self.successor.execute : null);
        }, function (error) {

        }).done();

        // The promise
        return dfd.promise;
    };


    LoopNode.prototype.loopWhile = function (request, context) {
        var self = this;
        var dfd = q.defer();

        var response = new self.messaging.ServiceResponse();

        function loop(loopResponse) {
            // When the result of calling `condition` is no longer true, we are
            // done.
            logger.info('Evaluating condition for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
            q.fcall(self.condition.bind(self), {request: request, context: context}).then(function (conditionResult) {

                if (conditionResult) {
                    self.visit(request, "loop evaluated with condition true");
                    logger.info('Entering loop for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);
                    q.fcall(self.startNode.execute.bind(self.startNode), request, context).then(function (innerLoopResponse) {
                        copyResponseIntoAnother(loopResponse, innerLoopResponse);
                        if (innerLoopResponse.isSuccess) {
                            loop(loopResponse);
                        } else {
                            //When any of the successor within the loop returns an error, we exit the loop
                            return dfd.resolve(loopResponse);
                        }
                    }, function (error) {
                        return dfd.reject(error);
                    });
                }
                else {
                    self.visit(request, "Exiting loop with condition false");
                    logger.info('Exiting loop for correlationId ', request.correlationId || "No Correlation Id", "and Node Name", self.name);

                    return dfd.resolve(loopResponse);
                }

            }, function (error) {
                console.log("there is an error");
            }).done();
        }

        // Start running the loop in the next tick so that this function is
        // completely async. It would be unexpected if `startNode` was called
        // synchronously the first time.
        process.nextTick(function () {
            loop(response);
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

    ProcessorLoader.prototype.load = function(processorName) {

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

    function ProcessorCache(){

    }

    ProcessorCache.add = function(name, processorDefinition) {
        cache[name] = processorDefinition;
    };

    ProcessorCache.get = function(name) {
        if(!_.isUndefined(cache[name])) return cache[name];

        return null;
    };

    ProcessorResolver.prototype.load = function (processorName) {

        //TODO the entire processor stuff should be built as a package that can be reuse across projects.

        var parsedProcessor = this.getFromCache(processorName);

        if(parsedProcessor == null) {
            var processorDefinition = this.processorLoader.load(processorName);
            parsedProcessor = this.parseProcessorDefinition(processorDefinition);

            this.addToCache(processorName, parsedProcessor);

        }

        return parsedProcessor;

    };

    ProcessorResolver.prototype.parseProcessorDefinition = function(processorDefinition){
        //TODO Implement parsing of definition

        if(_.isUndefined(processorDefinition) || !processorDefinition) {
            throw Error("Process definition is not provided");
        }

        var materializedDefinition = {};

        function internalParse (innerDefinition) {
            var nodeType = '';
            var parameters = null;
            var inner = {};

            for(var prop in innerDefinition) {

                if(prop == 'nodeType') {
                    nodeType = innerDefinition[prop];
                } else if(prop == 'parameters') {
                    parameters = innerDefinition[prop];
                    if(!_.isUndefined(parameters)) {
                        for(var paramProp in parameters) {
                            if(paramProp == 'condition') {
                                inner[paramProp] = parameters[paramProp];
                            } else {
                                inner[paramProp] = internalParse(parameters[paramProp]);
                            }
                        }
                    }
                } else {
                    return innerDefinition[prop];
                }


            }

            var node = NodeFactory.create(nodeType, inner);
            return node;
        };

        materializedDefinition = internalParse(processorDefinition);

        return materializedDefinition;
    };

    ProcessorResolver.prototype.addToCache = function(processorName, processorDefinition) {
        ProcessorCache.add(processorName, processorDefinition);
    };

    ProcessorResolver.prototype.getFromCache = function(processorName) {
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

        this.processorResolver = processorResolver;
        this.executionContext = {steps: []};


        return this
    }

    util.inherits(Processor, CompensatedNode);

    Processor.prototype.initialize = function (params) {
        params = params || {};

        var process = this.processorResolver.load(params.name);
        params.startNode = process.startNode;
        params.compensationNode = process.compensationNode;

        params.startNode.executionContext = this.executionContext;
        params.compensationNode.executionContext = this.executionContext;

        Processor.super_.prototype.initialize.call(this, params);

    };

    Processor.prototype.execute = function(request){

        if(!(request instanceof this.messaging.ServiceMessage)) {
            logger.error("Request should be of ServiceMessage type");
            throw Error("Request should be of ServiceMessage type");
        }

        this.executionContext.steps = [];
        var context = {};
        var dfd = q.defer();
        Processor.super_.prototype.execute.call(this, request, context).then(function(response){
            response.data = context;
            dfd.resolve(response);
        });
        return dfd.promise;
    };

    Processor.getProcessor = function (processorName) {
        var params = {name: processorName};
        return NodeFactory.create('Processor', params);
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

})
(
    module.require('util'),
    module.require('lodash'),
    module.require('q'),
    process,
    require('log4js'),
    require('./node_modules/injector/Injector')
);