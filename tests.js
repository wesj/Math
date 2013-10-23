var tests = [];
var currentIndex = 0;
var MATHML = "http://www.w3.org/1998/Math/MathML";
var foundFail = false;

function runTests(aResultBox) {
  var test = tests[currentIndex];
  aResultBox.classList.remove("hidden");
  if (test) {
    console.log("Running test " + test.name);
    var res = test.run();
    if (/FAIL/.test(res)) {
      foundFail = true;
      var txt = "<li class='fail'>" + test.name;
    } else {
      var txt = "<li class='pass'>" + test.name;
    }
    txt += "<ul>" + res + "</ul>";
    txt += "</li>";
    aResultBox.innerHTML += txt;
    currentIndex++;

    setTimeout(runTests, 0, aResultBox);
  } else {
    if (!foundFail) {
      setTimeout(function() {
        aResultBox.classList.add("hidden");
      }, 2000);
    }
  }
}

function Test(aName, aFunction) {
  this.name = aName;
  this.fun = aFunction;
}
Test.prototype = {
  name: "This is a test",
  run: function() {
    return this.fun();
  }
}

function KeyPressTest(aName, aKeys, MathMLDOM, aEquation) {
  this.name = aName;
  this.run = function() {
    var result = "";
    try {
      sendClick(0,0);
      for(var i = 0; i < aKeys.length; i++) {
        sendKey(aKeys.charCodeAt(i));
      }

      var editor = Editor._currentWindow.editor;
      var root = editor.rootNode;
      result += ok(root, "Found a math node in the document");
      result += is(root.childNodes.length, MathMLDOM.length, "Math node has one child");

      for (var i = 0; i < MathMLDOM.length; i++) {
        result += this.verifyNode(root.childNodes[i], MathMLDOM[i]);
      }
      result += is(editor.toJSString().trim(), aEquation, "Got correct equation");

      root.parentNode.parentNode.removeChild(root.parentNode);
    } catch(ex) {
      result += "<li class='fail'>FAIL: " + ex + "</li>";
    }
    return result;
  }
}
KeyPressTest.prototype = {
  verifyNode: function(aNode, aTest) {
    var result = "";
    try {
    result += is(aNode.nodeName, aTest.name, "First child is an " + aTest.name + " element");
    if (aTest.class)
      result += is(aNode.classList, aTest.class, "Node has correct classes");
    if (aTest.attrs) {
      for (var i in aTest.attrs) {
        result += is(aNode.getAttribute(i), aTest.attrs[i], "Attribute " + i + " is " + aTest.attrs[i]);
      }
    }
    if (aTest.children) {
      result += is(aNode.childNodes.length, aTest.children.length, "Row has correct number of children");
      for (var i = 0; i < aTest.children.length; i++) {
        result += this.verifyNode(aNode.childNodes[i], aTest.children[i]);
      }
    }
    if (aTest.text) {
      result += is(aNode.childNodes.length, 1, "Row has correct number of children");
      result += is(aNode.firstChild.nodeName, "#text", "firstchild is a text node");
      result += is(aNode.textContent, aTest.text, "textContent is " + aTest.text);
    }
    } catch(ex) {
      result += "<li class='fail'>FAIL: " + ex + "</li>";
    }
    var output = document.getElementById("output");
    while (output.firstChild) {
      output.removeChild(output.firstChild);
    }
    return result;
  }
}

function TestEval(aName, aKeys, aEquation, aResult) {
  this.name = aName;
  this.run = function() {
    var result = "";
    try {
      sendClick(0,0);
      for(var i = 0; i < aKeys.length; i++) {
        if (aKeys[i] == "?") sendClick(0,0);
        sendKey(aKeys.charCodeAt(i));
      }

      var roots = document.getElementsByTagNameNS(MATHML, "math");
      //result += is(roots.length, 2, "Correct number of math nodes");
      result += is(Editor._currentWindow.editor.toJSString(), aEquation, "Correct correct equation");
      result += is(Editor._currentWindow.editor.evalCurrent(), aResult, "Got correct result");

      var output = document.getElementById("output");
      while (output.firstChild) {
        output.removeChild(output.firstChild);
      }
    } catch(ex) {
      result += "<li class='fail'>FAIL: " + ex + "</li>";
    }
    return result;
  }
}

function TestSelection(aName, aKeys, aSelectKeys, aResult) {
  this.name = aName;
  this.run = function() {
    var result = "";
    try {
      sendClick(0,0);
      for(var i = 0; i < aKeys.length; i++) {
        if (aKeys[i] == "?") sendKey(null, 13);
        sendKey(aKeys.charCodeAt(i));
      }
      for(var i = 0; i < aSelectKeys.length; i++) {
        if (aSelectKeys[i] == "L") sendKey(0 ,37);
        else if (aSelectKeys[i] == "R") sendKey(0 ,39);
        else if (aSelectKeys[i] == "U") sendKey(0 ,38);
        else if (aSelectKeys[i] == "D") sendKey(0 ,40);

        var node = Editor._currentWindow.editor.getCurrent();
        result += is(node.nodeName, aResult[i].name, "Correct nodeName is selected");
        if (aResult[i].text) result += is(node.textContent, aResult[i].text, "Correct nodeText is selected");

      }

      var output = document.getElementById("output");
      while (output.firstChild) {
        output.removeChild(output.firstChild);
      }
    } catch(ex) {
      result += "<li class='fail'>FAIL: " + ex + "</li>";
    }
    return result;
  }
}

