define(function (require, exports, module) {

var tests = require('tests');
var DOMHelpers = require('DOMHelpers');
var Context = require("Context");
var SelectionHandler = require("SelectionHandler");
var Editors = require("Editors");
var AstEvaluator = require("AstEvaluator");
var AstToJavascript = require("AstToJavascript");
var AstToMathML = require("AstToMathML");
var MathMLToAstBuilder = require("MathMLToAstBuilder");

function MathEditor(aRoot) {
    this.type = "math";
    this.rootNode = null;
    this.lhs = null;
    this.rhs = null;
    this.startEdit(aRoot);
}

MathEditor.prototype = {
    handleResize: function(aEvent) { },

    deselect: function() {
        SelectionHandler.setCursor(null, 0);
    },

    isFenced: function(char, node) {
        var n = node.parentNode;
        while(n && n.nodeName != "mfenced" && (!n.getAttribute || n.getAttribute("close") !== char)) {
            n = n.parentNode;
        }

        return n;
    },

    startEdit: function(aRoot) {
        this.rootNode = DOMHelpers.createNode("math");
        if (aRoot) {
            aRoot.appendChild(this.rootNode);
        }

        this.lhs = DOMHelpers.createNode("mrow", { class: "lhs" });
        this.rootNode.appendChild(this.lhs);

        var r = DOMHelpers.createNode("mi", { text: emptyBox });
        this.lhs.appendChild(r);
        SelectionHandler.setCursor(r, 0);
    },

    handleEvent: function(aEvent) {
        var node = SelectionHandler.selectedNode();
        var c = String.fromCharCode(aEvent.charCode);
        var newNode;
        var mathElt = this.rootNode;

        // TODO: Move to editors
        var handler = Editors.canHandle(c, node, aEvent);
        if (handler) {
            aEvent.preventDefault();
            newNode = handler.handleKey(c, node, aEvent);
            if (newNode) {
                SelectionHandler.setCursor(newNode, newNode.textContent.length);
            }
        } else {
            // console.log("Unknown: " + aEvent.charCode + ", " + aEvent.keyCode);
            return false;
        }

        var eq = this.getEquality(mathElt);
        MathMLToAstBuilder.clearCache(this.rootNode);
        isDefinition = this.looksLikeDefinition();
        if (eq && isDefinition) {
            eq.classList.remove("equality");
            eq.classList.add("definition");
            if (!this.rhs) {
                this.rhs = DOMHelpers.appendNewNode("mrow", {}, eq);
                this.rhs.classList.add("rhs");
            }
            SelectionHandler.setCursor(this.rhs);
        }

        this.lhs = this.rootNode.querySelector(".lhs");

        if (eq && !isDefinition) {
            // TODO: Seems like we're removing a lot here...
            while (this.rhs) {
                this.rhs.parentNode.removeChild(this.rhs);
                this.rhs = null;
            }

            if (!this.rhs) {
                this.rhs = DOMHelpers.appendNewNode("mrow", {}, eq);
                this.rhs.classList.add("rhs");
                this.rhs.classList.add("generated");
            }
            var txt = this.evalCurrent();
            var convert = AstToMathML.convert(txt);
            DOMHelpers.appendChildren(convert, this.rhs);
            MathMLToAstBuilder.clearCache(this.rootNode);
        }
        return true;
    },

    looksLikeDefinition: function() {
        var builder = MathMLToAstBuilder.create(this.lhs);
        var ast = builder.build();
        if (!ast) {
            return false;
        }

        if (ast.type === "function") {
            var allVariables = ast.parameters.reduce(function(prev, param) {
                return prev && param && param.type === "variable";
            }, true);
            return allVariables;
        }

        return ast.type === "variable";
    },

    getEquality: function(aRoot) {
        if (!aRoot) return null;
        return aRoot.querySelector("mo.equality");
    },

    functionRegEx: /^([a-zA-Z])\([a-zA-Z,]*\)$/,

    getVars: function() {
        var res = [];
        var vars = this.rootNode.querySelectorAll("mi");
        var txt = this.getJSFor(this.lhs);
        //var lhsstring = this.functionRegEx.exec(txt);
        //if (!lhsstring) lhsstring = txt;
        //else lhsstring = lhsstring[1];

        for (var i = 0; i < vars.length; i++) {
            var varString = this.getJSFor(vars[i]);
            // only add if this looks doesn't look like the thing we are defining
            if (varString && res.indexOf(varString) == -1) {
                res.push(varString);
            }
        }
        console.log(res);
        return res;
    },

    getCurrentContext: function() {
        var maths = document.getElementsByTagName("math");
        var context = Context.default();
        for (var i = 0; i < maths.length; i++) {
            var node = maths[i];
            if (node === this.rootNode) {
                break;
            }

            var builder = MathMLToAstBuilder.create(node);
            var def = builder.build();
            if (def && def.type == "operator" && def.operation === "definition") {
                context.definitions[def.arguments[0].value] = def;
            }
        }
        return context;
    },

    evalCurrent: function() {
        var eq = this.getEquality();

        var context = this.getCurrentContext();

        try {
            var builder = MathMLToAstBuilder.create(this.rootNode);
            var ast = builder.build();
            var ret = AstEvaluator.evaluate(ast, context);
            // console.log("Ret", ast, ret);
            Editor.reportError("", this.rootNode);
            return ret;
        } catch(ex) {
            Editor.reportError(ex, this.rootNode);
            console.error(ex);
        }
    },

    isEmpty: function(aNode) {
        if (aNode.childNodes.count > 0) {
          return true;
        }
        if (aNode.nodeName == "mrow") {
            return false;
        }
        return !aNode.textContent || aNode.textContent == emptyBox;
    },

    multiplyCurrent: function(aChar, aNode, aNewNodeName) {
        var newNode = DOMHelpers.appendNewNode("mo", { text: invisibleTimes }, aNode);
        return DOMHelpers.appendNewNode(aNewNodeName, { text: aChar }, newNode);
    },

    toJSString: function() {
        var context = this.getCurrentContext();
        return this.getJSFor(this.rootNode, context) + "; ";
    },

    getJSFor: function(aNode, context) {
        try {
            var builder = MathMLToAstBuilder.create(aNode);
            var ast = builder.build();
            var js = AstToJavascript.build(ast, context, true);
            // console.log("getJSFor", aNode, ast, js);
            return js;
        } catch(ex) {
            console.error(ex);
        }

        return "";
    },
}

if (tests) {

function KeyPressTest(aKeys, MathMLDOM) {
  this.name = "MathEditor " + aKeys;
  this.run = function() {
    try {
        var editor = new MathEditor();
        for(var i = 0; i < aKeys.length; i++) {
            tests.sendKey(aKeys.charCodeAt(i), aKeys.charCodeAt(i), editor);
        }

        var root = editor.rootNode;
        for (var i = 0; i < MathMLDOM.length; i++) {
            tests.verifyNode(root.childNodes[i], MathMLDOM[i]);
        }
    } catch(ex) {
        tests.ok(false, ex);
    }
  }
}

tests.tests.push(new KeyPressTest("b", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mi", { text:"b" })
    ])
]));

