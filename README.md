# JobProcessor
Job Processor and Task Framework for choregraphy of execution.

This project is open for contribution/comments/suggestions

Job Processors are a way to represent a process similarly to a workflow. Everything in job processor derives from
a TaskNode. The general outline is that a request is created to start the process. The process then creates an 
execution context, which flows from one node to another during the life cycle of the process. It is possible for a 
flow to be stopped by generating an error or by requesting cancellation.

If an error is generated, the compensation part of a flow or a branch of the flow will get executed. Each node has a 
a successor. When the successor is set, it is executed once the current node is done with its execution. If there 
is no successor, this marks the end of the flow.

The components of a flow are 
- Processor, which is a specialized type of CompensatedTaskNode and is the starting point of any process.
- CompensatedTaskNode
   - Has a start node, which is the beginning of the regular flow
   - Has a Compensation node, which is executed if an error happens during the execution of the normal flow
   - Successor, is executed after the normal flow is completed.
- TaskNode, which are never used directly. They should be derived to do something useful to your process
- ConditonNode, allows evaluating a condition.
   - Condition, is a function that should return either true or false. Works in conjunction with the jsai-ruleengine
     module, which allows composing evaluation of conditions in rule sets and rules
   - TrueSuccessor: this is the start node of a branch to be executed when the condition is true
   - FalseSuccessor: this is the start node of a branch to be executed when the condition is false
   - Successor: this is where the flow will resume after the true or false branch is executed.
- LoopNode, allows a block of nodes to be executed while a condition is true
   - Condition, is a function that should return either true or false. Works in conjunction with the jsai-ruleengine
     module, which allows composing evaluation of conditions in rule sets and rules
   - StartNode, is the start of a block of nodes that will be executed while the condition is true
   - Successor, this is where the flow will resume after the loop is executed.
- IteratorNode, allows a block of nodes to be executed for each element of an array or each property of an object
   - Iterator, is a string representing the path to a property in the execution context, which should contain an
     an array or an object to be enumerated.
   - StartNode, is the start of a block of nodes that will be executed for each item being enumerated. The execution 
     context has a currentIteration property that points to the current item in the iterator
   - Successor, is where the flow resumes once all items have been enumerated.
   
Each processor gets cached in an object, along with its TaskNode. This means that processors and their tasks pretty
much act as singleton. Don't set properties on a TaskNode with the intent of it being instance specific. If you
need to pass data along in the process, add it to the execution context data property.

This is work in progress so feel free to make suggestions.
   