function sendClick(aX, aY) {
  var bcr = document.getElementById("output").getBoundingClientRect();
  Editor.addEquation(null, 5, bcr.top + 5);
}

function sendKey(aKey, aKeyCode) {
  if (!aKeyCode) aKeyCode = 0;
  var evt = document.createEvent("KeyEvents");
  evt.initKeyEvent("keypress", true, true, window, false, false, false, false, aKeyCode, aKey);
  window.dispatchEvent(evt);
}

function ok(aTest, aText) {
  var text = "<li ";
  if (aTest) text += "class='pass'>PASS: ";
  else text += "class='fail'>FAIL: ";
  text += aText + "</li>";
  return text;
}

function is(one, two, aText) {
  var text = "<li ";
  if (one == two) text += "class='pass'>PASS: " + aText + " (" + one + " == " + two;
  else text += "class='fail'>FAIL: " + aText + " (" + one + " != " + two;
  text += ")</li>";
  return text;
}

tests.push(new KeyPressTest("Test pressing the 'b' key", "b",
  [{name:"mrow", class: "lhs", children: [{name: "mi", text:"b"}]}], "var b;"));
tests.push(new KeyPressTest("Test pressing the 'aB' key", "aB",
  [{name:"mrow", class: "lhs", children: [{name: "mi", text:"aB"}]}], "var aB;"));

tests.push(new KeyPressTest("Test pressing the '1' key", "1",
  [{name:"mrow", class: "lhs", children: [{name: "mn", text:"1"}]}], "1;"));
tests.push(new KeyPressTest("Test pressing the '12.5' key", "12.5",
  [{name:"mrow", class: "lhs", children: [{name: "mn", text:"12.5"}]}], "12.5;"));
tests.push(new KeyPressTest("Test pressing the 'x+2' key", "x+2",
  [{name:"mrow", class: "lhs", children: [
    {name: "mi", text:"x"},
    {name: "mo", text:"+"},
    {name: "mn", text:"2"}
  ]}], "x+2;"));

tests.push(new KeyPressTest("Test pressing the '2/x' key", "2/x",
  [{name: "mrow", class: "lhs", children:
    [{name: "mfrac", children: [
      {name: "mn", text:"2"},
//TODO    {name: "mrow", children: [{name: "mn", text:"2"}]},
      {name: "mrow", children: [{name: "mi", text:"x"}]},
  ]}]}], "2/(x);"));
tests.push(new KeyPressTest("Test pressing the '2/x  -1' key", "2/x  -1", // TODO <- two spaces required?
  [{name: "mrow", children:
      [{name: "mfrac", children: [
        {name: "mn", text:"2"},
// TODO     {name: "mrow", children: [{name: "mn", text:"2"}]},
        {name: "mrow", children: [{name: "mi", text:"x"}]}
      ]},
      {name: "mo", text:"-"},
      {name: "mn", text:"1"}]
  }], "2/(x)-1;"));
tests.push(new KeyPressTest("Test pressing the '1.5+1=' keys", "1.5+1=",
  [{name: "mrow", class: "lhs", children:
    [{name: "mn", text:"1.5"},
     {name: "mo", text:"+"},
     {name: "mn", text:"1"}]
  },
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"2.5"}
  ]}], "1.5+1;"));

tests.push(new KeyPressTest("Test pressing the '1+1=+1' keys", "1+1=+1",
  [{name: "mrow", class: "lhs", children: [
       {name: "mn", text:"1"},
       {name: "mo", text:"+"},
       {name: "mn", text:"1"},
       {name: "mo", text:"+"},
       {name: "mn", text:"1"}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"3"}
  ]}], "1+1+1;"));

