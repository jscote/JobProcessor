/**
 * Created by jean-sebastiencote on 12/6/14.
 */


(function (RuleSet) {

    module.exports = new RuleSet({
        ruleSetName: 'CounterRuleSet',
        haltOnException: false,
        rules: {
            "counterRule": {}
        }
    });


})(require('jsai-ruleengine/RuleEvaluator').RuleSet);
