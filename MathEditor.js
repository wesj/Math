var invisibleTimes = String.fromCharCode(0x00B7);
var emptyBox = String.fromCharCode(0x25A1);
var MMLNS = "http://www.w3.org/1998/Math/MathML";
var Operators = [43, // +
                 45, // -
                 42, // *
                 47, // /
                 61, // =
                 94, // ^
                 95];// _
function MathEditor(aRoot) {
  if (aRoot) this.startEdit(aRoot);
}

var aInt = 97;
var AInt = 65;
var alphaInt = 945;
var AlphaInt = 913;

MathEditor.prototype = {
  type: "math",
  rootNode: null,
  lhs: null,
  rhs: null,
  handleResize: function(aEvent) { },
  createNode: function(aName, aContent) {
    var tag = document.createElementNS(MMLNS, aName);
    if (aContent) tag.textContent = aContent;
    return tag;
  },
  isFenced: function(node) {
    var n = node.parentNode;
    while(n && n.nodeName != "mfenced") {
      n = n.parentNode;
    }
    return n;
  },
  deselect: function() {
    this.setCursor(null, 0);
  },
  getCurrent: function() {
    return this.selectedNode;
  },
  startEdit: function(aRoot) {
    this.rootNode = this.createNode("math");
    aRoot.appendChild(this.rootNode);

    this.lhs = this.createNode("mrow");
    this.lhs.classList.add("lhs");
    this.rootNode.appendChild(this.lhs);
    this.setCursor(this.lhs, 0);
  },
  selectedNode: null,
  setCursor: function(aNode, aOffset) {
    if (aNode && aNode == this.root)
      return;
    if (this.selectedNode && this.selectedNode.classList)
      this.selectedNode.classList.remove("selected");
    this.selectedNode = aNode;
    if (this.selectedNode)
      this.selectedNode.classList.add("selected");
  },
  handleEvent: function(aEvent) {
    aEvent.preventDefault();
    var node = this.getCurrent();
    var c = String.fromCharCode(aEvent.charCode);
    var newNode;
    var mathElt = this.rootNode;
    var eq = this.getEquality(mathElt);
    var isFunction = this.looksLikeFunction(node);
    var isVar = this.looksLikeVar(node);

    if (aEvent.ctrlKey) {
      if (c == "g") {
        if (node.nodeName == "mi") {
          var text = node.textContent;
          var prevChar = text.charCodeAt(text.length - 1);
          if (prevChar >= aInt || prevChar <= aInt+26) {
            var newChar = String.fromCharCode(prevChar - aInt + alphaInt)
            node.textContent = text.slice(0, text.length-1) + newChar;
          } else if (prevChar >= AInt || prevChar <= AInt+26) {
            var newChar = String.fromCharCode(prevChar - AInt + AlphaInt)
            node.textContent = text.slice(0, text.length-1) + newChar;
          }
        }
      }
      return;
    }

    if (VariableEditor.keys[0].test(c)) {
      newNode = VariableEditor.handleKey(c, node);
      this.setCursor(newNode, 0);
      //newNode = this.addChar(c, node);
    } else if (NumberEditor.keys[0].test(c)) {
      newNode = NumberEditor.handleKey(c, node);
      this.setCursor(newNode, 0);
      //newNode = this.addNumber(c, node);
    } else if (c == "+" || c == "-" || c == ",") {
      newNode = this.appendNewNode("mo", c, node);
    } else if (c == "(") {
      newNode = this.appendNewNode("mfenced", "", node);
      newNode.setAttribute("open", c);
      newNode.setAttribute("close", ")");
      if (false && this.looksLikeFunction(node)) {
        newNode.setAttribute("separators", ",");
        newNode.setAttribute("class", "function");
      } else {
        newNode.setAttribute("class", "bracket");
        newNode.setAttribute("separators", "");
      }
    } else if (c == ")") {
      var fence = this.isFenced(node);
      var mrow = this.createNode('mi');
      fence.parentNode.insertBefore(mrow, fence.nextSibling);
      this.setCursor(mrow);
      newNode = mrow;
      console.log("New: " + newNode.nodeName);
    } else if (c == "*") {
      newNode = this.appendNewNode("mo", invisibleTimes, node);
    } else if (c == "/") {
      var mfrac = this.createNode("mfrac");
      var mrow = this.createNode("mrow");
      node.parentNode.insertBefore(mfrac, node);
      mfrac.appendChild(node);
      mfrac.appendChild(mrow);
      this.setCursor(mrow);
      newNode = mrow;
    } else if (c == "^") {
      var mfrac = this.createNode("msup");
      var mrow = this.createNode("mrow");
      node.parentNode.insertBefore(mfrac, node);
      mfrac.appendChild(node);
      mfrac.appendChild(mrow);
      this.setCursor(mrow);
      newNode = mrow;
    } else if (c == "_") {
      var mfrac = this.createNode("msub");
      var mrow = this.createNode("mrow");
      node.parentNode.insertBefore(mfrac, node);
      mfrac.appendChild(node);
      mfrac.appendChild(mrow);
      this.setCursor(mrow);
      newNode = mrow;
    } else if (c == "=") {
      if (!eq) {
        if (this.isEmpty(node)) {
          node.parentNode.removeChild(node);
        }
        eq = this.appendNewNode("mo", c, mathElt);
        eq.classList.add("equality");
        if (isFunction || isVar) {
          this.rhs = this.appendNewNode("mrow", "", eq);
          this.rhs.classList.add("rhs");
        }
      }
      newNode = node;
    } else if (c == "\\") {
      var msqrt = this.createNode("msqrt");
      if (node.getAttribute("class") == ("lhs selected")) {
        node = this.appendNewNode("mi", emptyBox, node);
      }
      node.parentNode.insertBefore(msqrt, node);
      msqrt.appendChild(node);
      this.setCursor(node);
      newNode = node;
    } else if (c == " ") {
      this.setCursor(node.parentNode, 0);
      return;
    } else if (c == "[") {
      var row = this.appendNewNode("mrow", "", node);
      var mo  = this.appendNewNode("mo", c, row);
      var mtable = this.appendNewNode("mtable", "", row);
      for(var i = 0; i < 2; i++) {
        var mtr = this.appendNewNode("mtr", "", mtable);
        for (var j = 0; j < 2; j++) {
          var mtd = this.appendNewNode("mtd", "", mtr);
          var mi = this.appendNewNode("mi", emptyBox, mtd);
          if (j == 0 && i == 0)
            newNode = mi;
        }
      }
      mo = this.appendNewNode("mo", "]", row);
      this.setCursor(newNode);
    } else if (aEvent.keyCode == 8) { // backspace/delete on my mac?
      if (this.textNodeTypes.indexOf(node.nodeName) > -1) {
        if (!this.isEmpty(node)) {
          node.textContent = node.textContent.slice(0, node.textContent.length-1);
          return;
        }
      }
      this.selectPrev(node);
      node.parentNode.removeChild(node);
      return;
    } else if (aEvent.keyCode == 37 || aEvent.keyCode == 38) { // left, up
      this.selectPrev(node);
      return;
    } else if (aEvent.keyCode == 39 || aEvent.keyCode == 40) { // right, down
      this.selectNext(node);
      return;
    } else if (aEvent.keyCode == 13) { // enter
      var bcr = this.rootNode.parentNode.parentNode.getBoundingClientRect();
      Editor.addEquation(null, bcr.left, bcr.bottom + 3);
      return;
    } else {
      console.log("Unknown: " + aEvent.charCode + ", " + aEvent.keyCode);
    }

    if (eq && !isFunction && !isVar) {
      while (eq.nextSibling) {
        eq.parentNode.removeChild(eq.nextSibling);
      }
      var txt = this.evalCurrent();
      this.rhs = this.appendNewNode("mrow", "", eq);
      this.rhs.classList.add("rhs");
      this.rhs.classList.add("generated");
      this.appendNewNode("mn", txt, this.rhs);
      if (newNode) this.setCursor(newNode);
    }
  },
  selectPrev: function(node) {
    if (node == this.rootNode || node == this.lhs)
      return;
    var newNode = null;
    if (node.previousSibling) {
      newNode = node.previousSibling;
      while (newNode.lastChild && newNode.lastChild.nodeName != "#text") {
        newNode = newNode.lastChild;
      }
    } else if (node.parentNode) {
      newNode = node.parentNode;
    }
    if (!newNode || newNode == this.rootNode || newNode == this.lhs)
      return;
    this.setCursor(newNode);
  },
  selectNext: function(node) {
    if (node.childNodes.length > 0 && node.firstChild.nodeName != "#text") {
      this.setCursor(node.firstChild);
    } else if (node.nextSibling) {
      this.setCursor(node.nextSibling);
    } else if (node.parentNode.lastChild == node) {
      var newNode = node;
      while (newNode && !newNode.nextSibling) {
        newNode = newNode.parentNode;
      }
      this.setCursor(newNode.nextSibling);
    }
  },
  looksLikeFunction: function() {
    var string = this.getJSFor(this.lhs);
    return this.functionRegEx.test(string);
  },
  looksLikeVar: function() {
    var string = this.getJSFor(this.lhs);
    return /^[a-zA-Z]*$/.test(string);
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
    var lhsstring = this.functionRegEx.exec(txt);
    if (!lhsstring) lhsstring = txt;
    else lhsstring = lhsstring[1];

    for (var i = 0; i < vars.length; i++) {
      var varString = this.getJSFor(vars[i]);
      // only add if this looks doesn't look like the thing we are defining
      if (lhsstring != varString && res.indexOf(varString) == -1)
        res.push(varString);
    }
    return res;
  },

  evalCurrent: function() {
    var js = this.toJSString();
    var res = "";
    try {
      res = eval(js);
      Editor.reportError("", this.rootNode);
    } catch(ex) {
      Editor.reportError(ex, this.rootNode);
    }
    return res;
  },
  isEmpty: function(aNode) {
    if (aNode.nodeName == "mrow" || aNode.nodeName == "mfenced")
      return false;
    return !aNode.textContent || aNode.textContent == emptyBox;
  },
  addNumber: function(aChar, aNode) { return this.updateNode("mn", aChar, aNode); },
  addChar: function(aChar, aNode) { return this.updateNode("mi", aChar, aNode); },
  textNodeTypes: ["mi", "mn"],
  updateNode: function(aName, aChar, aNode) {
    if (aNode.nodeName == aName)
      return this.appendToNode(aChar, aNode)
    else if (this.textNodeTypes.indexOf(aNode.nodeName) > -1) {
      if (this.isEmpty(aNode))
        return this.replaceNode(aName, aChar, aNode);
      else
        return this.multiplyCurrent(aChar, aNode, aName);
    } else {
      return this.appendNewNode(aName, aChar, aNode);
    }
  },
  replaceNode: function(aName, aChar, aNode) {
    this.appendNewNode(aName, aChar, aNode);
    aNode.parentNode.removeChild(aNode);
  },
  appendNewNode: function(aName, aChar, aNode) {
    var newNode = MathEditor.prototype.createNode(aName);
    newNode.textContent = aChar;
    if (aNode.nodeName == "mfenced" ||
        aNode.nodeName == "mrow" ||
        aNode.nodeName == "math" ||
        aNode.nodeName == "mtable" ||
        aNode.nodeName == "mtr" ||
        aNode.nodeName == "mtd") {
      aNode.appendChild(newNode);
    } else if (aNode.parentNode) {
      if (aNode.nextSibling) aNode.parentNode.insertBefore(newNode, aNode.nextSibling);
      else aNode.parentNode.appendChild(newNode);
    } else {
      aNode.appendChild(newNode);
    }
    this.setCursor(newNode, 0);
    return newNode;
  },
  multiplyCurrent: function(aChar, aNode, aNewNodeName) {
    var newNode = this.appendNewNode("mo", invisibleTimes, aNode);
    return this.appendNewNode(aNewNodeName, aChar, newNode);
  },
  toJSString: function() {
    return this.getJSFor(this.rootNode) + "; ";
  },
  getJSFor: function(aNode) {
    var txt = "";
    if (!aNode) return txt;
    if (aNode.nodeName == "math") {
      var vars = this.getVars();
      for (var i = 0; i < vars.length; i++) {
        var node = Editor.getFunction(vars[i]);
        if (node) {
          var newTxt = node.editor.toJSString();
          txt += newTxt;
        }
      }
      // we only do this check if we're looking at a root node (otherwise we'll hit an infinite loop)
      var isFun = this.looksLikeFunction(aNode);
      var hasEquals = false;
      if (isFun) txt += "function ";
      var isVar = this.looksLikeVar(aNode);
      if (isVar) txt += "var ";

      for (var i = 0; i < aNode.childNodes.length; i++) {
        var node = aNode.childNodes[i];
        if (node.nodeName == "mo" && node.textContent == "=") {
          if (!isFun && !isVar) break;
          else if (isFun) txt += "{ return ";
          else txt += "=";
          hasEquals = true;
        } else {
          txt += MathNodeEditor.toJSString(node);
        }
      }
      if (isFun && hasEquals) txt += "}";
    } else if (aNode.nodeName == "msub") {
      txt += this.getJSFor(aNode.childNodes[0]);
    } else if (aNode.nodeName == "mtable") {
      txt += this.addChildrenWithSep(aNode, ",");
    } else if (aNode.nodeName == "mtr") {
      txt += "[";
      txt += this.addChildrenWithSep(aNode, ",");
      txt += "]";
    } else if (aNode.nodeName == "mtd") {
      txt += this.addChildrenWithSep(aNode, ",");
    } else  txt += MathNodeEditor.toJSString(aNode);
    return txt;
  },
  addChildrenWithSep: function(aNode, aSep) {
    var txt = "";
    for (var i = 0; i < aNode.childNodes.length; i++) {
      txt += this.getJSFor(aNode.childNodes[i]);
      if (i < aNode.childNodes.length-1)
        txt += aSep;
    }
    return txt;
  }
}

