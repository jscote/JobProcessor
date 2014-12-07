/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');

(function(Rule, RuleCondition) {

    module.exports = new Rule({
        ruleName: 'married',
        condition: new RuleCondition("isTrue = evaluationContext.fact.martialStatus =='Married'")
    });


})(
    require(p.resolve(__dirname + '/../Rule')).Rule,
    require(p.resolve(__dirname + '/../Rule')).RuleCondition);
/**
 * Created by jean-sebastiencote on 12/6/14.
 */
