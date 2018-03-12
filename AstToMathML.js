define(function (require, exports, module) {
var createNode = require("DOMHelpers").createNode;
var MSet = require('MSet').MSet;
var Matrix = require('Matrix').Matrix;
var tests = require('tests');

var AstToMathML = {
    convertNumber: function(num) {
        var ret = createNode("mn", { text: num });
        return ret;
    },

    convertMSet: function(set) {
        var node = createNode("mfenced", {
            open: "[",
            close: "]",
            separators: ",",
            class: "resultArray"
        }, set.vals.map(function(val) {
            return createNode("mn", { text: val });
        }, this));

        return node;
    },

    convertMatrix: function(matrix) {
        var open = createNode("mfenced", { open: "[", close: "]", separators: "," });
        var node = createNode("mtable", { });
        open.appendChild(node);

        for (var i = 0; i < matrix.rows; i++) {
            var row = createNode("mtr", { })
            node.appendChild(row);
            for (var j = 0; j < matrix.cols; j++) {
                var m = matrix.value(i, j);
                if (m && !m.nodeName) {
                    m = this.convert(m);
                } else if (!m.nodeName) {
                    m = createNode("mi", {text: emptyBox});
                }

                var col = createNode("mtd", {}, [m]);
                row.appendChild(col);
            }
        }

        return [open];
    },

    convert: function(ast) {
        if (typeof ast === "number") {
            return this.convertNumber(ast);
        } else if (ast instanceof MSet) {
            return this.convertMSet(ast);
        } else if (ast instanceof Matrix) {
            return this.convertMatrix(ast);
        } else if (ast && ast.type && this[ast.type]) {
            return this[ast.type](ast);
        } else if (ast === emptyBox) {
            return this.convertNumber(NaN);
        } else {
            console.error("Unable to convert", ast);
        }
    },

    number: function(ast) {
        var ret = createNode("mn", {text: ast.value})
        return ret;
    },

    variable: function(ast) {
        var ret = createNode("mi", {text: ast.value})
        return ret;
    },

    custom: function(ast) {
        var ret = createNode("mi", {text: ast.value})
        return ret;
    },

    "function": function(ast) {
        var mi = createNode("mi", {text: ast.value});
        var params = createNode("mfenced", {
            open: "(",
            close: ")",
            separators: ",",
            class: "function"
        }, f.parameters.map(function(param) {
            return this.convert(param)
        }, this));
        return [mi, params];
    },

    operator: function(ast) {
        return this[ast.operation](ast);
    },

    abs: function(ast, context, original) {
        var params = createNode("mfenced", {
            open: "|",
            close: "|",
            separators: ",",
            class: "magnitude"
        }, f.parameters.map(function(param) {
            return this.convert(param)
        }, this));
        return params;
    },

    add: function(ast, context, original) {
        return [
            this.convert(ast.arguments[0]),
            createNode("mo", {text: "+"}),
            this.convert(ast.arguments[1]),
        ].flatten(1000)
    },

    subtract: function(ast, context, original) {
        return [
            this.convert(ast.arguments[0]),
            createNode("mo", {text: "-"}),
            this.convert(ast.arguments[1]),
        ].flatten(1000)
    },

    positive: function(ast, context, original) {
        return [
            createNode("mo", {text: "+"}),
            this.convert(ast.arguments[0]),
        ].flatten(1000)
    },

    negative: function(ast, context, original) {
        return [
            createNode("mo", {text: "-"}),
            this.convert(ast.arguments[0]),
        ].flatten(1000)
    },

    multiply: function(ast, context, original) {
        return [
            this.convert(ast.arguments[0]),
            createNode("mo", {text: invisibleTimes}),
            this.convert(ast.arguments[1]),
        ].flatten(1000)
    },

    equality: function(ast, context, original) {
        return [
            this.convert(ast.arguments[0]),
            createNode("mo", {text: "=", class: "equality"}),
            this.convert(ast.arguments[1]),
        ].flatten(1000)
    },

    comma: function(ast, context, original) {
        return null;
    },

    definition: function(ast, context, original) {
        return [
            this.convert(ast.arguments[0]),
            createNode("mo", {text: "=", class: "definition"}),
            this.convert(ast.arguments[1]),
        ].flatten(1000)
    },

    divide: function(ast, context, original) {
        return createNode("mfrac", {}, [
            createNode("mrow", {}, [
                this.convert(ast.arguments[0])
            ]),
            createNode("mrow", {}, [
                this.convert(ast.arguments[1])
            ])
        ])
    },

    plusminus: function(ast, context, original) {
        return [
            createNode("mo", { text: plusMinus }),
            this.convert(ast.arguments[0]),
        ].flatten(1000)
    },

    power: function(ast, context, original) {
        return createNode("msup", {}, [
            this.convert(ast.arguments[0]),
            this.convert(ast.arguments[1]),
        ])
    },

    sqrt: function(ast, context, original) {
        return createNode("msqrt", {}, [
            this.convert(ast.arguments[0]),
            this.convert(ast.arguments[1]),
        ])
    },

    matrix: function(ast, context) {
        var vals = [];

        for (var i = 0; i < ast.rows.length; i++) {
            var row = ast.rows[i];
            var rowAst = this.convert(ast.rows[i]);
            vals = vals.concat(rowAst);
        }

        return this.convert(new Matrix(ast.rows.length, vals))
    },

    matrixRow: function(ast) {
        var ret = [];
        for (var j = 0; j < ast.values.length; j++) {
            var val = ast.values[j];
            ret.push(this.convert(val));
        }
        return ret;
    }
}

if (tests) {
var Operator = require('Operator');
function Test(ast, output) {
    this.name = "AstToMathML " + ast.toString();
    this.run = function() {
        var mathml = AstToMathML.convert(ast);
        if (mathml.forEach) {
            mathml.forEach(function(node, index) {
                tests.verifyNode(node, output[index]);
            })
        } else {
            tests.verifyNode(mathml, output);
        }
    }
}

tests.tests.push(new Test(
    new Operator.Variable("b"),
    createNode("mi", { text:"b" })
));

tests.tests.push(new Test(
    new Operator.NumberNode("1.23"),
    createNode("mn", { text:"1.23" })
));

tests.tests.push(new Test(
    new Operator.NumberNode("1.23"),
    createNode("mn", { text:"1.23" })
));

tests.tests.push(new Test(
    new Operator.Operator("+", [
        new Operator.Operator("-", [
            new Operator.Variable("x"),
            new Operator.NumberNode(1.23)
        ]),
        new Operator.NumberNode(1.23)
    ]), [
        createNode("mi", { text:"x" }),
        createNode("mo", { text:"-" }),
        createNode("mn", { text:"1.23" }),
        createNode("mo", { text:"+" }),
        createNode("mn", { text:"1.23" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator("*", [
        new Operator.Variable("x"),
        new Operator.NumberNode(1.23)
    ]), [
        createNode("mi", { text:"x" }),
        createNode("mo", { text:"*" }),
        createNode("mn", { text:"1.23" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator("/", [
        new Operator.Variable("x"),
        new Operator.NumberNode(1.23)
    ]), createNode("mfrac", {}, [
        createNode("mrow", {} , [ createNode("mi", { text:"x" }) ]),
        createNode("mrow", {} , [ createNode("mn", { text:"1.23" }) ]),
    ])
));

tests.tests.push(new Test(
    new Operator.Operator("positive", [
        new Operator.Variable("x"),
    ]), [
        createNode("mo", { text:"+" }),
        createNode("mi", { text:"x" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator("negative", [
        new Operator.NumberNode("12"),
    ]), [
        createNode("mo", { text:"-" }),
        createNode("mn", { text:"12" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator("equality", [
        new Operator.Variable("x"),
        new Operator.NumberNode(12),
    ]), [
        createNode("mi", { text:"x" }),
        createNode("mo", { text:"=", class: "equality" }),
        createNode("mn", { text:"12" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator("definition", [
        new Operator.Variable("x"),
        new Operator.NumberNode(12),
    ]), [
        createNode("mi", { text:"x" }),
        createNode("mo", { text:"=", class: "definition" }),
        createNode("mn", { text:"12" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator(plusMinus, [
        new Operator.NumberNode(12),
    ]), [
        createNode("mo", { text:plusMinus }),
        createNode("mn", { text:"12" })
    ])
);

tests.tests.push(new Test(
    new Operator.Operator("^", [
        new Operator.NumberNode(12),
        new Operator.NumberNode(2),
    ]), createNode("msup", {}, [
        createNode("mn", { text:"12" }),
        createNode("mn", { text:"2" })
    ])
));

tests.tests.push(new Test(
    new Operator.Operator("sqrt", [
        new Operator.NumberNode(12),
    ]), createNode("msqrt", {}, [
        createNode("mn", { text:"12" }),
    ])
));

tests.tests.push(new Test(
    new Operator.MatrixNode(null, [
        new Operator.RowNode(null, [
            new Operator.NumberNode(1),
            new Operator.NumberNode(2)
        ]),
        new Operator.RowNode(null, [
            new Operator.NumberNode(3),
            new Operator.NumberNode(4)
        ])
    ]), [
        createNode("mfenced", {open: "[", close: "]", separators: ","}, [
            createNode("mtable", {}, [
                createNode("mtr", {}, [
                    createNode("mtd", {}, [createNode("mn", {text: 1})]),
                    createNode("mtd", {}, [createNode("mn", {text: 2})]),
                ]),
                createNode("mtr", {}, [
                    createNode("mtd", {}, [createNode("mn", {text: 3})]),
                    createNode("mtd", {}, [createNode("mn", {text: 4})]),
                ]),
            ]),
        ]),
    ]
));

}

exports.convert = AstToMathML.convert.bind(AstToMathML);
});
