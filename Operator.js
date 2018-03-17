define(function (require, exports, module) {

if (window.__Operators__) {
    for (var i in window.__Operators__) {
        exports[i] = window.__Operators__[i];
    }
    return;
}

var tests = require('tests');

function MatrixNode(node, rows) {
    this.type = "matrix";
    this.value = "";
    this.rows = rows || [];
    this.equals = function(ast) {
        if (ast instanceof MatrixNode) {
            return ast.rows.length == this.rows.length && ast.rows.every(function(arg, index) {
                return tests.compare(arg, this.rows[index]);
            }, this)
        }
        return false;
    }

    this.toString = function() {
        return "[" + this.rows.map(function(arg) { return arg.toString(); }).join(",") + "]";
    }

    /*
    this.add = function(a, b) { return a.add(b); }
    this.subtract = function(a, b) { return a.subtract(b); }
    this.times = function(a, b) { return a.multiply(b); }
    this.divide = function(a, b) { return a.divide(b); }
    */
}

function RowNode(node, cols) {
    this.type = "matrixRow";
    this.value = "";
    this.values = cols || [];
    this.equals = function(ast) {
        if (ast instanceof RowNode) {
            return ast.values.length == this.values.length && ast.values.every(function(arg, index) {
                return tests.compare(arg, this.values[index]);
            }, this)
        }
        return false;
    }
    this.toString = function() {
        return "[" + this.values.map(function(arg) { return arg.toString(); }).join(",") + "]";
    }
}

function Custom(val, evaluate) {
    this.type = "custom";
    this.value = val;
    this.evaluate = evaluate;

    this.equals = function(ast) {
        if (ast instanceof Custom) {
            return ast.value == this.value &&
                   ast.evaluate() == this.evaluate();
        }
        return false;
    }

    this.toString = function() {
        return this.value;
    }
}

function Variable(node, options) {
    options = options || {};
    if (node.textContent) {
        this.value = node.textContent;
    } else {
        this.value = node;
    }
    this.precedence = 0;
    this.type = "variable";

    this.equals = function(ast) {
        if (ast instanceof Variable) {
            return ast.value == this.value;
        }
        return false;
    }
    this.toString = function() {
        if (this.identifier) {
            return this.value + "_" + this.identifier.toString();
        }
        return this.value;
    }
}

function SetNode(node, arguments, options) {
    options = options || {};
    this.type = "set";
    this.arguments = arguments || [];

    if (node.textContent) {
        this.value = node.textContent;
    } else {
        this.value = node;
    }

    this.equals = function(ast) {
        if (ast instanceof SetNode) {
            return ast.arguments.every(function(arg, index) {
                return tests.compare(arg, this.arguments[index]);
            }, this)
        }
        return false;
    }

    this.toString = function() {
        return "[" + this.arguments.map(function(arg) {
            return arg.toString();
        }).join(",") + "]";
    }
}

function FunctionNode(node, parameters, options) {
    options = options || {};
    this.parameters = parameters || [];
    this.identifier = options.identifier;
    this.type = "function";

    if (node.textContent) {
        this.value = node.textContent;
    } else if (node.value) {
        this.value = node.value;
        this.identifier = options.identifer;
    } else {
        this.value = node;
    }

    // console.log(node, parameters);
    this.toString = function() {
        return this.value + "(" + this.parameters.map(function(param) {
            if (param) {
                return param.toString();
            } else return "WTF";
        }).join(",") + ")";
    }

    this.equals = function(ast) {
        if (ast instanceof FunctionNode) {
            return ast.value == this.value &&
                this.parameters.length == ast.parameters.length &&
                ast.parameters.every(function(param, index) {
                    return tests.compare(param, this.parameters[index]);
                }, this);
        }
        return false;
    }
}

function NumberNode(node, options) {
    options = options || {};
    if (node.textContent) {
        this.value = parseFloat(node.textContent);
    } else {
        this.value = parseFloat(node);
    }
    this.identifier = options.identifier;
    this.type = "number";

    this.equals = function(ast) {
        if (ast instanceof NumberNode) {
            return ast.value == this.value;
        }
        return false;
    }
    this.toString = function() {
        if (this.identifier) {
            return this.value + "_" + this.identifier.toString();
        }
        return this.value;
    }
}

function Operator(node, arguments, options) {
    options = options || {};

    this.type = "operator";
    this.arguments = arguments || [];
    this.equals = function(ast) {
        if (ast instanceof Operator) {
            return ast.operation === this.operation &&
                   ast.precedence === this.precedence &&
                   ast.arguments.every(function(val, index) {
                        return tests.compare(val, this.arguments[index]);
                   }, this);
        }
        return false;
    }

    if (node instanceof Operator) {
        this.operation = node.operation;
        this.identifier = node.identifier;
        this.precedence = node.precedence;
        this.isBinaryOp = node.isBinaryOp;
        return;
    }

    var name = node;
    if (node.textContent) {
        name = node.textContent;
    }

    if (OperatorNodes[name]) {
        OperatorNodes[name].call(this, node);
    } else {
        if (name) {
            console.error("Unknown operator " + name);
        }
    }

    if (options.precedence) {
        this.precedence = options.precedence;
    }
}

Operator.prototype = {
    toString: function() {
        if (this.isBinaryOp) {
            var ret = this.arguments[0] ? this.arguments[0].toString() : "''";
            ret += " ";
            ret += this.operation + " ";
            ret += this.arguments[1] ? this.arguments[1].toString() : "''";
            return ret;
        }
        return this.operation + " " + this.arguments[0];
    },

    build: function(node) {
        if (node.textContent == "]") {
            return null;
        }
        return new Operator(node);
    },
}

var OperatorNodes = {
    "sqrt": function(node) {
        this.operation = "sqrt";
    },

    abs: function(node) {
        this.operation = "abs";
    },

    "+": function(node) {
        if (node.previousElementSibling) {
            var prev = node.previousElementSibling;
            if (prev.nodeName == "mo" && prev.textContent != "]") {
                return OperatorNodes.positive.call(this, node);
            }
        }

        this.isBinaryOp = true;
        this.precedence = 4000;
        this.operation = "add";
    },

    "positive": function(node) {
        this.isRightAssociative = true;
        this.operation = "positive";
    },

    "negative": function(node) {
        this.isRightAssociative = true;
        this.operation = "negative";
    },

    "-": function(node) {
        if (this.arguments.length == 1) {
            return OperatorNodes.negative.call(this, node);
        }

        this.isBinaryOp = true;
        this.precedence = 4000;
        this.operation = "subtract";
    },

    "*": function(node) {
        this.isBinaryOp = true;
        this.precedence = 3000;
        this.operation = "multiply";
    },

    "/": function(node) {
        this.isBinaryOp = true;
        this.precedence = 3000;
        this.operation = "divide";
    },

    "^": function(node) {
        this.isBinaryOp = true;
        this.operation = "power"
    },

    ",": function(node) {
        this.operation = "comma"
    },

    "[": function(node) {
        this.isRightAssociative = true;
        this.operation = "matrix";
    },

    "]": function(node) {
        return undefined;
    },

    "equality": function(node) {
        this.operation = "equality";
        this.isBinaryOp = true;
    },

    "definition": function(node) {
        this.operation = "definition";
        this.isBinaryOp = true;
        this.precedence = 5000;
    }
}

OperatorNodes["="] = function(node) {
    if (node.classList) {
        if (node.classList.contains("equality")) {
            OperatorNodes.equality.call(this);
        } else {
            OperatorNodes.definition.call(this);
        }
    } else {
        throw "Undefined. Use 'equality' or 'definition'";
    }
}

OperatorNodes[invisibleTimes] = function(node) {
    OperatorNodes["*"].call(this, node);
}

OperatorNodes[plusMinus] = function(node) {
    this.precedence = 1;
    this.operation = "plusminus";
    this.isBinaryOp = true;

    // TODO: This is part of AstToJavascript... remove it
    this.add = function(a, b) {
        return a + ".add(" + b + ")";
    }
}

exports.Operator = Operator;
exports.NumberNode = NumberNode;
exports.MatrixNode = MatrixNode;
exports.RowNode = RowNode;
exports.Custom = Custom;
exports.Variable = Variable;
exports.FunctionNode = FunctionNode;
window.__Operators__ = exports;

})