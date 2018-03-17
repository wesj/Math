define(function (require, exports, module) {

var Context = require("Context");
var ops = require("Operator");
var AstEvaluator = require("AstEvaluator");
var MSet = require("MSet").MSet;

var SVGNS = "http://www.w3.org/2000/svg";
var emptyBox = String.fromCharCode(0x25A1);

function SVGRenderer(aRoot) {
    this.svg = this.createElt("svg");
    if (aRoot) {
        aRoot.appendChild(this.svg);
    }
    this.plot = this.createElt("g");
}

SVGRenderer.prototype = {
    clear: function() {
        while (this.plot.firstChild) {
            this.plot.removeChild(this.plot.firstChild);
        }
    },

    resize: function(w, h) {
        this.svg.setAttribute("width", w);
        this.svg.setAttribute("height", h);
    },

    getBoundingClientRect: function() {
        return this.svg.getBoundingClientRect();
    },

    createGroup: function(name) {
        var grid = this.createElt("g", {});
        this.plot.appendChild(grid);
        grid.id = name;
        return grid;
    },

    currentGroups: [],

    save: function(name) {
        // console.log(this.plot);
        var group = this.plot.querySelector("#" + name);
        if (!group) {
            group = this.createGroup(name);
        }
        this.currentGroups.push(group);
    },

    restore: function() {
        this.currentGroups.pop();
    },

    drawLine: function(a, b, color, width) {
        return this.createElt("line", {
            x1: a.x, x2: b.x,
            y1: a.y, y2: b.y,
            stroke: color,
            "stroke-width": width
        });
    },

    drawText: function(str, pt, anchor, size) {
        var text = this.createElt("text", {
            x: pt.x, y: pt.y,
            "text-anchor": anchor,
            "font-size": size + "pt"
        });
        text.textContent = str;
        return text;
    },

    beginPath: function(callback, color, width) {
        var d = [""];
        var addToPaths = function(func, pt) {
            // This isn't right at all yet
            if ("length" in pt) {
                if (pt.length > 0) {
                    while(d.length < pt.length) {
                        d.push(d[0]);
                    }

                    d = pt.map(function(path, index) {
                        return d[index] + func + " " + path.x + " " + path.y + " "
                    })
                    return true;
                }
            } else {
                d = d.map(function(path) {
                    return path + func + " " + pt.x + " " + pt.y + " "
                })
                return true;
            }
            return false;
        }
        var pathHandler = {
            moveTo: function(pt) {
                return addToPaths("M", pt)
            },

            lineTo: function(pt) {
                return addToPaths("L", pt)
            }
        }

        callback(pathHandler);

        d.forEach(function(path) {
            var p = this.createElt("path", {
                stroke: color,
                "stroke-width": width,
                fill: "none"
            });
            p.setAttribute("d", path);
        }, this);
    },

    createElt: function(aName, aProps) {
        var elt = document.createElementNS(SVGNS, aName);
        for (var prop in aProps) {
            elt.setAttribute(prop, aProps[prop]);
        }

        var l = this.currentGroups.length;
        if (l > 0) {
            this.currentGroups[l - 1].appendChild(elt);
        } else if (this.plot) {
            this.plot.appendChild(elt);
        } else if (this.svg) {
            this.svg.appendChild(elt);
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

function Pt(x, y) {
    this.x = x;
    this.y = y;
}

Pt.prototype = {
    plus: function(dx, dy) {
        return new Pt(this.x + dx, this.y + dy);
    },
    minus: function(dx, dy) {
        return new Pt(this.x - dx, this.y - dy);
    }
}

window.Plot = function(aRoot) {
    this.renderer = new SVGRenderer(aRoot);
    this.resolution = 50;
    this.width = 200;
    this.height = 200;
    this.padding = 0;
    this.functions = [];

    if (aRoot) {
        this.init(aRoot);
    }
}

Plot.prototype = {
    currentColor: 0,
    colors: ["red", "orange", "gold", "green", "blue", "purple"],
    deselect: function() { },
    setSize: function(aWidth, aHeight) {
        this.width = aWidth;
        this.height = aHeight;
        var xRange = this.maxX - this.minX;
        var yRange = xRange * aHeight / aWidth;
        this.minY = yRange / -2;
        this.maxY = yRange / 2;
        this.renderer.resize(aWidth, aHeight);
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

    plotToReal: function(x, y) {
        if (y !== y) {
            return;
        }

        if (y && y.vals) {
            var self = this;
            var ret = y.vals.reduce(function(arr, val) {
                if (val !== val) {
                    // return arr;
                } else {
                    arr.push(self.plotToReal(x, val));
                }
                return arr;
            }, []);
            return ret;
        }

        return new Pt(
            (x - this.minX) * (this.width-this.padding) / (this.maxX-this.minX)+this.padding,
            (this.minY - y)*(this.height-this.padding)/(this.maxY-this.minY) + this.height - this.padding
        );
    },

    realToPlot: function(x,y) {
        if (y instanceof MSet) {
            return y.vals.map(function(val) {
                return this.realToPlot(x, val);
            }, this);
        }

        return new Pt(
            (x-this.padding)/(this.width-this.padding)*(this.maxX-this.minX)+this.minX,
            (y-this.height+this.padding)/(this.height-this.padding)*(this.maxY-this.minY) - this.minY
        )
    },

    init: function(aRoot) {
        var bcr = aRoot.getBoundingClientRect();
        this.setSize(bcr.width, bcr.height);

        aRoot.addEventListener("mousedown", this.startDrag.bind(this), false);
        aRoot.addEventListener("mousemove", this.drag.bind(this), false);
        aRoot.addEventListener("mouseup", this.endDrag.bind(this), false);
        aRoot.addEventListener("DOMMouseScroll", this.onScroll.bind(this), false);

        this.updatePlot();
    },

    prevPoint: null,
    startDrag: function(aEvent) {
        var bcr = this.renderer.getBoundingClientRect();
        aEvent.stopPropagation();
        aEvent.preventDefault();
        this.prevPoint = {
            real: { x: aEvent.clientX, y: aEvent.clientY },
            plot: this.realToPlot(aEvent.clientX - bcr.left,
                                  aEvent.clientY - bcr.top)
        };
    },

    drag: function(aEvent) {
        aEvent.stopPropagation();
        aEvent.preventDefault();
        var bcr = this.renderer.getBoundingClientRect();
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
            };
            this.updatePlot();
        }
    },

    endDrag: function(aEvent) {
        aEvent.stopPropagation();
        aEvent.preventDefault();
        this.prevPoint = null;
    },

    onScroll: function(aEvent) {
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
        } catch(ex) {
            console.log(ex);
        }
    },

    updatePlot: function() {
        this.xaxis = null;
        this.yaxis = null;
        this.renderer.clear();
        this.addAxis();
        this.addGridMarkers();

        for (var i = 0; i < this.functions.length; i++) {
            this.drawFunction(this.functions[i]);
        }
    },

    minX: -10,
    maxX: 10,
    minY: 0,
    maxY: 10,
    axisWidth: 1,
    axisColor: "gray",

    addAxis: function() {
        this.renderer.save("addGridMarkers");

        if (!this.xaxis) {
            var y = Math.max(0, this.minY);
            var pt1 = this.plotToReal(this.minX, y);
            var pt2 = this.plotToReal(this.maxX, y);
            this.xaxis = this.renderer.drawLine(pt1, pt2, this.axisColor, this.axisWidth);
        }

        if (!this.yaxis) {
            var x = Math.max(0, this.minX);
            var pt1 = this.plotToReal(x, this.minY);
            var pt2 = this.plotToReal(x, this.maxY);
            this.yaxis = this.renderer.drawLine(pt1, pt2, this.axisColor, this.axisWidth);
        }

        this.renderer.restore();
    },

    minorMarkerLength: 2,
    majorMarkerLength: 5,
    majorSpacing: 2,
    numMarkers: 10,

    addGridMarkers: function() {
        this.renderer.save("grid");

        var i = 0;
        var y = Math.max(0, this.minY);

        for (var x = this.minX; x <= this.maxX; x += (this.maxX - this.minX)/this.numMarkers) {
            if (x == 0) {
                continue;
            }
            var l = i%this.majorSpacing == 0 ? this.majorMarkerLength : this.minorMarkerLength;
            var pt1 = this.plotToReal(x, this.minY);
            var pt2 = this.plotToReal(x, this.maxY);
            //console.log(pt.plus(0, l));
            this.renderer.drawLine(pt1, pt2, "lightgray", 1);
            if (i%this.majorSpacing == 0 && x != 0) {
                var dx = 0;
                if (x < 0) {
                    // Try to ignore the negative sign when centering. Pretty much a guess.
                    dx = 13 / 4;
                }
                var pt3 = this.plotToReal(x, 0);
                this.renderer.drawText(Math.round(x), pt3.minus(dx, -13 * 1.5), "middle", 13);
            }
            i++;
        }

        i = 0;
        for (var y = this.minY; y <= this.maxY; y += (this.maxY - this.minY)/this.numMarkers) {
            if (y == 0) {
                continue;
            }

            var l = i%this.majorSpacing == 0 ? this.majorMarkerLength : this.minorMarkerLength;
            var x = Math.max(0, this.minX);
            var pt1 = this.plotToReal(this.minX, y);
            var pt2 = this.plotToReal(this.maxX, y);
            this.renderer.drawLine(pt1, pt2, "lightgray", 1);
            if (i%this.majorSpacing == 0 && y != 0) {
                var pt3 = this.plotToReal(0, y);
                this.renderer.drawText(Math.round(y), pt3.minus(13*3/4, -13/2), "end", 13);
            }
            i++;
        }

        this.renderer.restore();
    },

    addFunction: function(ast) {
        this.functions.push(ast);
        this.updatePlot();
    },

    drawFunction: function(ast) {
        var context = Context.default();
        if (!ast || !ast.arguments) {
            return;
        }

        context.definitions[ast.arguments[0].value] = ast;
        var isFirst = true;

        var drawPoint = (function(path, x, res) {
            if (x !== x || res !== res) {
                console.log("Esc!");
                return;
            }
            var pt = this.plotToReal(x, res);
            if (isFirst) {
                isFirst = !path.moveTo(pt);
            } else {
                path.lineTo(pt);
            }
        }).bind(this)

        this.renderer.beginPath((function(path) {
            for (var x = this.minX; x <= this.maxX; x += (this.maxX-this.minX)/this.resolution) {
                var eval = new ops.FunctionNode(ast.arguments[0], [
                    new ops.NumberNode(x)
                ]);
                var res = AstEvaluator.evaluate(eval, context);
                drawPoint(path, x, res);
            }
        }).bind(this), "red", 2);
    },

}

exports.create = function(aRoot) {
    return new Plot(aRoot);
}

})