tests.tests.push(new KeyPressTest("aB", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mi", { text:"aB" })
    ])
]));

tests.tests.push(new KeyPressTest("12aB", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mn", { text:"12" }),
        DOMHelpers.createNode("mo", { text:invisibleTimes }),
        DOMHelpers.createNode("mi", { text:"aB" })
    ])
]));

tests.tests.push(new KeyPressTest("ab12", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mi", { text:"ab12" }),
    ])
]));

tests.tests.push(new KeyPressTest("12.12.12", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mn", { text:"12.1212" }),
    ])
]));

tests.tests.push(new KeyPressTest("1", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mn", { text:"1" })
    ])
]));

tests.tests.push(new KeyPressTest("12.5", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mn", { text:"12.5" })
    ])
]));

tests.tests.push(new KeyPressTest("x+2", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mi", { text:"x" }),
        DOMHelpers.createNode("mo", { text:"+" }),
        DOMHelpers.createNode("mn", { text:"2" })
    ])
]));

tests.tests.push(new KeyPressTest("2/x", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mfrac", {}, [
            DOMHelpers.createNode("mn", { text:"2" }),
            DOMHelpers.createNode("mrow", {}, [
                DOMHelpers.createNode("mi", {text:"x"})
            ]),
        ]),
    ]),
]));

