/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function(Rule, RuleCondition) {

    module.exports = new Rule({
        ruleName: 'female20to40',
        condition: new RuleCondition("isTrue = evaluationContext.fact.request.person.gender !='M' && evaluationContext.fact.request.person.age >=20 && evaluationContext.fact.request.person.age <=40")
    });


})(
    require('jsai-ruleengine/Rule').Rule,
    require('jsai-ruleengine/Rule').RuleCondition);
