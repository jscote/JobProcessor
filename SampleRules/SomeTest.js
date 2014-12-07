/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function (RuleSet, Rule, RuleCondition) {

    module.exports = new RuleSet({
        ruleSetName: 'SomeTest',
        haltOnException: false,
        rules: {
            "female": {},
            "female20to40": {}
        }
    });


})(require('jsai-ruleengine/RuleEvaluator').RuleSet,
    require('jsai-ruleengine/Rule').Rule,
    require('jsai-ruleengine/Rule').RuleCondition);
