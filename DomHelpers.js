define(function (require, exports, module) {
var MATHML = "http://www.w3.org/1998/Math/MathML";

var createNode = function(name, attrs, children) {
  var ret = document.createElementNS(MATHML, name);
  if (attrs) {
    for (attr in attrs) {
      if (attr === "text") {
        ret.textContent = attrs[attr];
      } else {
        ret.setAttribute(attr, attrs[attr]);
      }
    }
  }

  if (children) {
    appendChildren(children, ret);
  }

  return ret;
}

var appendChildren = function(children, parent) {
    if (!children) {
        return;
    }

    if (children.forEach) {
        children.forEach(function(res) {
            appendChildren(res, parent);
        })
    } else {
        parent.appendChild(children);
    }
}

var appendNewNode = function(aName, aChar, aNode) {
    var newNode = exports.createNode(aName);
    newNode.textContent = aChar;

    if (aNode.nodeName == "mrow" ||
            aNode.nodeName == "math" ||
            aNode.nodeName == "mfenced" ||
            aNode.nodeName == "mtr" ||
            aNode.nodeName == "mtd") {
        aNode.appendChild(newNode);
    } else if (aNode.parentNode) {
        if (aNode.nodeName == "mi" && aNode.textContent == "") {
            aNode.parentNode.replaceChild(newNode, aNode);
        } else if (aNode.nextSibling) {
            aNode.parentNode.insertBefore(newNode, aNode.nextSibling);
        } else {
            aNode.parentNode.appendChild(newNode);
        }
    } else {
        aNode.appendChild(newNode);
    }

    return newNode;
}

var appendToNode = function(aChar, aNode) {
    if (aNode.textContent == emptyBox) aNode.textContent = aChar;
    else aNode.textContent += aChar;

    return aNode;
}

var replaceNode = function(aName, aChar, aNode) {
    var newNode = exports.createNode(aName);
    newNode.textContent = aChar;

    var parent = aNode.parentNode;
    var node = parent.insertBefore(newNode, aNode);
    parent.removeChild(aNode);

    return newNode;
}

exports.createNode = createNode;
exports.replaceNode = replaceNode;
exports.appendChildren = appendChildren;
exports.appendNewNode = appendNewNode;
exports.appendToNode = appendToNode;

});