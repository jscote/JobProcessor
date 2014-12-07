/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function(Rule, RuleCondition) {

    module.exports = new Rule({
                ruleName: 'female',
                condition: new RuleCondition("isTrue = evaluationContext.fact.request.person.gender !='M'")

            });


})(
    require('jsai-ruleengine/Rule').Rule,
    require('jsai-ruleengine/Rule').RuleCondition);
