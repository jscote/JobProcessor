/**
 * Created by jscote on 2/8/14.
 */
/**
 * Created by jscote on 1/31/14.
 */
(function(){

    'use strict';

    function baseService() {
        Object.defineProperty(this, "errors", { writable: true, value: [] });
        Object.defineProperty(this, "identity", {writable: true, value: null});
    }

    module.exports = baseService;

})();