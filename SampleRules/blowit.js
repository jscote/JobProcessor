/**
 * Created by jean-sebastiencote on 12/6/14.
 */

(function(Rule, RuleCondition) {

    module.exports = new Rule({
        ruleName: 'blowit',
        condition: new RuleCondition("throw(Error('Test Error'))")

    });


})(
    require('jsai-ruleengine/Rule').Rule,
    require('jsai-ruleengine/Rule').RuleCondition);