function EditorNode(aType, aKey) {
  this.nodeTypes = [aType];
  this.keys = [aKey];
  this._ops = [];
}

EditorNode.prototype = {
  _handleKey: function(aChar, aNode) {
    console.log("key " + aChar);
    for (var i = 0; i < this._ops.length; i++) {
      console.log("ops " + JSON.stringify(this._ops[i]));
      if (this._ops[i].keys.test(aChar)) {
        return this._ops[i].handleKey(aChar, aNode);
      }
    }

    if (this.nodeTypes.indexOf(aNode.nodeName) > -1) {
      console.log("append " + aChar);
      return this.appendToNode(aChar, aNode)
    }
    console.log("Add " + aChar);
    return this.appendNewNode(this.nodeTypes[0], aChar, aNode);
  },
  handleKey: function(aChar, aNode) {
    return this._handleKey(aChar, aNode);
  },
  appendToNode: function(aChar, aNode) {
    if (aNode.textContent == emptyBox) aNode.textContent = aChar;
    else aNode.textContent += aChar;
    return aNode;
  },
  replaceNode: function(aName, aChar, aNode) {
    var newNode = MathEditor.prototype.createNode(aName);
    newNode.textContent = aChar;

    var parent = aNode.parentNode;
    var node = parent.insertBefore(newNode, aNode);
    parent.removeChild(aNode);
    return newNode;
  },
  appendNewNode: function(aName, aChar, aNode) {
    var newNode = MathEditor.prototype.createNode(aName);
    newNode.textContent = aChar;
    if (aNode.nodeName == "mrow" ||
        aNode.nodeName == "math" ||
        aNode.nodeName == "mfenced" ||
        aNode.nodeName == "mtable" ||
        aNode.nodeName == "mtr" ||
        aNode.nodeName == "mtd") {
      aNode.appendChild(newNode);
    } else if (aNode.parentNode) {
      if (aNode.nextSibling) aNode.parentNode.insertBefore(newNode, aNode.nextSibling);
      else aNode.parentNode.appendChild(newNode);
    } else {
      aNode.appendChild(newNode);
    }
    return newNode;
  },
  _toJSString: function(aNode) {
    for (var i = 0; i < this._ops.length; i++) {
      if (this._ops[i].nodeTypes.indexOf(aNode.nodeName) > -1) {
        return this._ops[i].toJSString(aNode);
      }
    }
    return aNode.textContent;
  },
  _getChildString: function(aNode) {
    var txt = "";
    for (var i = 0; i < aNode.childNodes.length; i++) {
      var node = aNode.childNodes[i];
      txt += MathNodeEditor.toJSString(node);
    }
    return txt;
  },
  toJSString: function(aNode) { return this._toJSString(aNode); },

  register: function(aEditor) {
    this._ops.push(aEditor);
    this.nodeTypes = this.nodeTypes.concat(aEditor.nodeTypes);
    this.keys = this.keys.concat(aEditor.keys);
  },
  toString: function() {
    return "Editor: " + this.nodeTypes + " - " + this.keys;
  },
}