tests.tests.push(new KeyPressTest("2/x -1", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mfrac", {}, [
            DOMHelpers.createNode("mn", {text:"2"}),
            DOMHelpers.createNode("mrow", {}, [
                DOMHelpers.createNode("mi", {text:"x"})
            ]),
        ]),
        DOMHelpers.createNode("mo", {text:"-"}),
        DOMHelpers.createNode("mn", {text:"1"})
    ]),
]));

tests.tests.push(new KeyPressTest("1+2+3 /3=", [
    DOMHelpers.createNode("mfrac", {}, [
        DOMHelpers.createNode("mrow", {}, [
            DOMHelpers.createNode("mn", { text:"1" }),
            DOMHelpers.createNode("mo", { text:"+" }),
            DOMHelpers.createNode("mn", { text:"2" }),
            DOMHelpers.createNode("mo", { text:"+" }),
            DOMHelpers.createNode("mn", { text:"3" })
        ]),
        DOMHelpers.createNode("mrow", {}, [
            DOMHelpers.createNode("mn", { text:"3" })
        ]),
    ]),
    DOMHelpers.createNode("mo", { class: "equality", text: "=" }),
    DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
        DOMHelpers.createNode("mn", { text:"2" })
    ]),
]));

tests.tests.push(new KeyPressTest("1.5+1=", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("mn", { text:"1.5"}),
        DOMHelpers.createNode("mo", { text:"+"}),
        DOMHelpers.createNode("mn", { text:"1"}),
    ]),
    DOMHelpers.createNode("mo", { class: "equality", text:"=" }),
    DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
        DOMHelpers.createNode("mn", { text:"2.5" }),
    ])
]));

tests.tests.push(new KeyPressTest("1+1=+1", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
       DOMHelpers.createNode("mn", { text:"1" }),
       DOMHelpers.createNode("mo", { text:"+" }),
       DOMHelpers.createNode("mn", { text:"1" }),
       DOMHelpers.createNode("mo", { text:"+" }),
       DOMHelpers.createNode("mn", { text:"1" })
    ]),
    DOMHelpers.createNode("mo", { class: "equality", text:"=" }),
    DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
        DOMHelpers.createNode("mn", { text:"3" }),
    ]),
]));

tests.tests.push(new KeyPressTest("2^2=", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("msup", {}, [
            DOMHelpers.createNode("mn", { text: "2" }),
            DOMHelpers.createNode("mrow", {}, [
                DOMHelpers.createNode("mn", { text: "2"})
            ]),
        ]),
    ]),
    DOMHelpers.createNode("mo", { class: "equality", text:"=" }),
    DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
        DOMHelpers.createNode("mn", { text:"4" })
    ]),
]));

tests.tests.push(new KeyPressTest("2_2=", [
    DOMHelpers.createNode("mrow", { class: "lhs" }, [
        DOMHelpers.createNode("msub", {}, [
            DOMHelpers.createNode("mn", { text: "2" }),
            DOMHelpers.createNode("mrow", {}, [
                DOMHelpers.createNode("mn", { text: "2" })
            ]),
        ]),
    ]),
    DOMHelpers.createNode("mo", { class: "equality", text:"=" }),
    DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
        DOMHelpers.createNode("mn", { text: "2"})
    ])
]));

tests.tests.push(new KeyPressTest("\\4=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("msqrt", {}, [
          DOMHelpers.createNode("mrow", {}, [
              DOMHelpers.createNode("mn", { text: "4"}),
          ]),
      ]),
  ]),
  DOMHelpers.createNode("mo", { class: "equality", text:"="}),
  DOMHelpers.createNode("mrow", { class: "rhs generated" }, [
    DOMHelpers.createNode("mfenced", { text: "", open: "[", close: "]", separators: ","}, [
      DOMHelpers.createNode("mn", { text: "-2"}),
      DOMHelpers.createNode("mn", { text: "2"}),
    ]),
  ]),
]));

