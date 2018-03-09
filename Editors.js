define(function (require, exports, module) {
var DOMHelpers = require('DOMHelpers');
var SelectionHandler = require("SelectionHandler");
var tests = require('tests');

var EditorNode = function(aType, aKeys) {
    this.nodeTypes = [aType];
    this.keys = aKeys;
    this._ops = [];
    this.canAppend = true;
    this.shouldSelect = true;
}

EditorNode.prototype = {
    canHandle: function(aChar, aNode, aEvent) {
        for (var i = 0; i < this._ops.length; i++) {
            var op = this._ops[i];
            var h = op.canHandle(aChar, aNode, aEvent);
            if (h) {
                return h;
            }
        }

        if (this.keys) {
            if (this.keys instanceof RegExp) {
                if (this.keys.test(aChar)) {
                    return this;
                }
            } else if (this.keys instanceof Array) {
                if (this.keys.some(function(reg) { return reg.test(aChar); })) {
                    return this;
                }
            } else if (this.keys instanceof Function) {
                if (this.keys(aChar, aNode)) {
                    return this;
                }
            } else if (!isNaN(this.keys)) {
                if (this.keys === aEvent.keyCode) {
                    return this;
                }
            }
        }

        return null;
    },

    _handleKey: function(aChar, aNode, aEvent) {
        for (var i = 0; i < this._ops.length; i++) {
            if (this._ops[i].canHandle(aChar)) {
                return this._ops[i].handleKey(aChar, aNode, aEvent);
            }
        }

        if (this.canAppend && this.nodeTypes.indexOf(aNode.nodeName) > -1) {
            return DOMHelpers.appendToNode(aChar, aNode)
        }

        return DOMHelpers.appendNewNode(this.nodeTypes[0], aChar, aNode);
    },

    handleKey: function(aChar, aNode, aEvent) {
        return this._handleKey(aChar, aNode, aEvent);
    },

    register: function(aEditor) {
        this._ops.push(aEditor);
    },

    toString: function() {
        return "Editor: " + this.nodeTypes + " - " + this.keys;
    },
}

var MathNodeEditor = new EditorNode("math");

var aInt = 97;
var AInt = 65;
var alphaInt = 945;
var AlphaInt = 913;
var GreekEditor = new EditorNode(null, "g");
GreekEditor.canAppend = false;
GreekEditor.canHandle = function(aChar, aNode, aEvent) {
    if (aEvent.ctrlKey && aChar == "g") {
        return this;
    }
    return false;
}
GreekEditor.handleKey = function(aChar, aNode, aEvent) {
    if (aNode.nodeName == "mi") {
        var text = aNode.textContent;
        var prevChar = text.charCodeAt(text.length - 1);
        if (prevChar >= aInt || prevChar <= aInt+26) {
            var newChar = String.fromCharCode(prevChar - aInt + alphaInt)
            aNode.textContent = text.slice(0, text.length-1) + newChar;
        } else if (prevChar >= AInt || prevChar <= AInt+26) {
            var newChar = String.fromCharCode(prevChar - AInt + AlphaInt)
            aNode.textContent = text.slice(0, text.length-1) + newChar;
        }
    }
}
MathNodeEditor.register(GreekEditor);
var numbers = /[0-9]/
var letters = /[a-zA-Z]/

var VariableEditor = new EditorNode("mi", letters);
VariableEditor.canHandle = function(aChar, aNode) {
    if (this.keys.test(aChar)) {
        return this;
    }

    if (aNode && aNode.nodeName == "mi" && !MathEditor.prototype.isEmpty(aNode) && numbers.test(aChar)) {
        return this;
    }

    return null;
}
VariableEditor.handleKey = function(aChar, aNode, aEvent) {
    if (MathEditor.prototype.isEmpty(aNode)) {
        return DOMHelpers.replaceNode(this.nodeTypes[0], aChar, aNode);
    } else if (aNode.nodeName == "mn") {
        return MathEditor.prototype.multiplyCurrent(aChar, aNode, this.nodeTypes[0]);
    } else {
        return this._handleKey(aChar, aNode, aEvent);
    }
}
MathNodeEditor.register(VariableEditor);

var NumberEditor = new EditorNode("mn", numbers);
NumberEditor.canHandle = function(aChar, aNode) {
    if (this.keys.test(aChar)) {
        return this;
    }

    if (aChar == "." && aNode.textContent.indexOf(".") == -1) {
        return this;
    }

    return null;
}
NumberEditor.handleKey = function(aChar, aNode, aEvent) {
    if (MathEditor.prototype.isEmpty(aNode)) {
        return DOMHelpers.replaceNode(this.nodeTypes[0], aChar, aNode);
    } else if (aNode.nodeName == "mi") {
        return MathEditor.prototype.multiplyCurrent(aChar, aNode, this.nodeTypes[0]);
    } else {
        return this._handleKey(aChar, aNode, aEvent);
    }
}
MathNodeEditor.register(NumberEditor);

var OperatorEditor = new EditorNode("mo", [/[\+\-\*]/]);
OperatorEditor.canAppend = false;
OperatorEditor.handleKey = function(aChar, aNode, aEvent) {
    if (aChar == "*") {
        aChar = invisibleTimes;
//    } else if (aChar == ",") {
//        aChar = "";
    } else if (aNode.nodeName == "mo" && aNode.textContent == "+" && aChar == "-") {
        var mrow = DOMHelpers.createNode("mrow");
        mrow.setAttribute("class", "plusminus");
        aNode.parentNode.insertBefore(mrow, aNode.previousSibling);
        mrow.appendChild(aNode.previousSibling);
        mrow.appendChild(aNode);
        aNode.textContent = plusMinus;
        return aNode;
    } else if (aNode.nodeName == "mo" && aNode.textContent == "-" && aChar == "+") {
        var mrow = DOMHelpers.createNode("mrow");
        mrow.setAttribute("class", "plusminus");
        aNode.parentNode.insertBefore(mrow, aNode.previousSibling);
        mrow.appendChild(aNode.previousSibling);
        mrow.appendChild(aNode);
        aNode.textContent = minusPlus;
        return aNode;
    }
    return this._handleKey(aChar, aNode, aEvent);
}
OperatorEditor.handlePlusMinus = function(aNode, lhs) {
    if (!lhs) {
        lhs = "";
    }
    var rhs = "";
    var foundRight = null;
    for (var i = 0; i < aNode.childNodes.length; i++) {
        var node = aNode.childNodes[i];
        if (node.nodeName == "mo" && (node.textContent == plusMinus || node.textContent == minusPlus)) {
            foundRight = node.textContent;
        } else if (foundRight) {
            rhs += MathEditor.prototype.getJSFor(node);
        } else {
            lhs += MathEditor.prototype.getJSFor(node);
        }
    }

    return "new MSet([" + lhs + (foundRight == plusMinus ? " + " : " - ") + rhs +"," +
                                             lhs + (foundRight == plusMinus ? " - " : " + ") + rhs + "])";
}
MathNodeEditor.register(OperatorEditor);

var FractionEditor = new EditorNode("mfrac", [/\//]);
FractionEditor.handleKey = function(aChar, aNode, aEvent) {
    if (aNode.nodeName == "mo") {
        return aNode;
    }
    var mfrac = DOMHelpers.createNode("mfrac");
    var mrow = DOMHelpers.createNode("mrow");
    aNode.parentNode.insertBefore(mfrac, aNode);
    mfrac.appendChild(aNode);
    mfrac.appendChild(mrow);

    if (aNode.classList.contains("lhs")) {
        aNode.classList.remove("lhs");
        mfrac.classList.add("lhs");
    }

    return mrow;
}
OperatorEditor.register(FractionEditor);

var ExponentEditor = new EditorNode("msup", [/\^/]);
ExponentEditor.handleKey = function(aChar, aNode, aEvent) {
    var mfrac = DOMHelpers.createNode("msup");
    var mrow = DOMHelpers.createNode("mrow");
    aNode.parentNode.insertBefore(mfrac, aNode);
    mfrac.appendChild(aNode);
    mfrac.appendChild(mrow);
    return mrow;
}
OperatorEditor.register(ExponentEditor);

// TODO: Move this to the Editor. It shouldn't be handled in here.
var EnterEditor = new EditorNode(null, 13);
EnterEditor.handleKey = function(aChar, aNode, aEvent) {
    Editor.addEquation(null);
}
MathNodeEditor.register(EnterEditor);

var SubEditor = new EditorNode("msub", [/\_/]);
SubEditor.handleKey = function(aChar, aNode, aEvent) {
    var mfrac = DOMHelpers.createNode("msub");
    var mrow = DOMHelpers.createNode("mrow");
    aNode.parentNode.insertBefore(mfrac, aNode);
    mfrac.appendChild(aNode);
    mfrac.appendChild(mrow);
    return mrow;
}
OperatorEditor.register(SubEditor);

var SqrtEditor = new EditorNode("msqrt", [/\\/]);
SqrtEditor.handleKey = function(aChar, aNode, aEvent) {
    var msqrt = DOMHelpers.createNode("msqrt");
    var node = aNode;
    if (aNode.getAttribute("class") == ("lhs selected")) {
        node = DOMHelpers.appendNewNode("mi", emptyBox, aNode);
    } else if (aNode.nodeName == "mo") {
        node = DOMHelpers.appendNewNode("mi", emptyBox, aNode);
    }
    node.parentNode.insertBefore(msqrt, node);
    msqrt.appendChild(node);
    return node;
}
OperatorEditor.register(SqrtEditor);

var TabEditor = new EditorNode(null, 9);
TabEditor.canHandle = function(aChar, aNode, aEvent) {
    var c = String.fromCharCode(aEvent.charCode);
    if (aEvent.keyCode == 9 || c === ",") {
        return this;
    }
    return null;
}

TabEditor.handleKey = function(aChar, aNode, aEvent) {
    SelectionHandler.selectNext(aNode);
}

MathNodeEditor.register(TabEditor);

var EqualsEditor = new EditorNode("mo", [/=/]);
EqualsEditor.handleKey = function(aChar, aNode) {
    var root = aNode;
    while (root && root.nodeName != "math") {
        root = root.parentNode;
    }

    if (!aNode.textContent || aNode.textContent == emptyBox) {
        aNode.parentNode.removeChild(aNode);
    }

    var newNode = DOMHelpers.appendNewNode(this.nodeTypes[0], aChar, root);
    newNode.classList.add("equality");
    return null;
}
EqualsEditor.shouldSelect = false;
OperatorEditor.register(EqualsEditor);

if (tests) {
    var TestsEditor = new EditorNode();
    TestsEditor.canHandle = function(aChar, aNode, aEvent) {
        if ((aEvent.charCode === 116 || aEvent.charCode === 8224 || aEvent.keyCode === 84) && aEvent.altKey) {
            return this;
        }
        return null;
    }
    TestsEditor.handleKey = function(aChar, aNode) {
        tests.runTests();
    }
    MathNodeEditor.register(TestsEditor);
}

var CommaEditor = new EditorNode("mfenced", /[,]/);
CommaEditor.handleKey = function(aChar, aNode) {
    var node = aNode.parentNode;
    while (node && node.classList.contains("function")) {
        node = node.parentNode;
    }

    if (node) {
        var n = DOMHelpers.createNode("mrow");
        node.appendChild(n);
        return n;
    }

    return null;
}
OperatorEditor.register(CommaEditor);

var FencedEditor = new EditorNode("mfenced", /[\(\)\|]/);
FencedEditor.handleKey = function(aChar, aNode) {
    var fence = MathEditor.prototype.isFenced(aChar, aNode);
    if (fence) {
        var mrow = DOMHelpers.createNode('mi');
        fence.parentNode.insertBefore(mrow, fence.nextSibling);
        return mrow;
    }

    if (aChar == "(") {
        newNode = DOMHelpers.appendNewNode("mfenced", "", aNode);
        newNode.setAttribute("open", aChar);
        newNode.setAttribute("close", ")");
        if (aNode.nodeName === "mi") {
            newNode.setAttribute("separators", ",");
            newNode.setAttribute("class", "function");
        }
        var n = DOMHelpers.createNode("mrow");
        newNode.appendChild(n);
        return n;
    } else if (aChar === "|") {
        newNode = DOMHelpers.appendNewNode("mfenced", "", aNode);
        newNode.setAttribute("open", "|");
        newNode.setAttribute("close", "|");
        newNode.setAttribute("class", "magnitude");

        var n = DOMHelpers.createNode("mrow");
        newNode.appendChild(n);
        return n;
    }
}
OperatorEditor.register(FencedEditor);

var MatrixEditor = new EditorNode("mtable", /[\[\]]/);
MatrixEditor.canAppend = false;
MatrixEditor.collapseUp = function(table) {
    table.removeChild(table.lastElementChild);
}

MatrixEditor.collapseLeft = function(table) {
    let rows = table.children;
    for (var i = 0; i < rows.length; i++) {
        var cols = rows[i].children;
        rows[i].removeChild(rows[i].lastElementChild);
    }
}

MatrixEditor.expandDown = function(table) {
    this.addRow(table, table.firstElementChild.children.length);
}

MatrixEditor.expandRight = function(table) {
    let rows = table.children;
    for (var i = 0; i < rows.length; i++) {
        this.addCol(rows[i]);
    }
}

MatrixEditor.addCol = function(row) {
    var col = DOMHelpers.createNode("mtd", {}, [
        DOMHelpers.createNode("mi", { text: emptyBox })
    ]);
    row.appendChild(col);
}

MatrixEditor.addRow = function(table, size) {
    var row = DOMHelpers.createNode("mtr", {});
    table.appendChild(row)
    for (var j = 0; j < size; j++) {
        this.addCol(row);
    }
    return row;
}

MatrixEditor.addMatrix = function(aChar, aNode) {
    // <mfenced open="[" close="]">
    var fence = DOMHelpers.appendNewNode("mfenced", "", aNode);
    fence.setAttribute("open", "[");
    fence.setAttribute("close", "]");

    // var mo = DOMHelpers.appendNewNode("mo", aChar, aNode);
    var mtable = DOMHelpers.createNode("mtable");
    fence.appendChild(mtable); // appendNewNode("mtable", "", fence);
    var size = 2;
    for(var i = 0; i < size; i++) {
        var row = this.addRow(mtable, size);
        if (i == 0) {
            newNode = row.firstElementChild.firstElementChild;
        }
    }
    // mo = DOMHelpers.appendNewNode("mo", "]", mtable);
    return newNode;
}

MatrixEditor.handleKey = function(aChar, aNode) {
    if (aChar === "[") {
        return this.addMatrix(aChar, aNode);
    } else if (aChar == "]") {
        while (aNode && aNode.nodeName != "mtable") {
          aNode = aNode.parentNode;
        }

        if (aNode) {
          aNode = aNode.nextElementSibling;
          return aNode;
        }
    }
}
exports.MatrixEditor = MatrixEditor;
OperatorEditor.register(MatrixEditor);

exports.EditorNode = EditorNode;
exports.canHandle = MathNodeEditor.canHandle.bind(MathNodeEditor);
exports.register = MathNodeEditor.register.bind(MathNodeEditor);

})