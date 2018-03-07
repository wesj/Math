# Math
MathML editing and evaluation

Pieces of an HTML graphing calculator, not all really hooked together yet.

## Usage
Download and open the Math4.html file. You can type some math. Only one line right now.

## History
I started this project long long ago, and then hated the code and let it rot. Lately, I've been playing with it again. Its not good, but I like toying with it.

## Goals
I had a couple goals here. Who knows which ones will survive. They're something like:

1.) Make MathML editing an easy thing to add to a website. Ideally something along the lines of
```
div.setAttribute("contentEditable")
document.executeCommand("math")
```
In MathML Mode, you should be able to create matricies, vectors, fractions, squareroots, powers, indexed values, etc. by typing natural mathematic equivalents.

I want selection to work like it does in MathCAD as well, where space allows you to select and manuipulate multiple nodes at once. i.e `1+2<space>*3` should result in `(1+2)*3`

2.) Make converting MathML to an AST easy. That's sorta in place here, with `MathMLToAstBuilder.js`

3.) Allow evaluating, simplifying, and converting an AST back to MathML, Javascript, or if possible, into a javascript object (i.e. a Matrix, Number, etc). Again, sorta in place here with `AstToJavascript.js`, `AstToMathML.js`, and `AstEvaluator.js`.

4.) Allow performing symbolic manipulations on the AST. i.e. expanding or collapsing, completing squares, symbolic derivatives, solving for variables.

5.) Provide a graphing library to make 2d and 3d plots of "functions" (functions here are really just definitions of relationships between variables i.e. `x = y`.

6.) Provide a simple webpage to let you play with things.

