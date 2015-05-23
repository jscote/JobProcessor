/**
 * Created by jean-sebastiencote on 12/6/14.
 */

var p = require('path');
var q = require('q');

(function (Rule, RuleCondition) {


    var fCondition = function (evalContext, args) {
        var dfd = q.defer();

        process.nextTick(function () {
            args.out.set('genderOut', 'T');
            dfd.resolve({isTrue: args.in.get("gender") == 'F'});
            //dfd.resolve({isTrue: true});
        });

        return dfd.promise;
    };

    module.exports = new Rule({
        ruleName: 'Rule1WithMap',
        condition: new RuleCondition({predicate: fCondition, contract: [{name: "gender", direction: 1}, {name: "genderOut", direction: 2}]})

    });


})(
    require(p.resolve(__dirname + '/../Rule')).Rule,
    require(p.resolve(__dirname + '/../Rule')).RuleCondition);