var MathNodeEditor = new EditorNode("math", new RegExp(""));
var RowEditor = new EditorNode("mrow", new RegExp(""));
RowEditor.toJSString = function(aNode) {
  var className = aNode.getAttribute("class");
  var isSide = aNode.classList.contains("lhs") || aNode.classList.contains("rhs");
  var txt = "";
  if (!isSide) txt += "(";
  txt += this._getChildString(aNode);
  if (!isSide) txt += ")";
  return txt;
}
MathNodeEditor.register(RowEditor);

var VariableEditor = new EditorNode("mi", /[a-zA-Z]/);
VariableEditor.handleKey = function(aChar, aNode) {
  if (MathEditor.prototype.isEmpty(aNode)) {
    console.log("replace");
    return this.replaceNode(this.nodeTypes[0], aChar, aNode);
  }
  else if (aNode.nodeName == "mn")
    return MathEditor.prototype.multiplyCurrent(aChar, aNode, this.nodeTypes[0]);
  //else if (this.nodeTypes.indexOf(aNode.nodeName) == -1)
  //  return this.multiplyCurrent(aChar, aNode, this.nodeTypes[0]);
  else
    return this._handleKey(aChar, aNode);
}
VariableEditor.toJSString = function(aNode) {
  if (aNode.textContent == "sin") return "Math.sin";
  else if (aNode.textContent == "cos") return "Math.cos";
  else if (aNode.textContent == "e") return "Math.E"
  return aNode.textContent;
}
MathNodeEditor.register(VariableEditor);