tests.push(new KeyPressTest("Test pressing the '2^2=' keys", "2^2=",
  [{name: "mrow", class: "lhs", children: [
      {name: "msup", children:[
          {name: "mn", text: "2"},
          {name: "mrow", children: [{name: "mn", text: "2"}]}
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"4"}
  ]}], "Math.pow(2,(2));"));

tests.push(new KeyPressTest("Test pressing the '2_2=' keys", "2_2=",
  [{name: "mrow", class: "lhs", children: [
      {name: "msub", children:[
          {name: "mn", text: "2"},
          {name: "mrow", children: [{name: "mn", text: "2"}]}
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"2"}
  ]}], "2;"));

tests.push(new KeyPressTest("Test pressing the '\\4=' keys", "\\4=",
  [{name: "mrow", class: "lhs", children: [
      {name: "msqrt", children:[
          {name: "mn", text: "4"},
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"2"}
  ]}], "Math.sqrt(4);"));

tests.push(new KeyPressTest("Test pressing the '4\\=' keys", "\\4=",
  [{name: "mrow", class: "lhs", children: [
      {name: "msqrt", children:[
          {name: "mn", text: "4"},
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"2"}
  ]}], "Math.sqrt(4);"));

tests.push(new KeyPressTest("Test pressing the 'f(x)=x' keys", "f(x)=x",
  [{name: "mrow", class: "lhs", children: [
      {name: "mi", text: "f"},
      {name: "mfenced", text: "", open: "(", close: ")", separators: "", children: [
        {name: "mi", text: "x"},
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs", children: [
    {name: "mi", text:"x"}
  ]}], "function f(x){ return x};"));

tests.push(new KeyPressTest("Test pressing the 'x=3' keys", "x=3",
  [{name: "mrow", class: "lhs", children: [
      {name: "mi", text: "x"},
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs", children: [
    {name: "mn", text:"3"}
  ]}], "var x=3;"));

tests.push(new KeyPressTest("Test pressing the 'cos(0)=' keys", "cos(0)=",
  [{name: "mrow", class: "lhs", children: [
      {name: "mi", text: "cos"},
      {name: "mfenced", text: "", open: "(", close: ")", separators: "", children: [
        {name: "mn", text: "0"},
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"1"}
  ]}], "Math.cos(0);"));

tests.push(new KeyPressTest("Test pressing the 'sin(0)=' keys", "sin(0)=",
  [{name: "mrow", class: "lhs", children: [
      {name: "mi", text: "sin"},
      {name: "mfenced", text: "", open: "(", close: ")", separators: "", children: [
        {name: "mn", text: "0"},
      ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"0"}
  ]}], "Math.sin(0);"));

tests.push(new KeyPressTest("Test pressing the 'e^0=' keys", "e^0=",
  [{name: "mrow", class: "lhs", children: [
    {name: "msup", children: [
      {name: "mi", text: "e"},
      {name: "mrow", children: [
        {name:"mn", text: "0"},
      ]}    
    ]}
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"1"}
  ]}], "Math.exp(0);"));

tests.push(new KeyPressTest("Test pressing the 'e^x^2' keys", "e^x^2",
  [{name: "mrow", class: "lhs", children: [
    {name: "msup", children: [
      {name: "mi", text: "e"},
      {name: "mrow", children: [
        {name: "msup", children: [
          {name: "mi", text: "x"},
          {name: "mrow", children: [
            {name:"mn", text: "2"},
          ]}    
        ]}
      ]}    
    ]}
  ]}
  ], "Math.exp(Math.pow(x,(2)));"));

tests.push(new KeyPressTest("Test pressing the 'e*2=' keys", "e*2=",
  [{name: "mrow", class: "lhs", children: [
    {name: "mi", text: "e"},
    {name: "mo", text: invisibleTimes},
    {name: "mn", text: "2"},
  ]},
  {name: "mo", class: "equality", text:"="},
  {name: "mrow", class: "rhs generated", children: [
    {name: "mn", text:"5.43656365691809"}
  ]}], "Math.E*2;"));

tests.push(new TestEval("Test pressing the 'f(x)=x?1+f(1)' keys", "f(x)=x?1+f(1)", "function f(x){ return x}; 1+f(1); ", 2));
tests.push(new TestEval("Test pressing the 'f(x)=e^x^2?f(1)' keys", "f(x)=e^x^2?f(1)", "function f(x){ return Math.exp(Math.pow(x,(2)))}; f(1); ", 2.718281828459045));
tests.push(new TestEval("Test pressing the 'f(x)=x?f(1)+1' keys", "f(x)=x?f(1)+1", "function f(x){ return x}; f(1)+1; ", 2));
tests.push(new TestEval("Test pressing the 'f(x,y)=x+y?f(2,5)=' keys", "f(x,y)=x+y?f(2,5)", "function f(x,y){ return x+y}; f(2,5); ", 7));
tests.push(new TestSelection("Test 1+2 and no arrow keys", "1+2", "", { name: "mn", text: "2"}));
tests.push(new TestSelection("Test 1+2 and left arrow key", "1+2", "LLLRR", [{ name: "mo", text: "+"},
                                                                             { name: "mn", text: "1"},
                                                                             { name: "mn", text: "1"},
                                                                             { name: "mo", text: "+"},
                                                                             { name: "mn", text: "2"}]));

tests.push(new TestSelection("Test 1^x+2 and left arrow key 3x", "1^x  +2", "LLLLLRRRR", [{name: "mo", text: "+"},
                                                                                          {name: "mi", text: "x"},
                                                                                          {name: "mrow", text: "x"},
                                                                                          {name: "mn", text: "1"},
                                                                                          {name: "msup", text: "1x"},
                                                                                          {name: "mn", text: "1"},
                                                                                          {name: "mrow", text: "x"},
                                                                                          {name: "mi", text: "x"},
                                                                                          {name: "mo", text: "+"},
                                                                                          {name: "mn", text: "2"}]));
