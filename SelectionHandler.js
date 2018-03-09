define(function (require, exports, module) {

var tests = require('tests');
// var tests = false;
var DOMHelpers = require('DOMHelpers');
var Editors = require("Editors");
var Cursor = document.createElement("div");
document.body.appendChild(Cursor);
Cursor.classList.add("cursor");
var range = document.createRange();

var SelectionHandler = {
    rootNode: null,
    _selectedNode: null,
    get selectedNode() {
        return this._selectedNode;
    },

    get lhs() {
        return this.rootNode.querySelector(".lhs");
    },

    get eq() {
        return this.rootNode.querySelector("mo.equality");
    },

    set selectedNode(val) {
        this._selectedNode = val;
        this.rootNode = val;

        while (this.rootNode && this.rootNode.nodeName != "math") {
            this.rootNode = this.rootNode.parentNode;
        }
    },

    _updateCursorPosition: function(aNode, aOffset) {
        // let bcr = this.selectedNode.getBoundingClientRect();
        /*
        aOffset = aOffset || 0;
        if (aOffset >= aNode.textContent.length) {
            aOffset = aNode.textContent.length - 1;
        }

        if (aOffset - 1 < 0) {
            console.log(aOffset, aNode.textContent);
            return;
        }

        console.log(aOffset, aNode.textContent);

        range.setStart(aNode, aOffset - 1);
        range.setEnd(aNode, aOffset);
        */
        // var bcr = range.getClientRects()[0];
        // console.log(bcr, aNode.getClientRects()[0]);
        var bcr = aNode.getClientRects()[0];
        if (bcr) {
            Cursor.style.top = bcr.top + bcr.height * 0.2;
            Cursor.style.left = bcr.right - bcr.width;
            Cursor.style.width = bcr.width;
            Cursor.style.height = bcr.height * 0.6;
        }
    },

    setCursor: function(aNode, aOffset) {
        if (aNode && aNode == this.rootNode) {
            return;
        }

        if (this.selectedNode && this.selectedNode.classList) {
            this.selectedNode.classList.remove("selected");
        }

        this.selectedNode = aNode;
        if (this.selectedNode) {
            this.selectedNode.classList.add("selected");
            this._updateCursorPosition(aNode, aOffset);
        }
    },

    selectPrev: function(node) {
        if (node == this.rootNode || node == this.lhs) {
            return null;
        }

        var newNode = null;
        if (node.previousSibling) {
            newNode = node.previousSibling;
            while (newNode.lastChild && newNode.lastChild.nodeName != "#text") {
                newNode = newNode.lastChild;
            }
        } else if (node.parentNode) {
            newNode = node.parentNode;
        }

        if (!newNode || newNode == this.rootNode) {
            return null;
        }

        this.setCursor(newNode);
        return newNode;
    },

    selectNext: function(node) {
        if (node.childNodes.length > 0 && node.firstChild.nodeName != "#text") {
            this.setCursor(node.firstChild);
        } else if (node.nextSibling) {
            this.setCursor(node.nextSibling);
        } else if (node.parentNode.lastChild == node) {
            var newNode = node;
            while (newNode && !newNode.nextSibling && newNode != this.rootNode) {
                newNode = newNode.parentNode;
            }

            var eq = this.eq;
            if (newNode != this.rootNode && newNode.nextSibling !== eq) {
                this.setCursor(newNode.nextSibling);
            }
        }
    },
}

var SpaceEditor = new Editors.EditorNode(null, / /);
SpaceEditor.handleKey = function(aChar, aNode) {
    var text = aNode.textContent;
    var node = aNode.parentNode;

    while (node.nodeName !== "math" && text === node.textContent) {
        node = node.parentNode;
    }

    /*
    if (node.nodeName === "mtd" && node.childNodes.length == 1) {
        return this.handleKey(aChar, node);
    } else if (node.nodeName == "mtr") {
        return this.handleKey(aChar, node);
    } else if (node.nodeName == "mtable") {
        var prev = node.previousSibling;
        var next = node.nextSibling;
        if (prev.nodeName == "mo" && prev.textContent == "[" &&
            next.nodeName == "mo" && next.textContent == "]") {
            return this.handleKey(aChar, node);
        }
        return this.handleKey(aChar, node);
    }
    */

    SelectionHandler.setCursor(node, 0);
}
Editors.register(SpaceEditor);

function isInMatrix(aNode, aEvent) {
    if (aEvent.metaKey) {
        var node = aNode;
        while (node && node.nodeName != "mtable") {
            node = node.parentNode;
        }

        if (node) {
            return node;
        }
    }
    return null;
}

var LeftEditor = new Editors.EditorNode(null, 37);
LeftEditor.handleKey = function(aChar, aNode, aEvent) {
    var matrix = isInMatrix(aNode, aEvent);
    if (matrix) {
        return MatrixEditor.collapseLeft(matrix);
    }
    SelectionHandler.selectPrev(aNode);
}
Editors.register(LeftEditor);

var UpEditor = new Editors.EditorNode(null, 38);
UpEditor.handleKey = function(aChar, aNode, aEvent) {
    var matrix = isInMatrix(aNode, aEvent);
    if (matrix) {
        return MatrixEditor.collapseUp(matrix);
    }
    SelectionHandler.selectPrev(aNode);
}
Editors.register(UpEditor);

var RightEditor = new Editors.EditorNode(null, 39);
RightEditor.handleKey = function(aChar, aNode, aEvent) {
    var matrix = isInMatrix(aNode, aEvent);
    if (matrix) {
        return MatrixEditor.expandRight(matrix);
    }
    SelectionHandler.selectNext(aNode);
}
Editors.register(RightEditor);

var DownEditor = new Editors.EditorNode(null, 40);
DownEditor.handleKey = function(aChar, aNode, aEvent) {
    var matrix = isInMatrix(aNode, aEvent);
    if (matrix) {
        return MatrixEditor.expandDown(matrix);
    }
    SelectionHandler.selectNext(aNode);
}
Editors.register(DownEditor);

function deleteMathNode(node) {
    if (node.parentNode) {
        var parent = node.parentNode;
        if (parent.nodeName === "mfrac") {
            var replacement = parent.childNodes[0];
            if (parent.childNodes[0] == node) {
                replacement = parent.childNodes[1];
            }
            parent.parentNode.insertBefore(replacement, parent);
            parent.parentNode.removeChild(parent);
            SelectionHandler.setCursor(replacement);
        } else {
            parent.removeChild(node);
        }
    }
}

var DeleteEditor = new Editors.EditorNode(null, 8);
DeleteEditor.handleKey = function(aChar, aNode, aEvent) {
    aEvent.preventDefault();
    aEvent.stopPropagation();

    if (aNode.textContent.length > 0 && !MathEditor.prototype.isEmpty(aNode)) {
        aNode.textContent = aNode.textContent.slice(0, aNode.textContent.length-1);
        if (MathEditor.prototype.isEmpty(aNode)) {
            aNode.textContent = emptyBox;
        }
    } else {
        var node = aNode;
        while (!node.classList.contains("lhs") && node.textContent === "" || node.textContent === emptyBox) {
            var prev = SelectionHandler.selectPrev(node);
            deleteMathNode(node);

            if (prev) {
                node = prev;
            } else {
                break;
            }
        }

        if (node.classList.contains("lhs")) {
            SelectionHandler.setCursor(node);
        }
    }
}
Editors.register(DeleteEditor);

if (tests) {

function TestSelection(aKeys, aSelectKeys, aResult) {
    this.name = "SelectionHandler " + aKeys;
    this.run = function() {
        try {
            var MathEditor = require("MathEditor").MathEditor;
            var editor = new MathEditor();
            for(var i = 0; i < aKeys.length; i++) {
                tests.sendKey(aKeys.charCodeAt(i), null, editor);
            }

            for(var i = 0; i < aSelectKeys.length; i++) {
                if (aSelectKeys[i] === "L") tests.sendKey(0 ,37, editor);
                else if (aSelectKeys[i] === "S") tests.sendKey(32 ,0, editor);
                else if (aSelectKeys[i] === "R") tests.sendKey(0 ,39, editor);
                else if (aSelectKeys[i] === "U") tests.sendKey(0 ,38, editor);
                else if (aSelectKeys[i] === "D") tests.sendKey(0 ,40, editor);
                else if (aSelectKeys[i] === "l") tests.sendKey(0 ,40, editor, { ctrlKey: true });
                else if (aSelectKeys[i] === "r") tests.sendKey(0 ,40, editor, { ctrlKey: true });
                else if (aSelectKeys[i] === "u") tests.sendKey(0 ,40, editor, { ctrlKey: true });
                else if (aSelectKeys[i] === "d") tests.sendKey(0 ,40, editor, { ctrlKey: true });
                else if (aSelectKeys[i] === "B") tests.sendKey(0 , 8, editor);

                var node = SelectionHandler.selectedNode;
                tests.verifyNode(node, aResult[i]);
            }
        } catch(ex) {
            tests.ok(false, ex);
        }
    }
}

// Backspacing after typing equals doesn't work well
// Deleting everything in a line doesn't work well
tests.tests.push(new TestSelection("1+2", "", [
    DOMHelpers.createNode("mn", { text: "2"})
]));

tests.tests.push(new TestSelection("1+2", "BBBB", [
    DOMHelpers.createNode("mn", { text: emptyBox}),
    DOMHelpers.createNode("mo", { text: "+"}),
    DOMHelpers.createNode("mo", { text: emptyBox}),
    DOMHelpers.createNode("mn", { text: "1"})
]));

tests.tests.push(new TestSelection("1/2", "BB", [
    DOMHelpers.createNode("mn", { text: emptyBox}),
    DOMHelpers.createNode("mn", { text: "1"})
]));

tests.tests.push(new TestSelection("1+2", "SS", [
    DOMHelpers.createNode("mrow", { text: "1+2"}),
    DOMHelpers.createNode("mrow", { text: "1+2"})
]));

tests.tests.push(new TestSelection("1+3", "LLLRR", [
    DOMHelpers.createNode("mo", {text: "+"}),
    DOMHelpers.createNode("mn", { text: "1" }),
    DOMHelpers.createNode("mrow", { text: "1+3" }),
    DOMHelpers.createNode("mn", { text: "1" }),
    DOMHelpers.createNode("mo", { text: "+" }),
]));

tests.tests.push(new TestSelection("1^x +2", "LLLLLRRRR", [
    DOMHelpers.createNode("mo", {text: "+"}),
    DOMHelpers.createNode("mi", { text: "x" }),
    DOMHelpers.createNode("mrow", { text: "x" }),
    DOMHelpers.createNode("mn", { text: "1" }),
    DOMHelpers.createNode("msup", { text: "1x" }),
    DOMHelpers.createNode("mn", { text: "1" }),
    DOMHelpers.createNode("mrow", { text: "x" }),
    DOMHelpers.createNode("mi", { text: "x" }),
    DOMHelpers.createNode("mo", {text: "+"}),
    DOMHelpers.createNode("mn", { text: "2" }),
]));

}
exports.setCursor = SelectionHandler.setCursor.bind(SelectionHandler);
exports.selectedNode = function() {
    return SelectionHandler.selectedNode;
}
exports.selectPrev = SelectionHandler.selectPrev.bind(SelectionHandler);
exports.selectNext = SelectionHandler.selectNext.bind(SelectionHandler);

})