var NumberEditor = new EditorNode("mn", /[0-9\.]/);
NumberEditor.handleKey = function(aChar, aNode) {
  if (MathEditor.prototype.isEmpty(aNode))
    return this.replaceNode(this.nodeTypes[0], aChar, aNode);
  else if (aNode.nodeName == "mi")
    return MathEditor.prototype.multiplyCurrent(aChar, aNode, this.nodeTypes[0]);
  //else if (this.nodeTypes.indexOf(aNode.nodeName) == -1)  return this.appendNewNode(this.nodeTypes[0], aChar, aNode)  ;
  else
    return this._handleKey(aChar, aNode);
}
MathNodeEditor.register(NumberEditor);

var OperatorEditor = new EditorNode("mo", /\+\-\*\//);
OperatorEditor.toJSString = function(aNode) {
  if (aNode.textContent == invisibleTimes) return "*";
  return this._toJSString(aNode);
}
OperatorEditor.handleKey = function(aChar, aNode) {
//  if (aNode.nodeName == "mfenced")
//    return MathEditor.prototype.multiplyCurrent(aChar, aNode, this.nodeTypes[0]);
  return this._handleKey(aChar, aNode);
}
MathNodeEditor.register(OperatorEditor);

var FractionEditor = new EditorNode("mfrac", /\//);
FractionEditor.toJSString =function(aNode) {
  var txt = MathEditor.prototype.getJSFor(aNode.childNodes[0]);
  txt += "/";
  txt += MathEditor.prototype.getJSFor(aNode.childNodes[1]);
  return txt;
}
OperatorEditor.register(FractionEditor);

var ExponentEditor = new EditorNode("msup", /\^/);
ExponentEditor.toJSString = function(aNode) {
  var txt = "Math.pow(";
  var drawBrackets = true;
  if (aNode.childNodes[0].textContent == "e") {
    txt = "Math.exp";
    drawBrackets = false;
  } else {
    txt += MathEditor.prototype.getJSFor(aNode.childNodes[0]);
    txt += ",";
  }
  txt += MathEditor.prototype.getJSFor(aNode.childNodes[1]);
  if (drawBrackets)
    txt += ")";
  return txt;
}
OperatorEditor.register(ExponentEditor);

var SubEditor = new EditorNode("msub", /\_/);
SubEditor.toJSString = function(aNode) {
  var txt = MathEditor.prototype.getJSFor(aNode.childNodes[0]);
  //txt += "_";
  //txt += MathEditor.prototype.getJSFor(aNode.childNodes[1]);
  return txt;
}
MathNodeEditor.register(SubEditor);

var SqrtEditor = new EditorNode("msqrt", /\\/);
SqrtEditor.toJSString = function(aNode) {
  return "Math.sqrt(" + this._getChildString(aNode) + ")";
}
OperatorEditor.register(SqrtEditor);

var FencedEditor = new EditorNode("mfenced", /\(/);
FencedEditor.toJSString = function(aNode) {
  return "(" + this._getChildString(aNode) + ")";
}
OperatorEditor.register(FencedEditor);
