define(function (require, exports, module) {

if (!window.__tests) {
  window.__tests = [];
}

var DOMHelpers = require('DOMHelpers').DOMHelpers;
var currentIndex = 0;

function runTests() {
  var test = __tests[currentIndex];
  if (test) {
    addedGroup = false;
    currentName = test.name;
    test.run();
    if (addedGroup) {
        console.groupEnd();
    }
    currentIndex++;

    setTimeout(runTests, 0);
  } else {
    console.log(passes, "Passed,", fails, "Failed");
  }
}

var passes = 0;
var fails = 0;
var currentName = "";
var addedGroup = false;
function ok(aTest, aText) {
  if (aTest) {
    /*
    if (!addedGroup) {
        addedGroup = true;
        console.group(currentName);
    }
    console.log("PASS:", aText);
    */
    passes++;
  } else {
    if (!addedGroup) {
        addedGroup = true;
        console.group(currentName);
    }
    console.error("FAIL:", aText);
    fails++;
  }
}

function is(one, two, aText) {
    ok(compare(one, two), aText + ": " + one + " === " + two);
}

function sendClick(aX, aY) {
    var bcr = document.getElementById("output").getBoundingClientRect();
    Editor.addEquation(null, 5, bcr.top + 5);
}

function sendKey(aKey, aKeyCode, editor, options) {
    if (!aKeyCode) {
      aKeyCode = 0;
    }
    options = options || {};
    var evt = document.createEvent("KeyEvents");
    evt.initKeyEvent("keypress", true, true, window,
        options.ctrlKey,
        options.altKey,
        options.shiftKey,
        options.metaKey,
        aKeyCode, aKey);
    editor.handleEvent(evt);
}

function compare(a, b) {
    if (a && a.equals) {
        return a.equals(b);
    } else if (b && b.equals) {
        return b.equals(a);
    } else {
        return a === b;
    }
}

function verifyNode(aNode, aTest) {
  try {
      is(aNode.nodeName, aTest.nodeName, "nodeName");
      is(aNode.textContent, aTest.textContent, "textContent");

      var attrs = aTest.attributes;
      for (var i = 0; i < attrs.length; i++) {
          is(aNode.getAttribute(i), aTest.getAttribute(i), "Attribute");
      }

      if (aTest.children) {
          // is(aNode.childElementCount, aTest.childElementCount, "Row has correct number of children");
          for (var i = 0; i < aTest.children.length; i++) {
              verifyNode(aNode.childNodes[i], aTest.children[i]);
          }
      }

  } catch(ex) {
      ok(false, ex);
  }

  var output = document.getElementById("output");
  while (output.firstChild) {
    output.removeChild(output.firstChild);
  }
}

exports.runTests = runTests;
exports.push = __tests.push;
exports.tests = __tests;
exports.is = is;
exports.ok = ok;
exports.sendClick = sendClick;
exports.sendKey = sendKey;
exports.compare = compare;
exports.verifyNode = verifyNode;
});