tests.tests.push(new KeyPressTest("[1	2	3	4]",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mfenced", { open: "[", close: "]", separators: "," }, [
        DOMHelpers.createNode("mtable", {}, [
            DOMHelpers.createNode("mtr", {}, [
                DOMHelpers.createNode("mtd", {}, [ DOMHelpers.createNode("mn", {text: 1}) ]),
                DOMHelpers.createNode("mtd", {}, [ DOMHelpers.createNode("mn", {text: 2}) ]),
            ]),
            DOMHelpers.createNode("mtr", {}, [
                DOMHelpers.createNode("mtd", {}, [ DOMHelpers.createNode("mn", {text: 3}) ]),
                DOMHelpers.createNode("mtd", {}, [ DOMHelpers.createNode("mn", {text: 4}) ]),
            ]),
        ]),
    ])
  ])
]));

/*
tests.tests.push(new KeyPressTest("1+3+-4=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mn", { text: "1"},
    DOMHelpers.createNode("mo", { text: "+"},
    DOMHelpers.createNode("mrow", { class: "plusminus"}, [
      DOMHelpers.createNode("mn", { text: "3"},
      DOMHelpers.createNode("mo", { text: plusMinus},
      DOMHelpers.createNode("mn", { text: "4"},
    ]},
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mfenced", { class: "resultArray", { text: "", open: "[", close: "]", separators: ","}, [
      DOMHelpers.createNode("mn", { text: "0"},
      DOMHelpers.createNode("mn", { text: "8"},
    ]}
  ]}]
));

tests.tests.push(new KeyPressTest("\\4=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("msqrt", children:[
          DOMHelpers.createNode("mn", { text: "4"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mfenced", { text: "", open: "[", close: "]", separators: ","}, [
      DOMHelpers.createNode("mn", { text: "-2"},
      DOMHelpers.createNode("mn", { text: "2"},
    ]}
  ]}]
));

tests.tests.push(new KeyPressTest("1+\\4=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mn", { text: "1"},
      DOMHelpers.createNode("mo", { text: "+"},
      DOMHelpers.createNode("msqrt", children:[
          DOMHelpers.createNode("mn", { text: "4"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mfenced", { text: "", open: "[", close: "]", separators: ","}, [
      DOMHelpers.createNode("mn", { text: "-1"},
      DOMHelpers.createNode("mn", { text: "3"},
    ]}
  ]}]
));

tests.tests.push(new KeyPressTest("\\4 +\\4=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("msqrt", children:[
          DOMHelpers.createNode("mn", { text: "4"},
      ]},
      DOMHelpers.createNode("mo", { text: "+"},
      DOMHelpers.createNode("msqrt", children:[
          DOMHelpers.createNode("mn", { text: "4"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mfenced", { text: "", open: "[", close: "]", separators: ","}, [
      DOMHelpers.createNode("mn", { text: "-4"},
      DOMHelpers.createNode("mn", { text: "0"},
      DOMHelpers.createNode("mn", { text: "4"},
    ]}
  ]}]
));

tests.tests.push(new KeyPressTest("1+4\\=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mn", { text: "1"},
      DOMHelpers.createNode("mo", { text: "+"},
      DOMHelpers.createNode("msqrt", children:[
          DOMHelpers.createNode("mn", { text: "4"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mfenced", { text: "", open: "[", close: "]", separators: ","}, [
      DOMHelpers.createNode("mn", { text: "-1"},
      DOMHelpers.createNode("mn", { text: "3"},
    ]}
  ]}]
));

tests.tests.push(new KeyPressTest("f(x)=x",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "f"},
      DOMHelpers.createNode("mfenced", { text: "", open: "(", close: ")", separators: ""}, [
        DOMHelpers.createNode("mi", { text: "x"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "definition", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs"}, [
    DOMHelpers.createNode("mi", { text:"x"}
  ]}]
));

tests.tests.push(new KeyPressTest("x=3",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "x"},
  ]},
  DOMHelpers.createNode("mo", { class: "definition", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs"}, [
    DOMHelpers.createNode("mn", { text:"3"}
  ]}]
));

tests.tests.push(new KeyPressTest("cos(0)=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "cos"},
      DOMHelpers.createNode("mfenced", { text: "", open: "(", close: ")", separators: ""}, [
        DOMHelpers.createNode("mn", { text: "0"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mn", { text:"1"}
  ]}]
));

tests.tests.push(new KeyPressTest("tan(0)=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "tan"},
      DOMHelpers.createNode("mfenced", { text: "", open: "(", close: ")", separators: ""}, [
        DOMHelpers.createNode("mn", { text: "0"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mn", { text:"0"}
  ]}]
));

tests.tests.push(new KeyPressTest("log(2)=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "log"},
      DOMHelpers.createNode("mfenced", { text: "", open: "(", close: ")", separators: ""}, [
        DOMHelpers.createNode("mn", { text: "2"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mn", { text: "" + Math.log10(2)}
  ]}]
));

tests.tests.push(new KeyPressTest("sin(0)=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
      DOMHelpers.createNode("mi", { text: "sin"},
      DOMHelpers.createNode("mfenced", { text: "", open: "(", close: ")", separators: ""}, [
        DOMHelpers.createNode("mn", { text: "0"},
      ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mn", { text:"0"}
  ]}]
));

tests.tests.push(new KeyPressTest("e^0=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("msup"}, [
      DOMHelpers.createNode("mi", { text: "e"},
      DOMHelpers.createNode("mrow"}, [
        DOMHelpers.createNode("mn", { text: "0"},
      ]}    
    ]}
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mn", { text:"1"}
  ]}]
));

tests.tests.push(new KeyPressTest("e^x^2",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("msup"}, [
      DOMHelpers.createNode("mi", { text: "e"},
      DOMHelpers.createNode("mrow"}, [
        DOMHelpers.createNode("msup"}, [
          DOMHelpers.createNode("mi", { text: "x"},
          DOMHelpers.createNode("mrow"}, [
            DOMHelpers.createNode("mn", { text: "2"},
          ]}    
        ]}
      ]}    
    ]}
  ]}]
));

tests.tests.push(new KeyPressTest("e*2=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mi", { text: "e"},
    DOMHelpers.createNode("mo", { text: invisibleTimes},
    DOMHelpers.createNode("mn", { text: "2"},
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mn", { text:"5.43656365691809"}
  ]}]
));

tests.tests.push(new KeyPressTest("[1,2,3,4]=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mo", { text: "["},
    DOMHelpers.createNode("mtable"}, [
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "1"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "2"} ]},
      ]},
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "3"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "4"} ]},
      ]},
    ]},
    DOMHelpers.createNode("mo", { text: "]"},
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mo", { text: "["},
    DOMHelpers.createNode("mtable"}, [
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "1"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "2"} ]},
      ]},
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "3"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "4"} ]},
      ]},
    ]},
    DOMHelpers.createNode("mo", { text: "]"},
  ]}]
));

tests.tests.push(new KeyPressTest("[1,2,3,4] +[1,2,3,4]=",
  [DOMHelpers.createNode("mrow", { class: "lhs"}, [
    DOMHelpers.createNode("mo", { text: "["},
    DOMHelpers.createNode("mtable"}, [
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "1"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "2"} ]},
      ]},
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "3"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "4"} ]},
      ]},
    ]},
    DOMHelpers.createNode("mo", { text: "]"},
    DOMHelpers.createNode("mo", { text: "+"},
    DOMHelpers.createNode("mo", { text: "["},
    DOMHelpers.createNode("mtable"}, [
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "1"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "2"} ]},
      ]},
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "3"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "4"} ]},
      ]},
    ]},
    DOMHelpers.createNode("mo", { text: "]"},
  ]},
  DOMHelpers.createNode("mo", { class: "equality", { text:"="},
  DOMHelpers.createNode("mrow", { class: "rhs generated"}, [
    DOMHelpers.createNode("mo", { text: "["},
    DOMHelpers.createNode("mtable"}, [
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "2"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "4"} ]},
      ]},
      DOMHelpers.createNode("mtr"}, [
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "6"} ]},
        DOMHelpers.createNode("mtd"}, [ DOMHelpers.createNode("mn", { text: "8"} ]},
      ]},
    ]},
    DOMHelpers.createNode("mo", { text: "]"},
  ]}]
));
*/
}

exports.MathEditor = MathEditor;
})
