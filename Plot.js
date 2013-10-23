var SVGNS = "http://www.w3.org/2000/svg";
var emptyBox = String.fromCharCode(0x25A1);

function Plot(aRoot) {
  this.resolution = 100;

  this.width = 200;
  this.height = 200;

  if (aRoot) this.init(aRoot);
}

Plot.prototype = {
  currentColor: 0,
  colors: ["red", "orange", "gold", "green", "blue", "purple"],
  deselect: function() { },
  setSize: function(aWidth, aHeight) {
    this.width = aWidth;
    this.svg.setAttribute("width", aWidth);

    this.height = aHeight;
    this.svg.setAttribute("height", aHeight);

    if (!this.plot) this.createPlot();
  },
  plotToReal: function(x, y) {
    //console.log("x Convert " + x + " to " + (x*this.width/(this.maxX - this.minX) - this.minX));
    //console.log("y Convert " + y + " to " + (y*this.height/(this.maxY - this.minY) - (this.minY-this.maxY))*-1);
    return {
      x: (x - this.minX)*(this.width-20)/(this.maxX-this.minX)+20, //*this.width/(this.maxX - this.minX),
      y: (this.minY - y)*(this.height-20)/(this.maxY-this.minY) + this.height - 20// *this.height/(this.maxY - this.minY) - (this.minY-this.maxY))*-1
    }
  },
  realToPlot: function(x,y) {
    return {
      x: (x-20)/(this.width-20)*(this.maxX-this.minX)+this.minX, //*this.width/(this.maxX - this.minX),
      y: (y-this.height+20)/(this.height-20)*(this.maxY-this.minY) - this.minY// *this.height/(this.maxY - this.minY) - (this.minY-this.maxY))*-1
    }
  },
  handleResize: function(aRect) {
    this.setSize(aRect.width, aRect.height);
  },
  handleEvent: function(aEvent) {
    aEvent.preventDefault();
    //var selObj = window.getSelection().anchorNode;
    if (aEvent.keyCode == 13 || aEvent.charCode == 44) {
      var funObj = {};
      if (this._currentLabel.editor.looksLikeFunction()) {
        funObj.node = Editor.getFunction(this._currentLabel.editor.toJSString());
        if (funObj.node) {
          var edit = funObj.node.editor;
          funObj.fun = edit.toJSString() + selObj.textContent;
          this.addFunction(funObj);
        }
      } else {
        funObj.node = this._currentLabel;
        if (funObj.node) {
          var edit = funObj.node.editor;
          funObj.fun = edit.toJSString();
          this.addFunction(funObj);
        }
      }

      this.setCursor(null, 0);
      return;
    } else {
      this._currentLabel.editor.handleEvent(aEvent);
    }
  },
  _currentLabel: null,
  createEmptyLabel: function() {
    var label = this.createHTMLElt("li", {});
    this.labels.appendChild(label);
    label.editor = new MathEditor(label);
    return label;
  },
  setCursor: function(aNode, aOffset) {
    this.addAxis();
    if (!this.labels) this.createLabels();

    if (!aNode) {
      var label = this.labels.lastChild;
      if (!this._currentLabel) this._currentLabel = this.createEmptyLabel();
    } else {
      this._currentLabel = aNode;
    }
  },
  init: function(aRoot) {
    this.svg = document.createElementNS(SVGNS, "svg");
    this.root = aRoot;
    this.root.appendChild(this.svg);
    var bcr = aRoot.getBoundingClientRect();
    this.setSize(bcr.width, bcr.height);

    this.startDrag = this.startDrag.bind(this);
    this.endDrag   = this.endDrag.bind(this);
    this.drag      = this.drag.bind(this);
    this.onClick   = this.onClick.bind(this);
    this.onScroll  = this.onScroll.bind(this);

    this.svg.addEventListener("mousedown", this.startDrag, false);
    this.svg.addEventListener("mousemove", this.drag, false);
    this.svg.addEventListener("mouseup", this.endDrag, false);
    this.svg.addEventListener("click", this.onClick, false);
    this.svg.addEventListener("DOMMouseScroll", this.onScroll, false);
  },

  prevPoint: null,
  startDrag: function(aEvent) {
    console.log("down");
    var bcr = this.svg.getBoundingClientRect();
    aEvent.stopPropagation();
    aEvent.preventDefault();
    this.prevPoint = {
      real: { x: aEvent.clientX, y: aEvent.clientY },
      plot: this.realToPlot(aEvent.clientX - bcr.left,
                            aEvent.clientY - bcr.top)
    };
    //
    //console.log(this.prevPoint.x + "," + this.prevPoint.y);
  },
  drag: function(aEvent) {
    aEvent.stopPropagation();
    aEvent.preventDefault();
    var bcr = this.svg.getBoundingClientRect();
    if (this.prevPoint) {
      var newpt = this.realToPlot(aEvent.clientX - bcr.left,
                                  aEvent.clientY - bcr.top);
      var dx = (aEvent.clientX - this.prevPoint.real.x)/((this.width-20)/(this.maxX - this.minX));
      var dy = (aEvent.clientY - this.prevPoint.real.y)/((this.height-20)/(this.maxY - this.minY));
      this.minX -= dx;
      this.maxX -= dx;
      this.minY += dy;
      this.maxY += dy;
      this.prevPoint = {
        real: { x: aEvent.clientX, y: aEvent.clientY },
        plot: newpt
      };//newpt;
      this.updatePlot();
    }
  },
  endDrag: function(aEvent) {
    aEvent.stopPropagation();
    aEvent.preventDefault();
    this.prevPoint = null;
  },
  onClick: function(aEvent) {
    aEvent.stopPropagation();
    aEvent.preventDefault();
  },
  onScroll: function(aEvent) {
    console.log("scroll");
    try {
    aEvent.stopPropagation();
    aEvent.preventDefault();

    var bcr = this.svg.getBoundingClientRect();
    var newpt = this.realToPlot(aEvent.clientX - bcr.left,
                                aEvent.clientY - bcr.top);

    var scale = (1+aEvent.detail/100);
    this.minX = (this.minX - newpt.x)*scale + newpt.x;
    this.minY = (this.minY - newpt.y)*scale + newpt.y;
    this.maxX = (this.maxX - newpt.x)*scale + newpt.x;
    this.maxY = (this.maxY - newpt.y)*scale + newpt.y;

    this.updatePlot();
    } catch(ex) { console.log(ex); }
  },

  updatePlot: function() {
    this.xaxis = null;
    this.yaxis = null;
    while (this.grid.firstChild) {
      this.grid.removeChild(this.grid.firstChild);
    }
    this.addAxis();
    this.addGridMarkers();
    for (var i = 0; i < this.functions.length; i++) {
      var d = this.getResults(this.functions[i].fun);
      this.functions[i].path.setAttribute("d", d);
    }
  },

  createPlot: function() {
    this.plot = this.createElt("g", { });
    this.svg.appendChild(this.plot);
  },

  createGrid: function() {
    this.grid = this.createElt("g", {});
    if (!this.plot) this.createPlot();
    this.plot.appendChild(this.grid);
  },

  createLabels: function() {
    //var labels = this.createElt("foreignObject", {
      //x: 0, y: 0, width: 30, height: 100
    //});
    //this.labels = this.createHTMLElt("ul", {contentEditable: "true", class: "plotLabels"});
    //labels.appendChild(this.labels);
    //this.root.appendChild(this.labels);
  },

  minX: -10,
  maxX: 10,
  minY: 0,
  maxY: 10,
  axisWidth: 1,
  axisColor: "gray",

  addAxis: function() {
    if (!this.grid) this.createGrid();
    if (!this.xaxis) {
      var y = Math.max(0, this.minY);
      var pt1 = this.plotToReal(this.minX, y);
      var pt2 = this.plotToReal(this.maxX, y);
      this.xaxis = this.createElt("line", {
        x1: pt1.x, x2: pt2.x,
        y1: pt1.y, y2: pt2.y,
        stroke: this.axisColor,
        "stroke-width": this.axisWidth
      });
      this.grid.appendChild(this.xaxis);
    }
    if (!this.yaxis) {
      var x = Math.max(0, this.minX);
      var pt1 = this.plotToReal(x, this.minY);
      var pt2 = this.plotToReal(x, this.maxY);
      this.yaxis = this.createElt("line", {
        x1: pt1.x, x2: pt2.x,
        y1: pt1.y, y2: pt2.y,
        stroke: this.axisColor,
        "stroke-width": this.axisWidth
      });
      this.grid.appendChild(this.yaxis);
    }
  },

  minorMarkerLength: 2,
  majorMarkerLength: 5,
  majorSpacing: 5,
  numMarkers: 20,
  addGridMarkers: function() {
    if (!this.grid) this.createGrid();

    var i = 0;
    for (var x = this.minX; x <= this.maxX; x += (this.maxX - this.minX)/this.numMarkers) {
      var l = i%this.majorSpacing == 0 ? this.majorMarkerLength : this.minorMarkerLength;
      var y = Math.max(0, this.minY);
      var pt = this.plotToReal(x, y);
      var mark = this.createElt("line", {
        x1: pt.x,  x2: pt.x,
        y1: pt.y-l, y2: pt.y+l,
        stroke: "gray",
        "stroke-width": 1
      });
      this.grid.appendChild(mark);
      if (i%this.majorSpacing == 0 && x != 0) {
        var text = this.createElt("text", {
          x: pt.x, y: pt.y+l+8,
          "text-anchor": "middle",
          "font-size": "13pt"
        });
        text.textContent = Math.round(x);
        this.grid.appendChild(text);
      }
      i++;
    }
    i = 0;
    for (var y = this.minY; y <= this.maxY; y += (this.maxY - this.minY)/this.numMarkers) {
      var l = i%this.majorSpacing == 0 ? this.majorMarkerLength : this.minorMarkerLength;
      var x = Math.max(0, this.minX);
      var pt = this.plotToReal(x, y);
      var mark = this.createElt("line", {
        x1: pt.x-l, x2: pt.x+l,
        y1: pt.y,   y2: pt.y,
        stroke: "gray",
        "stroke-width": 1
      });
      this.grid.appendChild(mark);
      if (i%this.majorSpacing == 0 && y != 0) {
        var text = this.createElt("text", {
          x: pt.x - l - 6, y: pt.y+4,
          "text-anchor": "end",
          "font-size": "10pt"
        });
        text.textContent = Math.round(y);
        this.grid.appendChild(text);
      }
      i++;
    }
  },

  functions: [],
  getResults: function(aFun) {
    var d = "";
    var isFirst = true;
    for (var x = this.minX; x <= this.maxX; x += (this.maxX-this.minX)/this.resolution) {
      // TODO - add an isFirst variable to determine which letter to write before the numbers
      x = Math.round(x*10)/10;
      res = eval(aFun);
      if (res > this.minY && res < this.maxY) {
        d += isFirst ? "M " : " L ";
        isFirst = false;
        var pt = this.plotToReal(x, res);
        d += pt.x + " " + pt.y;
      }
    }
    return d;
  },
  addFunction: function(aMathWindow) {
    if (aMathWindow.label) {
      //var label = this.createHTMLElt("li", {});
      //label.textContent = aMathWindow.label;
  
      //if (!this.labels) this.createLabels();
      //this.labels.appendChild(label);
    }

    var d = this.getResults(aMathWindow.fun);
    aMathWindow.path = this.createElt("path", {
      fill: "none",
      "stroke-width": 1,
      d: d
    });
    if (aMathWindow.lineColor) {
      aMathWindow.path.setAttribute("stroke", aMathWindow.lineColor);
    } else {
      aMathWindow.path.setAttribute("stroke", this.colors[this.currentColor]);
      this.currentColor = (this.currentColor + 1) % this.colors.length;
    }
    if (!this.plot) this.createPlot();
    this.addAxis();
    this.addGridMarkers();
    this.plot.appendChild(aMathWindow.path);

    this.functions.push(aMathWindow);
  },

  createElt: function(aName, aProps) {
    var elt = document.createElementNS(SVGNS, aName);
    for (var prop in aProps) {
      elt.setAttribute(prop, aProps[prop]);
    }
    return elt;
  },

  createHTMLElt: function(aName, aProps) {
    var elt = document.createElementNS("http://www.w3.org/1999/xhtml", aName);
    for (var prop in aProps) {
      elt.setAttribute(prop, aProps[prop]);
    }
    return elt;
  }
}