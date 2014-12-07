/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function(Rule, RuleCondition) {

    module.exports = new Rule({
                ruleName: 'counterRule',
                condition: new RuleCondition("isTrue = evaluationContext.fact.request.data.index < 2")

            });


})(
    require('jsai-ruleengine/Rule').Rule,
    require('jsai-ruleengine/Rule').RuleCondition);
