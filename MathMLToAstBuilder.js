define(function (require, exports, module) {

var tests = require('tests');
// var tests = false;
var MSet = require("MSet").MSet;
var Matrix = require('Matrix').Matrix;
var Operators = require("Operator");
var Operator = Operators.Operator;
var NumberNode = Operators.NumberNode;
var MatrixNode = Operators.MatrixNode;
var RowNode = Operators.RowNode;
var AstNode = Operators.AstNode;
var Custom = Operators.Custom;
var Variable = Operators.Variable;
var FunctionNode = Operators.FunctionNode;

function MathMLToAstBuilder(node) {
    this.current = node;
    this.start = true;
}

MathMLToAstBuilder.prototype = {
    cache: new WeakMap(),
    start: true,
    current: null,

    clearCache: function(node) {
        if (!node) {
            return;
        }

        // console.log("Clear", node);
        this.cache.delete(node);

        for (var i = 0; i < node.childNodes.length; i++) {
            this.clearCache(node.childNodes[i]);
        }
    },

    build: function(lhs) {
        var node = this.current = this.next();

        if (!node) {
            return null;
        }

        if (this.cache.has(node)) {
            var res = this.cache.get(node);
            // console.log("Cache hit", node, res);
            return res;
        }

        if (this[node.nodeName]) {
            var res = this[node.nodeName](lhs);
            if (res) {
                this.cache.set(node, res);
            }

            return res;
        }

        console.log("not sure what to do with", node);
        return null;
    },

    next: function() {
        if (this.start) {
            this.start = false;
            return this.current;
        } else {
            return this.current.nextElementSibling;
        }
    },

    hasNext: function() {
        if (this.start && this.current) {
            return true;
        }

        if (this.current && this.current.nextElementSibling) {
            return true;
        }

        return false;
    },

    math: function(lhs) {
        var val = null;
        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        while (builder.hasNext()) {
            var res = builder.build(val);
            if (res) {
                val = res;
            }
        }
        return val;
    },

    mrow: function(lhs) {
        var val = null;
        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        while (builder.hasNext()) {
            var res = builder.build(val);
            if (res) {
                val = res;
                // console.log("Val", val);
            }
        }
        return val;
    },

    mo: function(lhs) {
        var res = Operator.prototype.build(this.current);
        if (res) {
            var ret = res;
            if (lhs) {
                if (res.precedence && lhs.precedence && lhs.precedence > res.precedence) {
                    var r = lhs.arguments[1];
                    ret = lhs;
                    lhs.arguments[1] = res;
                    lhs = r;
                }
                res.arguments.push(lhs);
            }

            var rhs;
            if (!lhs || res.isBinaryOp) {
                rhs = this.build();
                if (rhs) {
                    if (res.precedence && rhs.precedence && rhs.precedence > res.precedence) {
                        var l = rhs.arguments[0];
                        ret = rhs;
                        rhs.arguments[0] = res;
                        rhs = l;
                    }
                    res.arguments.push(rhs);
                }
            }

            return ret;
        }
        return lhs;
    },

    mi: function(lhs) {
        if (this.current.textContent == "") {
            return null;
        }

        var ret = new Variable(this.current);
        if (this.current.nextElementSibling && this.current.nextElementSibling.classList.contains('function')) {
            return this.build(ret);
        }
        return ret
    },

    mn: function(lhs) {
        if (this.current.textContent == "") {
            return null;
        }

        return new NumberNode(this.current);
    },

    msub: function(lhs) {
        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        var n = builder.build();
        n.identifier = builder.build();
        return n;
    },

    msqrt: function(lhs) {
        var ret = new Operator({ textContent: "sqrt" })
        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        var inside = builder.build();
        ret.arguments.push(inside);
        // console.log("In", ret);
        return ret;
    },

    mfenced: function(lhs) {
        function buildSet(node, type) {
            var ret = [];
            var builder = new MathMLToAstBuilder(this.current.firstElementChild);
            while (builder.hasNext()) {
                ret.push(builder.build());
            }

            return ret;

        }

        if (this.current.classList.contains("resultArray")) {
            return buildSet.call(this, this.current, "set");
        } else if (this.current.classList.contains("function")) {
            var parameters = buildSet.call(this, this.current, "parameters");
            return new FunctionNode(lhs, parameters);
        } else if (this.current.classList.contains("magnitude")) {
            var builder = new MathMLToAstBuilder(this.current.firstElementChild);
            var func = new FunctionNode("abs", {}, [builder.build()]);
            return func;
        } else {
            var builder = new MathMLToAstBuilder(this.current.firstElementChild);
            var res = builder.build();
            res.precedence = 2000;
            return res;
        }

        console.error("not sure what this fence is", this.current);
        return null;
    },

    mtable: function(lhs) {
        var ret = new MatrixNode(this.current);

        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        var row = builder.build();
        while (row) {
            ret.rows.push(row);
            row = builder.build();
        }
        return ret;
    },

    mtr: function(lhs) {
        var ret = new RowNode(this.current);

        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        var val = builder.build();
        while (val) {
            ret.values.push(val);
            val = builder.build();
        }
        return ret;
    },

    mtd: function(lhs) {
        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        return builder.build();
    },

    msup: function(lhs) {
        var ret = new Operator({ textContent: "^" });
        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        ret.arguments.push(builder.build());
        ret.arguments.push(builder.build());
        return ret;
    },

    mfrac: function(lhs) {
        var ret = new Operator({ textContent: "/" });

        var builder = new MathMLToAstBuilder(this.current.firstElementChild);
        ret.arguments.push(builder.build());
        ret.arguments.push(builder.build());

        return ret;
    }
}

//Operator.prototype.toString = function() {
//  return this.arguments[0] + " " + this.operation + " " + this.arguments[1];
//}

if (tests) {
var MathE = "Math.E";
var MathPI = "";
var DOMHelpers = require("DOMHelpers");
var AstToMathML = require("AstToMathML");

function KeyPressTest(dom, aAst) {
  this.name = "MathMLToAstBuilder " + dom.textContent;
  this.run = function() {
    try {
      var builder = new MathMLToAstBuilder(dom);
      var ast2 = builder.build();
      this.compareAst(ast2, aAst);
    } catch(ex) {
      tests.ok(false, ex);
    }
  }
}

KeyPressTest.prototype = {
  compareAst: function(ast, expected) {
    for (var i in expected) {
      if (ast[i] !== undefined) {
        if (Array.isArray(expected[i])) {
          for (var j = 0; j < expected[i].length; j++) {
            // console.log("Recurse1", i, j, expected[i][j]);
            this.compareAst(ast[i][j], expected[i][j]);
          }
        } else if (typeof expected[i] === "object") {
          // console.log("Recurse2", expected[i]);
          this.compareAst(ast[i], expected[i]);
        } else if (expected[i] instanceof Function) {
          // no op
        } else {
          tests.is(ast[i], expected[i], "Got correct field '" + i + "'");
        }
      } else {
        tests.is(ast[i], undefined, "Expected has no attribute " + i);
      }
    }

    for (var i in expected) {
      if (!(i in ast)) {
        tests.is(ast[i], undefined, "Ast has no attribute " + i);
      }
    }
  }
}

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
    DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "b" })
    ])
]), new Variable("b")));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("mi", { text:"aB" })
  ])
]), new Variable("aB")));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mn", { text: "1"})
  ]),
]), new NumberNode(1)));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mn", { text: "12.5" }),
  ]),
]), new NumberNode(12.5)));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mi", { text: "x"}),
    DOMHelpers.createNode("mo", { text: "+"}),
    DOMHelpers.createNode("mn", { text: "2"})
  ]),
]), new Operator("+", {}, [
  new Variable("x"),
  new NumberNode(2)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("mfrac", {}, [
      DOMHelpers.createNode("mn", { text: "2" }),
      DOMHelpers.createNode("mrow", {}, [
        DOMHelpers.createNode("mi", { text: "x" }),
      ]),
    ]),
  ])
]), new Operator("/", {}, [
    new NumberNode(2),
    new Variable("x")
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", {}, [
      DOMHelpers.createNode("mfrac", {}, [
        DOMHelpers.createNode("mn", { text: "2"}),
        DOMHelpers.createNode("mrow", {}, [
          DOMHelpers.createNode("mi", { text: "x"})
        ])
      ]),
      DOMHelpers.createNode("mo", { text: "-" }),
      DOMHelpers.createNode("mn", { text: "1" })
  ]),
]), new Operator("-", {}, [
  new Operator("/", {}, [
      new NumberNode(2),
      new Variable("x")
  ]),
  new NumberNode(1)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", {}, [
      DOMHelpers.createNode("mn", { text: 3}),
      DOMHelpers.createNode("mo", { text: "*" }),
      DOMHelpers.createNode("mfenced", { open: "(", closed: ")" }, [
          DOMHelpers.createNode("mrow", {}, [
              DOMHelpers.createNode("mn", { text: 1}),
              DOMHelpers.createNode("mo", { text: "+" }),
              DOMHelpers.createNode("mn", { text: 2}),
          ])
      ])
  ]),
]), new Operator("*", {}, [
    new NumberNode(3),
    new Operator("+", {}, [
        new NumberNode(1),
        new NumberNode(2),
    ]),
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", {}, [
      DOMHelpers.createNode("mfenced", { open: "(", closed: ")" }, [
          DOMHelpers.createNode("mrow", {}, [
              DOMHelpers.createNode("mn", { text: 1}),
              DOMHelpers.createNode("mo", { text: "+" }),
              DOMHelpers.createNode("mn", { text: 2}),
          ])
      ]),
      DOMHelpers.createNode("mo", { text: "*" }),
      DOMHelpers.createNode("mn", { text: 3}),
  ]),
]), new Operator("*", [
    new Operator("+", [
        new NumberNode(1),
        new NumberNode(2),
    ], { precedence: 2000 }),
    new NumberNode(3),
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mfrac", { class: "lhs" }, [
    DOMHelpers.createNode("mrow", {}, [
      DOMHelpers.createNode("mn", { text: "1" }),
      DOMHelpers.createNode("mo", { text: "+" }),
      DOMHelpers.createNode("mn", { text: "2" }),
      DOMHelpers.createNode("mo", { text: "+" }),
      DOMHelpers.createNode("mn", { text: "3" })
    ]),
    DOMHelpers.createNode("mrow", {}, [
      DOMHelpers.createNode("mn", { text: "3" }),
    ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "2"})
  ]),
]), new Operator("equality", [
  new Operator("/", [
    new Operator("+", [
      new Operator("+", [
        new NumberNode(1),
        new NumberNode(2)
      ]),
      new NumberNode(3)
    ]),
    new NumberNode(3)
  ]),
  new NumberNode(2)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("mn", { text: "1.5" }),
    DOMHelpers.createNode("mo", { text: "+" }),
    DOMHelpers.createNode("mn", { text: "1" })
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "2.5"})
  ]),
]), new Operator("equality", [
  new Operator("+", [
    new NumberNode(1.5),
    new NumberNode(1)
  ]),
  new NumberNode(2.5)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
       DOMHelpers.createNode("mn", { text: "1" }),
       DOMHelpers.createNode("mo", { text: "+" }),
       DOMHelpers.createNode("mn", { text: "1" }),
       DOMHelpers.createNode("mo", { text: "+" }),
       DOMHelpers.createNode("mn", { text: "1" })
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "3"})
  ])
]), new Operator("equality", [
  new Operator("+", [
    new Operator("+", [
        new NumberNode(1),
        new NumberNode(1)
    ]),
    new NumberNode(1)
  ]),
  new NumberNode(3)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("msup", {}, [
        DOMHelpers.createNode("mn", { text: "2" }),
        DOMHelpers.createNode("mrow", {}, [
          DOMHelpers.createNode("mn", { text: "2" })
        ]),
    ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "4"})
  ]),
]), new Operator("equality", [
  new Operator("^", [
      new NumberNode(2),
      new NumberNode(2),
  ]),
  new NumberNode(4)
])))

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("msub", {}, [
          DOMHelpers.createNode("mn", { text: "2" }),
          DOMHelpers.createNode("mrow", {}, [
            DOMHelpers.createNode("mn", { text: "2"}),
          ]),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "2"}),
  ]),
]), new Operator("equality", [
    new NumberNode(2, { identifier: new NumberNode(2) }),
    new NumberNode(2)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mn", { text: "4" }),
      ])
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", text: "", open: "[", close: "]", separators: "," }, [
      DOMHelpers.createNode("mn", {text: "-2"}),
      DOMHelpers.createNode("mn", {text: "2"}),
    ])
  ]),
]), new Operator("equality", [
    new Operator("sqrt", [
      new NumberNode(4),
    ]),
    [
      new NumberNode(-2),
      new NumberNode(2)
    ]
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("mn", {text: "1"}),
    DOMHelpers.createNode("mo", {text: "+"}),
    DOMHelpers.createNode("mrow", { class: "plusminus" }, [
      DOMHelpers.createNode("mn", {text: "3"}),
      DOMHelpers.createNode("mo", {text: plusMinus}),
      DOMHelpers.createNode("mn", {text: "4"}),
    ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", text: "", open: "[", close: "]", separators: "," }, [
      DOMHelpers.createNode("mn", { text: "0"}),
      DOMHelpers.createNode("mn", { text: "8"}),
    ]),
  ]),
]), new Operator("equality", [
    new Operator("+", [
      new NumberNode(1),
      new Operator(plusMinus, [
        new NumberNode(3),
        new NumberNode(4)
      ]),
    ]),
    [
      new NumberNode(0),
      new NumberNode(8)
    ]
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mn", { text: "4" }),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", text: "", open: "[", close: "]", separators: "," }, [
      DOMHelpers.createNode("mn", { text: "-2" }),
      DOMHelpers.createNode("mn", { text: "2" }),
    ]),
  ]),
]), new Operator("equality", [
    new Operator("sqrt", [
      new NumberNode(4)
    ]),
    [
      new NumberNode(-2),
      new NumberNode(2)
    ]
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mn", { text: "1" }),
      DOMHelpers.createNode("mo", { text: "+" }),
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mn", { text: "4" }),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", text: "", open: "[", close: "]", separators: "," }, [
      DOMHelpers.createNode("mn", {text: "-1" }),
      DOMHelpers.createNode("mn", {text: "3" }),
    ]),
  ]),
]), new Operator("equality", [
    new Operator("+", [
      new NumberNode(1),
      new Operator("sqrt", [
        new NumberNode(4)
      ]),
    ]),
    [
      new NumberNode(-1),
      new NumberNode(3)
    ]
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mn", { text: "4"}),
      ]),
      DOMHelpers.createNode("mo", { text: "+"}),
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mn", { text: "4"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", text: "", open: "[", close: "]", separators: "," }, [
      DOMHelpers.createNode("mn", {text: "-4"}),
      DOMHelpers.createNode("mn", {text: "0"}),
      DOMHelpers.createNode("mn", {text: "4"}),
    ]),
  ]),
]), new Operator("equality", [
    new Operator("+", [
      new Operator("sqrt", [
        new NumberNode(4)
      ]),
      new Operator("sqrt", [
        new NumberNode(4)
      ]),
    ]),
    [
      new NumberNode(-4),
      new NumberNode(0),
      new NumberNode(4)
    ]
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mn", { text: "1"}),
      DOMHelpers.createNode("mo", { text: "+"}),
      DOMHelpers.createNode("mn", { text: "2"}),
      DOMHelpers.createNode("mo", { text: "*"}),
      DOMHelpers.createNode("mn", { text: "3"}),
      DOMHelpers.createNode("mo", { text: "-"}),
      DOMHelpers.createNode("mn", { text: "4"}),
  ]),
]), new Operator("-", [
    new Operator("+", [
        new NumberNode(1),
        new Operator("*", [
            new NumberNode(2),
            new NumberNode(3),
        ]),
    ]),
    new NumberNode(4),
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mn", { text: "1"}),
      DOMHelpers.createNode("mo", { text: "*"}),
      DOMHelpers.createNode("mn", { text: "2"}),
      DOMHelpers.createNode("mo", { text: "+"}),
      DOMHelpers.createNode("mn", { text: "3"}),
      DOMHelpers.createNode("mo", { text: "/"}),
      DOMHelpers.createNode("mn", { text: "4"}),
  ]),
]), new Operator("+", [
    new Operator("*", [
        new NumberNode(1),
        new NumberNode(2)
    ]),
    new Operator("/", [
        new NumberNode(3),
        new NumberNode(4)
    ]),
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mn", { text: "1"}),
      DOMHelpers.createNode("mo", { text: "+"}),
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mn", {text: "4"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", text: "", open: "[", close: "]", separators: "," }, [
      DOMHelpers.createNode("mn", { text: "-1" }),
      DOMHelpers.createNode("mn", { text: "3" }),
    ]),
  ]),
]), new Operator("equality", [
    new Operator("+", [
      new NumberNode(1),
      new Operator("sqrt", [
        new NumberNode(4)
      ]),
    ]),
    [
      new NumberNode(-1),
      new NumberNode(3)
    ],
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mi", {text: "f"}),
      DOMHelpers.createNode("mfenced", { class: "function", text: "", open: "(", close: ")", separators: ""}, [
        DOMHelpers.createNode("mi", {text: "x"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "definition", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs" }, [
    DOMHelpers.createNode("mi", { text: "x"}),
  ]),
]), new Operator("definition", {}, [
    new FunctionNode("f", {}, [
      new Variable("x")
    ]),
    new Variable("x")
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mi", {text: "x"}),
  ]),
  DOMHelpers.createNode("mo", { class: "definition", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs" }, [
    DOMHelpers.createNode("mn", { text: "3"}),
  ]),
]), new Operator("definition", {}, [
    new Variable("x"),
    new NumberNode("3")
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mi", {text: "cos"}),
      DOMHelpers.createNode("mfenced", { class: "function", text: "", open: "(", close: ")", separators: "" }, [
        DOMHelpers.createNode("mn", {text: "0"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "1"}),
  ]),
]), new Operator("equality", {}, [
    new FunctionNode("cos", [
      new NumberNode(0)
    ]),
    new NumberNode(1)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mi", {text: "tan"}),
      DOMHelpers.createNode("mfenced", { class: "function", text: "", open: "(", close: ")", separators: "" }, [
        DOMHelpers.createNode("mn", {text: "0"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "0"}),
  ]),
]), new Operator("equality", [
    new FunctionNode("tan", [
      new NumberNode(0)
    ]),
    new NumberNode(0)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mi", { text: "log" }),
      DOMHelpers.createNode("mfenced", { class: "function", text: "", open: "(", close: ")", separators: "" }, [
        DOMHelpers.createNode("mn", { text: "2"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "" + Math.log10(2) }),
  ]),
]), new Operator("equality", {}, [
    new FunctionNode("log", {}, [
      new NumberNode(2)
    ]),
    new NumberNode(Math.log10(2))
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
      DOMHelpers.createNode("mi", { text: "sin"}),
      DOMHelpers.createNode("mfenced", { class: "function", text: "", open: "(", close: ")", separators: "" }, [
        DOMHelpers.createNode("mn", { text: "0"}),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "0"}),
  ]),
]), new Operator("equality", {}, [
    new FunctionNode("sin", {}, [
      new NumberNode(0)
    ]),
    new NumberNode(0)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("msup", {}, [
      DOMHelpers.createNode("mi", { text: "e" }),
      DOMHelpers.createNode("mrow", {}, [
        DOMHelpers.createNode("mn", { text: "0" }),
      ]),
    ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "1" }),
  ]),
]), new Operator("equality", [
    new Operator("^", [
      new Variable("e"),
      new NumberNode(0)
    ]),
    new NumberNode(1)
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("msup", {}, [
      DOMHelpers.createNode("mi", { text: "e"}),
      DOMHelpers.createNode("mrow", {}, [
        DOMHelpers.createNode("msup", {}, [
          DOMHelpers.createNode("mi", { text: "x"}),
          DOMHelpers.createNode("mrow", {}, [
            DOMHelpers.createNode("mn", { text: "2"}),
          ]),
        ]),
      ]),
    ]),
  ]),
]), new Operator("^",  [
    new Variable("e"),
    new Operator("^",  [
        new Variable("x"),
        new NumberNode(2)
    ]),
])));

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    DOMHelpers.createNode("mi", { text: "e"}),
    DOMHelpers.createNode("mo", { text: invisibleTimes}),
    DOMHelpers.createNode("mn", { text: "2"}),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mn", { text: "5.43656365691809" })
  ]),
]), new Operator("equality", [
    new Operator("*", [
      new Variable("e"),
      new NumberNode(2)
    ]),
    new NumberNode(Math.E * 2)
])));

function MatrixBuilder(matrix) {
}

tests.tests.push(new KeyPressTest(DOMHelpers.createNode("math", {}, [
  DOMHelpers.createNode("mrow", { class: "lhs" }, [
    AstToMathML.convert(new Matrix(2, [1,2,3,4])),
    DOMHelpers.createNode("mo", { text: "+"}),
    AstToMathML.convert(new Matrix(2, [1,2,3,4])),
  ])
]), new Operator("+", [
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
])));

}

exports.create = function(node) { return new MathMLToAstBuilder(node); }
exports.clearCache = MathMLToAstBuilder.prototype.clearCache.bind(MathMLToAstBuilder.prototype);

})
