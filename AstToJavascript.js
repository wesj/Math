define(function (require, exports, module) {

var tests = require('tests');
// var tests = false;
var Context = require("Context");
var FunctionNode = require("Operator").FunctionNode;

function basicOperation(op) {
    return function(ast, context) {
        if (op === "+") {
            if (ast.arguments[0] && ast.arguments[0].add) {
                return ast.arguments[0].add(AstToJavascript.build(ast.arguments[0], context, false),
                                            AstToJavascript.build(ast.arguments[1], context, false));
            }

            if (ast.arguments[1] && ast.arguments[1].add) {
                return ast.arguments[1].add(AstToJavascript.build(ast.arguments[1], context, false),
                                            AstToJavascript.build(ast.arguments[0], context, false));
            }
        }

        var ret = ""
        var p = ast.precedence;
        if (ast.arguments[0]) {
            if (p && ast.arguments[0].precedence && ast.arguments[0].precedence > p) {
                ret = "(" + AstToJavascript.build(ast.arguments[0], context, false) + ")";
            } else {
                ret = AstToJavascript.build(ast.arguments[0], context, false);
            }
            ret += " ";
        }

        ret += op;

        if (ast.arguments[1]) {
            ret += " ";
            if (p && ast.arguments[1].precedence && ast.arguments[1].precedence > p) {
                ret += "(" + AstToJavascript.build(ast.arguments[1], context, false) + ")";
            } else {
                ret += AstToJavascript.build(ast.arguments[1], context, false);
            }
        }

        return ret;
    }
}

function returnValue() {
    return function(ast, context) {
        var id = "";
        if (ast.identifier) {
            id = "[" + AstToJavascript.build(ast.identifier, context, false) + "]";
        }
        return ast.value + id;
    }
}

var AstToJavascript = {
    build: function(ast, context, isNewContext) {
        if (!ast) {
            // console.error("No ast given", ast);
            return "";
        }

        if (!this[ast.type]) {
            if (!ast.length) {
                console.error("Unknown type", ast);
            }
            return "";
        }

        context = context || Context.default();

        if (ast.operation !== "definition" || isNewContext) {
            this.findVariables([ast], context.variables, ["variable", "function"]);
            this.getVariablesForContext(context);
        }

        var res = "";
        if (isNewContext) {
            res = this.getDefintionsForContext(context);
        }

        res += this[ast.type](ast, context);
        return res;
    },

    getDefintionsForContext: function(context) {
        var res = "";
        context.variables.reverse().forEach(function(variable) {
            var a = context.definitions[variable];
            if (a) {
                var r = AstToJavascript.build(a, context, false);
                // console.log("Add definition2", res, a);
                res += r + ";\n";
            }
        });
        return res;
    },

    getVariablesForContext: function(context) {
        var found = [];
        var foundOne = true;

        if (foundOne) {
            var foundOne = false;
            context.variables.forEach(function(variable) {
                var def = context.definitions[variable];

                if (def && found.indexOf(variable) == -1) {
                    this.findVariables([def], context.variables, ["variable", "function"]);
                    foundOne = true;
                    found.push(variable);
                }
            }, this)
        }
    },

    findVariables: function(args, variables, types) {
        if (!args) {
            return;
        }

        variables = variables || [];
        args.reduce((prev, arg) => {
            if (!arg) {
                return prev;
            }

            if (types.indexOf(arg.type) !== -1) {
                if (variables.indexOf(arg.value) == -1) {
                    prev.push(arg.value);
                }
            }

            this.findVariables(arg.parameters, variables, types);
            this.findVariables(arg.arguments, variables, types);

            return prev;
        }, variables);
    },

    operator: function(ast, context) {
        try {
            return AstToJavascript[ast.operation](ast, context);
        } catch(ex) {
            console.error(ex, ast);
        }
    },

    number:   returnValue(),
    variable: returnValue(),
    custom: function(ast, context) {
        if (ast.value instanceof Function) {
            return ast.value(ast, context);
        }
        return ast.value;
    },

    "function": function(ast, context) {
        return ast.value + "(" + ast.parameters.map(function(p) {
            return AstToJavascript.build(p, context, false)
        }).join(',') + ")";
    },

    abs: function(ast, context) {
        return "Math.abs(" + AstToJavascript.build(ast.arguments[0], context, false) + ")";
    },

    add:      basicOperation("+"),
    subtract: basicOperation("-"),
    positive: function(ast, context) {
        return "|" + AstToJavascript.build(ast.arguments[0], context, false);
    },
    negative: function(ast, context) {
        return "-" + AstToJavascript.build(ast.arguments[0], context, false);
    },
    multiply: basicOperation("*"),
    equality:   basicOperation("="),
    comma:   basicOperation(","),
    definition: function(ast, context) {
        if (ast.arguments[0] instanceof FunctionNode) {
            return "function " + AstToJavascript.build(ast.arguments[0], context, false) +
                " { return " +
                AstToJavascript.build(ast.arguments[1], context, false) +
                "; }";
        }
        return "var " + AstToJavascript.build(ast.arguments[0], context, false) + " = " + AstToJavascript.build(ast.arguments[1], context, false);
    },

    divide:   basicOperation("/"),

    plusminus: function(ast, context) {
        if (ast.arguments.length == 1) {
            var a = AstToJavascript.build(ast.arguments[0], context, false);
            return "(new MSet([" + a + ", -" + a + "]))";
        }

        var a = AstToJavascript.build(ast.arguments[0], context, false);
        var b = AstToJavascript.build(ast.arguments[1], context, false)
        return "(new MSet([" + a + " + " + b + ", " + a + " - " + b + "]))";
    },

    power: function(ast, context) {
        var x = AstToJavascript.build(ast.arguments[0], context, false);
        var y = AstToJavascript.build(ast.arguments[1], context, false);
        if (x == "e") {
            return "Math.exp(" + y + ")";
        }
        return "Math.pow(" + x + ", " + y + ")";
    },

    sqrt: function(ast, context) {
        return "(new MSet([Math.sqrt(" + AstToJavascript.build(ast.arguments[0], context, false) + "), " +
                         "-Math.sqrt(" + AstToJavascript.build(ast.arguments[0], context, false) + ")]))";
    },

    matrix: function(ast, context) {
        var matrix = ast.arguments[0];
        var res = matrix.rows.reduce(function(prev, row) {
            row.values.reduce(function(prev, col) {
                var val = AstToJavascript.build(col, context, false);
                prev.push(val);
                return prev;
            }, prev);

            return prev;
        }, []);

        return "(new Matrix(" + matrix.rows.length + ", [" + res.join(",") + "]))";
    },

    matrixRow: function(ast, context) {
        // ?
    }
}

if (tests) {
var MathE = "Math.E";

var Operators = require("Operator.js");
var Operator = Operators.Operator;
var NumberNode = Operators.NumberNode;
var MatrixNode = Operators.MatrixNode;
var RowNode = Operators.RowNode;
var AstNode = Operators.AstNode;
var Custom = Operators.Custom;
var Variable = Operators.Variable;
var FunctionNode = Operators.FunctionNode;

function BaseTest(ast, result, context) {
    this.name = "AstToJavascript " + result;
    this.run = function() {
        var js = AstToJavascript.build(ast, context, true);
        tests.is(js, result);
    }
}

tests.tests.push(new BaseTest(new Variable("aB"), "aB"));
tests.tests.push(new BaseTest(new NumberNode("12.5"), "12.5"));
tests.tests.push(new BaseTest(new Operator("equality", [
    new Operator("/", [
        new Operator("+", [
            new Operator("+", [
                new NumberNode(1),
                new NumberNode(2) ]),
            new NumberNode(3)
        ]),
        new NumberNode(3)
    ])
]), "(1 + 2 + 3) / 3 ="));

tests.tests.push(new BaseTest(new Operator("^", [
    new NumberNode(2), new NumberNode(2)
]), "Math.pow(2, 2)"));

tests.tests.push(new BaseTest(new NumberNode(2, {
    identifier: new NumberNode(2)
}), "2[2]"));

tests.tests.push(new BaseTest(new Operator("sqrt", [new NumberNode(4)]),
  "(new MSet([Math.sqrt(4), -Math.sqrt(4)]))"));

tests.tests.push(new BaseTest(new Operator("+", [
    new NumberNode(1),
    new Operator(plusMinus, [new NumberNode(4)]),
]), "(new MSet([4, -4])).add(1)"));

tests.tests.push(new BaseTest(new Operator("+", [
    new Operator(plusMinus, [new NumberNode(4)]),
    new Operator(plusMinus, [new NumberNode(4)]),
]), "(new MSet([4, -4])).add((new MSet([4, -4])))"));

tests.tests.push(new BaseTest(new Operator("definition", [
    new FunctionNode("f", [
        new Variable("x")
    ]), new Variable("x")
]), "function f(x) { return x; }"));

tests.tests.push(new BaseTest(new Operator("definition", [
    new FunctionNode("f", [
        new Variable("x"), new Variable("y")
    ]), new Operator("*", [
        new Variable("x"), new Variable("y")
    ])
]), "function f(x,y) { return x * y; }"));

tests.tests.push(new BaseTest(new Operator("definition", [
    new Variable("x"),
    new NumberNode("3")
]), "var x = 3"));

tests.tests.push(new BaseTest(new FunctionNode("cos", [
    new NumberNode("0")
]), "function cos(x) { return Math.cos(x); };\ncos(0)"))

tests.tests.push(new BaseTest(new FunctionNode("log", [
    new NumberNode("2")
]), "function log(x) { return Math.log10(x); };\nlog(2)"));

tests.tests.push(new BaseTest(new Operator("^", [
    new Variable("e"),
    new NumberNode("2")
]), "var e = " + MathE + ";\nMath.exp(2)"));

tests.tests.push(new BaseTest(new FunctionNode("log", [
    new NumberNode("2")
], { identifier: new NumberNode(2) }),
"function ln(x) { return Math.ln(x); };\nln(2)"));

var c = Context.default();
c.definitions["f"] = new Operator("definition", [
    new FunctionNode("f", [ new Variable("x") ]),
    new Variable("x")
]);

tests.tests.push(new BaseTest(new Operator("+", [
    new NumberNode("1"),
    new FunctionNode("f", [ new NumberNode("1") ])
]), "function f(x) { return x; };\n1 + f(1)", c));

tests.tests.push(new BaseTest(new Operator("abs", [
    new Operator("negative", [ new NumberNode(2) ])
]), "Math.abs(-2)"));

tests.tests.push(new BaseTest(new Operator(invisibleTimes, [
  new Variable("e"),
  new NumberNode(2)
]), "var e = Math.E;\ne * 2"));

}

exports.build = AstToJavascript.build.bind(AstToJavascript);

})
