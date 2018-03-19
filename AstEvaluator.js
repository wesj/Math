define(function (require, exports, module) {

var tests = require('tests');
// var tests = false;
var MSet = require("MSet").MSet;
var Matrix = require('Matrix').Matrix;
var Context = require("Context.js");

var AstEvaluator = {
    evaluate: function(ast, context, original) {
        if (!ast) {
            console.error("WTF", ast);
            return;
        }

        if (this[ast.type]) {
            var ret = this[ast.type](ast, context, original);
            return ret;
        }

        if (ast.length) {
            return;
        }

        throw "Unknown type " + ast.type;
    },

    operator: function(ast, context, original) {
        if (this[ast.operation]) {
            return this[ast.operation](ast, context);
        }
        throw "Unknown operation " + ast.operation;
    },

    number: function(ast, context, original) {
        return ast.value;
    },

    variable: function(ast, context, original) {
        if (context) {
            var def = context.definitions[ast.value];
            if (def) {
                var ret = this.evaluate(def.arguments[1], context);
                return ret;
            }
        }

        return ast;
    },

    custom: function(ast, context, original) {
        return ast.evaluate(context, original);
    },

    "function": function(ast, context, original) {
        var f = context.definitions[ast.value];
        if (f) {
            var f = context.definitions[ast.value].arguments[0];
            var body = context.definitions[ast.value].arguments[1];

            var newContext = Context.default(context);
            if (!f.parameters) {
                console.error("No args", f);
            }

            if (!ast.parameters) {
                console.error("No args2", ast);
            }

            if (f.parameters.length != ast.parameters.length) {
                throw "Invalid number of arguments provided. Got " + ast.parameters.length + ". Expected " + f.parameters.lengths + ".";
            }

            for (var i = 0; i < f.parameters.length; i++) {
                var arg = f.parameters[i];
                if (!context.definitions[arg.value]) {
                    var val = ast.parameters[i];
                    newContext.definitions[arg.value] = new Operator("definition", [
                        new Variable(arg.value),
                        val
                    ]);
                }
            }

            var ret = this.evaluate(body, newContext, ast);
            return ret;
        }

        var args = ast.parameters.map(function(param) {
            return AstEvaluator.evaluate(param, context, original);
        });
        var res = new FunctionNode(ast, args);
        return res;
    },

    _runOperation: function(ast, context, operation, evalFunc) {
        var lhs = ast.arguments[0] ? this.evaluate(ast.arguments[0], context) : null;
        var rhs = ast.arguments[1] ? this.evaluate(ast.arguments[1], context) : null;

        // console.log("Eval", ast, lhs, rhs);
        if (lhs && lhs[operation]) {
            // console.log("Eval with left", operation, lhs[operation]);
            return lhs[operation](rhs);
        } else if (rhs && rhs[operation + "Right"]) {
            return rhs[operation + "Right"](lhs);
        }

        if (ast.isBinaryOp) {
          if (typeof lhs === "number" && typeof rhs === "number") {
            return evalFunc(lhs, rhs);
          }

          if (typeof lhs === "number") lhs = new NumberNode(lhs);
          if (typeof rhs === "number") rhs = new NumberNode(rhs);
          return new Operator(ast, [lhs, rhs]);
        } else {
          if (typeof lhs === "number") {
            return evalFunc(lhs);
          }
          return new Operator(ast, [lhs]);
        }
    },

    abs: function(ast, context, original) {
        return this._runOperation(ast, context, "abs", function(lhs, rhs) {
            return Math.abs(lhs);
        });
    },

    add: function(ast, context, original) {
        return this._runOperation(ast, context, "add", function(lhs, rhs) {
            return lhs + rhs;
        });
    },

    subtract: function(ast, context, original) {
        return this._runOperation(ast, context, "subtract", function(lhs, rhs) { return lhs - rhs; });
    },

    positive: function(ast, context, original) {
        return this._runOperation(ast, context, "positive", function(lhs, rhs) { return lhs; });
    },

    negative: function(ast, context, original) {
        return this._runOperation(ast, context, "negative", function(lhs, rhs) {
            return -1 * lhs;
        });
    },

    multiply: function(ast, context, original) {
        return this._runOperation(ast, context, "multiply", function(lhs, rhs) { return lhs * rhs; });
    },

    equality:   function(ast, context, original) {
        // return new Operator("equality", [
        return AstEvaluator.evaluate(ast.arguments[0], context, original);
        //    AstEvaluator.evaluate(ast.arguments[1], context, original),
        //]);
    },

    comma:   function(ast, context, original) {
        return null;
    },

    definition: function(ast, context, original) {
        return new Operator("definition", [
            AstEvaluator.evaluate(ast.arguments[0], context, original),
            AstEvaluator.evaluate(ast.arguments[1], context, original),
        ]);
    },

    divide: function(ast, context, original) {
        return this._runOperation(ast, context, "divide", function(lhs, rhs) {
            return lhs / rhs;
        });
    },

    plusminus: function(ast, context, original) {
      var add = new Operator("+", ast.arguments);
      var subtract = new Operator("-", ast.arguments);
      var l = this.evaluate(add, context, original);
      var r = this.evaluate(subtract, context, original);
      return new MSet([l, r]);
    },

    power: function(ast, context, original) {
        return this._runOperation(ast, context, "exp", function(lhs, rhs) { 
            if (lhs === Math.E) {
                return Math.exp(rhs);
            }
            return Math.pow(lhs, rhs);
        });
    },

    sqrt: function(ast, context, original) {
        return this._runOperation(ast, context, "sqrt", function(lhs, rhs) {
          var x = Math.sqrt(lhs);
          return new MSet([-x, x]);
        });
    },

    matrix: function(ast, context, original) {
        var vals = [];

        var matrix = ast.arguments ? ast.arguments[0] : ast;
        for (var i = 0; i < matrix.rows.length; i++) {
            var row = matrix.rows[i];
            for (var j = 0; j < row.values.length; j++) {
                var val = this.evaluate(row.values[j], context, original);
                vals.push(val);
            }
        }

        return new Matrix(matrix.rows.length, vals);
    },
}

if (tests) {

var Operators = require("Operator.js");
var Operator = Operators.Operator;
var NumberNode = Operators.NumberNode;
var Variable = Operators.Variable;
var FunctionNode = Operators.FunctionNode;
var MatrixNode = Operators.MatrixNode;
var RowNode = Operators.RowNode;

function TestEval(ast, result, context) {
    context = context || Context.default();
    if (result === undefined) {
        result = ast;
    }

    this.name = "AstEvaluator " + (result.toString ? result.toString() : result);
    this.run = function() {
        try {
            var r = AstEvaluator.evaluate(ast, context);
            tests.is(r, result);
        } catch(ex) {
            tests.ok(false, ex);
        }
    }
}

tests.tests.push(new TestEval(new Variable("aB"), new Variable("aB")));
tests.tests.push(new TestEval(new NumberNode("12.5"), 12.5));
tests.tests.push(new TestEval(new Operator("+", [
    new Variable("x"),
    new NumberNode("2")
])));
tests.tests.push(new TestEval(new Operator("+", [
    new NumberNode("13"),
    new NumberNode("22")
]), 35));
tests.tests.push(new TestEval(new Operator("-", [
    new NumberNode("22"),
    new NumberNode("13")
]), 9));
tests.tests.push(new TestEval(new Operator("/", [
    new NumberNode("2"),
    new Variable("x")
])));
tests.tests.push(new TestEval(new Operator("+", [
    new Operator("/", [
        new NumberNode("1"),
        new NumberNode("2")
    ]), new Variable("x")
]), new Operator("+", [
    new NumberNode("0.5"),
    new Variable("x")
])));
tests.tests.push(new TestEval(new Operator("^", [
    new NumberNode("2"),
    new NumberNode("2")
]), 4));
tests.tests.push(new TestEval(new Operator("^", [
    new NumberNode("2"),
    new Variable("x")
])));

tests.tests.push(new TestEval(new NumberNode("2", {
    identifier: new NumberNode("2")
}), 2));

tests.tests.push(new TestEval(new Operator("sqrt", [
    new NumberNode(4)
]), new MSet([2, -2])));

tests.tests.push(new TestEval(new Operator("-", [
    new Operator("sqrt", [ new NumberNode(4) ]),
    new Operator("sqrt", [ new NumberNode(4) ])
]), new MSet([4, 0, -4])));

tests.tests.push(new TestEval(new Operator(plusMinus, [
    new NumberNode(4),
    new NumberNode(5)
]), new MSet([9, -1])));

tests.tests.push(new TestEval(new FunctionNode("f", [
    new Variable("x")
])));
tests.tests.push(new TestEval(new FunctionNode("f", [
    new Operator("+", [ new NumberNode(1), new NumberNode(2) ])
]), new FunctionNode("f", [ 3 ])));

var c = Context.default();
c.definitions["f"] = new Operator("definition", [
    new FunctionNode("f", [ new Variable("x"), new Variable("y") ]),
    new Operator("*", [
      new Variable("x"),
      new Variable("y")
    ])
]);

tests.tests.push(new TestEval(new FunctionNode("f", [
    new Operator("+", [ new NumberNode(1), new NumberNode(2) ]),
    new NumberNode(3)
]), 9, c));

tests.tests.push(new TestEval(new Operator("definition", [
    new Variable("x"),
    new Operator("+", [ new NumberNode("2"), new NumberNode("20") ])
]), new Operator("definition", [
    new Variable("x"),
    22
])));

tests.tests.push(new TestEval(new Operator("+", [
    new NumberNode("1"),
    new Operator(plusMinus, [ new NumberNode("2"), new NumberNode("3") ]),
]), new MSet([0, 6])));

tests.tests.push(new TestEval(new FunctionNode("cos", [
    new Operator("+", [ new NumberNode("2"), new NumberNode("20") ])
]), Math.cos(22)));

tests.tests.push(new TestEval(new FunctionNode("log", [
    new Operator("+", [ new NumberNode("2"), new NumberNode("20") ])
]), Math.log10(22)));

tests.tests.push(new TestEval(new FunctionNode("log", [
    new Operator("+", [ new NumberNode("2"), new NumberNode("20") ])
], { identifier: new NumberNode(2) }), Math.log10(22) / Math.log10(2) ));

tests.tests.push(new TestEval(new Variable("e"), Math.E ));

tests.tests.push(new TestEval(new Operator(invisibleTimes, [
  new Variable("e"),
  new NumberNode(2)
]), 2 * Math.E));

tests.tests.push(new TestEval(new Operator("[", [
    new MatrixNode(null, [
      new RowNode(null, [
        new NumberNode(1),
        new NumberNode(2),
      ]),
      new RowNode(null, [
        new NumberNode(3),
        new NumberNode(4),
      ])
    ]),
]), new Matrix(2, [1,2,3,4])));
/*
// f(x)=3+-x;
// f(3)=MSet([6,0]);
// f(3).add(3)=MSet([9,3])
// 3+f(3)=
// MSet([1,1]).add(MSet([2,2]))=MSet([MSet([3,3]),MSet([3,3])])

tests.tests.push(new TestEval("Test pressing the 'log_2  (2)=' keys", "log_2  (2)=", "function log(x) { return Math.log10(x); };\nlog(2) / log(2) = 1;", 1));
tests.tests.push(new TestEval("Test pressing the 'f(x)=x?1+f(1)' keys", "f(x)=x?1+f(1)", "function f(x) { return x; };\n1 + f(1);", 2));
tests.tests.push(new TestEval("Test pressing the 'f(x)=e^x^2?f(1)' keys", "f(x)=e^x^2?f(1)", "var e = " + MathE + ";\nfunction f(x) { return Math.exp(Math.pow(x, 2)); };\nf(1);", Math.exp(1)));
tests.tests.push(new TestEval("Test pressing the 'f(x)=x?f(1)+1' keys", "f(x)=x?f(1)+1", "function f(x) { return x; };\nf(1) + 1;", 2));
tests.tests.push(new TestEval("Test pressing the 'f(x,y)=x+y?f(2,5)=' keys", "f(x,y)=x+y?f(2,5)", "function f(x,y) { return x + y; };\nf(2,5);", 7));
tests.tests.push(new TestEval("Test pressing the '|-2|=' keys", "|-2|=", "function abs(x) { return Math.abs(x); };\nabs(-2) = 2;", 2));
*/
}


exports.evaluate = AstEvaluator.evaluate.bind(AstEvaluator);

})
