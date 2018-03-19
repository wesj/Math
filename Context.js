define(function (require, exports, module) {

var Operators = require("Operator");
var Operator = Operators.Operator;
var FunctionNode = Operators.FunctionNode;
var Variable = Operators.Variable;
var Custom = Operators.Custom;
var NumberNode = Operators.NumberNode;

function MathHelper(name) {
    var ret = new Operator("definition", [
        new FunctionNode(name, [ new Variable("x") ]),
        new Custom("Math." + name + "(x)", function(context) {
            var x = context.definitions.x;

            var AstEvaluator = require("AstEvaluator");
            var res = AstEvaluator.evaluate(x.arguments[1]);
            if (!isNaN(res)) {
                return Math[name](res);
            }

            return new FunctionNode(name, [ res ]);
        })
    ]);

    return ret;
}

function LogFunction() {
    var jsFunction = function(ast, context) {
        var base = 10;
        if (ast.identifier && ast.identifier instanceof NumberNode) {
            base = ast.identifier.value;
        }

        switch(base) {
            case 10: return "Math.log10(x)"
            case 2: return "Math.log2(x)"
            case Math.E: return "Math.log(x)"
            default: return "Math.log(x) / Math.log(" + base + ")"
        }
    }

    var evalFunction = function(context, original) {
        var base = 10;
        if (original.identifier && original.identifier instanceof NumberNode) {
            base = original.identifier.value;
        }

        var x = context.definitions.x;
        var AstEvaluator = require("AstEvaluator");
        var val = AstEvaluator.evaluate(x.arguments[1]);
        if (!isNaN(val)) {
            switch(base) {
                case 10: return Math.log10(val);
                case 2: return Math.log2(val);
                case Math.E: return Math.log(val);
                default: return Math.log(val) / Math.log(base);
            }
        }

        return new FunctionNode("log", [ x.arguments[1] ]);
    }

    Operator.call(this, "definition", [
        new FunctionNode("log", [ new Variable("x") ]),
        new Custom(jsFunction, evalFunction)
    ]);
}
LogFunction.prototype = Operator.prototype;

function Context(context) {
    if (context) {
        this.definitions = context.definitions;
        this.variables = context.variables;
    } else {
        this.definitions = {};
        this.variables = {};
        this.definitions.acos = new MathHelper("acos");
        this.definitions.acosh = new MathHelper("acosh");
        this.definitions.cos = new MathHelper("cos");
        this.definitions.cosh = new MathHelper("cosh");

        this.definitions.asin = new MathHelper("asin");
        this.definitions.asinh = new MathHelper("asinh");
        this.definitions.sin = new MathHelper("sin");
        this.definitions.sinh = new MathHelper("sinh");

        this.definitions.atan = new MathHelper("atan");
        this.definitions.atanh = new MathHelper("atanh");
        this.definitions.tan = new MathHelper("tan");
        this.definitions.tanh = new MathHelper("tanh");
        this.definitions.abs = new MathHelper("abs");

        this.definitions.log = new LogFunction();

        this.definitions.round = new MathHelper("round");

        this.definitions["π"] = new Operator("definition", [
            new Variable("π"),
            new Custom("Math.PI", function() { return Math.PI; }),
        ]);

        this.definitions.e = new Operator("definition", [
            new Variable("e"),
            new Custom("Math.E", function() { return Math.E; }),
        ]);
    }
}

exports.default = function(context) { return new Context(context) };

})
