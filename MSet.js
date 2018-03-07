define(function (require, exports, module) {
var tests = require('tests');

function MSet(vals) {
    this.vals = vals.sort();
}

MSet.prototype = {
    _doOp: function(val, prev, op) {
        var results = prev || [];

        if (val.vals) {
            val.vals.forEach(function(v) {
                this._doOp(v, results, op);
            }, this)
        } else {
            this.vals.forEach(function(x) {
                if (x._doOp) {
                    x._doOp(val, results, op);
                } else {
                    var r = op(x, val);
                    if (results.indexOf(r) == -1) {
                        results.push(r);
                    }
                }
            }, this)
        }

        return new MSet(results);
    },
    addRight: function(val, prev) {
        return this._doOp(val, prev, function(a,b) { return a + b; });
    },
    add: function(val, prev) {
        return this._doOp(val, prev, function(a,b) { return a + b; });
    },
    subtract: function(val, prev) {
        return this._doOp(val, prev, function(a,b) { return a - b; });
    },
    multiply: function(val, prev) {
        return this._doOp(val, prev, function(a,b) { return a * b; });
    },
    divide: function(val, prev) {
        return this._doOp(val, prev, function(a,b) { return a / b; });
    },
    equals: function(b) {
        if (b instanceof MSet) {
            return this.vals.every(function(val, index) {
                return tests.compare(val, b.vals[index]);
            })
        } else if (b.length) {
            return this.vals.every(function(val, index) {
                return tests.compare(val, b[index]);
            })
        }
        return false;
    },
    toString: function() {
        return "[" + this.vals.join(",") + "]";
    }
}

if (tests) {
tests.tests.push({ name: "MSet tests", run: function() {
    var p = new MSet([1,2]);
    tests.is(p, [1, 2], "p is correct");

    var p2 = new MSet([3]);
    tests.is(p2.vals[0], 3, "x1 is set to 3");

    var p3 = p.add(3);
    tests.is(p3, [4,5], "add was correct");

    p3 = p.subtract(3);
    tests.is(p3, [-1, -2], "subtract was correct");

    p3 = p.multiply(3);
    tests.is(p3.vals[0], 3, "x1 is set to 3");
    tests.is(p3.vals[1], 6, "x2 is set to 6");

    p3 = p.divide(3);
    tests.is(p3.vals[0], 1/3, "x1 is set to 1/3");
    tests.is(p3.vals[1], 2/3, "x2 is set to 2/3");

    p3 = new MSet([3,4]);
    p4 = p3.add(p);
    tests.is(p4.vals[0], 4, "x1.vals[0] is set to 4");
    tests.is(p4.vals[1], 5, "x1.vals[1] is set to 5");
    tests.is(p4.vals[2], 6, "x2.vals[2] is set to 6");

    p4 = p3.subtract(p);
    tests.is(p4.vals[0], 1, "x1.vals[0] is set to 2");
    tests.is(p4.vals[1], 2, "x1.vals[1] is set to 3");
    tests.is(p4.vals[2], 3, "x2.vals[2] is set to 1");
}});
}

exports.MSet = MSet;
})