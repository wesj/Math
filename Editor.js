define(function (require, exports, module) {

var SelectionHandler = require("SelectionHandler");
var Plot = require("Plot");

"use strict"

var editorCache = new WeakMap();
var Editor = {
    init: function() {
        window.addEventListener("click", this, false);
        window.addEventListener("keypress", this, false);
        window.addEventListener("keydown", this, false);
    },

    get details() {
        delete this.details;
        return this.details = document.getElementById("details");
    },
    __win: null,
    set _currentWindow(aWindow) {
        if (this.__win) {
            this.__win.setActive(false);
        }

        this.__win = aWindow;
        // this.__win.setActive(true);
        // this.__win.getDetails(this.details);
    },

  get _currentWindow() {
    return this.__win;
  },

  get currentEditor() {
      return editorCache.get(this._currentWindow);
  },

    handleEvent: function(aEvent) {
        switch (aEvent.type) {
            case "keypress" :
                var editor = this.currentEditor;
                if (editor) {
                    editor.handleEvent(aEvent);
                    // this._currentWindow.getDetails(this.details);
                }
                break;

            case "click" :
                var t = aEvent.target;
                while(t && t.nodeName != "math") {
                    t = t.parentNode;
                }

                if (t &&  t.nodeName === "math") {
                    this._currentWindow = t.parentNode.parentNode;
                    SelectionHandler.setCursor(aEvent.target);
                    // this._currentWindow.setCursor(aEvent.target);
                    // console.log(aEvent.target.nodeName);
                }
                break;
            case "keydown":
                var editor = this.currentEditor;
                if (editor && editor.handleEvent(aEvent)) {
                    aEvent.preventDefault();
                }
        }
    },

    addPlot: function (aX, aY) {
        var out = document.getElementById("details");
        var plot = Plot.create(out);
        return plot;
    },

    addEquation: function (aPrevSibling, aX, aY) {
        this._currentWindow = (new Window("equation")).root;

        if (aPrevSibling) {
            if (aPrevSibling.nextSibling) {
                aPrevSibling.parentNode.insertBefore(this._currentWindow, aPrevSibling.nextSibling);
            } else {
                aPrevSibling.parentNode.appendChild(this._currentWindow);
            }
        } else {
            document.getElementById("output").appendChild(this._currentWindow);
        }

        var editor = new MathEditor(this._currentWindow.content);
        editorCache.set(this._currentWindow, editor);
    },

    functionRegEx: /^([a-zA-Z])(\([a-zA-Z,]*\))*$/,

    getFunction: function(aLHS) {
        var eqs = document.getElementsByClassName("equation");
        var functionName = this.functionRegEx.exec(aLHS);
        if (!functionName) {
            return null;
        }

        for(var i = 0; i < eqs.length; i++) {
            var win = eqs[i];
            while(win && !win.classList.contains("window")) {
                win = win.parentNode;
            }
            var edit = win.editor;
            var string = edit.getJSFor(edit.lhs);
            var matchingName = this.functionRegEx.exec(string);
            if (matchingName && functionName[1] == matchingName[1]) {
                return eqs[i];
            }
        }
        return null;
    },

    reportError: function(aError, aNode) {
        var t = aNode;
        while(t && !t.classList.contains("window")) {
            t = t.parentNode;
        }
        if (t) {
          t.errors.textContent = aError;
        }
    }
}

function Window(type, width, height) {
  this.init(type);
  if (width)
    this.root.style.width = width;
  if (height)
    this.root.style.height = height;
  if (this.editor) this.editor.handleResize(this.bcr);
}

Window.prototype = {
  setActive: function(aActive) {
    if (aActive) {
      this.root.classList.add("active");
    } else {
      this.root.classList.remove("active");
      if (this.root.editor) this.root.editor.deselect();
    }
  },
  init: function(aType) {
    this.root = document.createElement("div");
    this.root.classList.add("window");
    this.root.classList.add(aType);
    this.root.addEventListener("mouseup", (function(aEvent) {
      var newBcr = this.root.getBoundingClientRect();
      if (this.bcr.width != newBcr.width || this.bcr.height != newBcr.height) {
        this.bcr = newBcr;
        if (this.editor) this.editor.handleResize(this.bcr);
      }
    }).bind(this), false);
    this.root.setActive = this.setActive.bind(this);
    this.root.setCursor = this.setCursor.bind(this);
    this.root.getDetails = this.getDetails.bind(this);
    this.root.remove = this.remove.bind(this);
    this.root.__window__ = this;

    var self = this;
    this.root.titlebar = document.createElement("div");
    this.root.titlebar.classList.add("titlebar");
    this.root.titlebar.addEventListener("mousedown", function(aEvent) {
      var d = new Dragger(self.root, aEvent);
    });
    this.root.closeButton = this.createButton({label: "", attrs: { class: "closebutton"}},
    function(aEvent) {
      aEvent.stopPropagation();
      self.remove();
    });
    this.root.titlebar.appendChild(this.root.closeButton);
    this.root.appendChild(this.root.titlebar);

    this.root.content = document.createElement("div");
    this.root.content.classList.add("content");
    this.root.appendChild(this.root.content);

    this.root.errors = document.createElement("div");
    this.root.errors.classList.add("errors");
    this.root.appendChild(this.root.errors);

    this.root.secondary = document.createElement("div");
    this.root.secondary.classList.add("secondary");
    this.root.appendChild(this.root.secondary);

    this.bcr = this.root.getBoundingClientRect();
  },
  remove: function() {
    var parent = this.root.parentNode;
    parent.removeChild(this.root);
    if (parent.childNodes.length == 0) {
      Editor.addEquation(null, 0, 0);
    }
  },
  createButton: function(aOpts, aCallback) {
    var button = document.createElement("span");
    if (aOpts.label)
      button.textContent = aOpts.label;
    if (aOpts.attrs) {
      for(var i in aOpts.attrs) {
        button.setAttribute(i, aOpts.attrs[i]);
      }
    }
    button.addEventListener("click", aCallback, false);
    return button;
  },
  setCursor: function(aTarget) {
    if (this.editor) {
      this.editor.setCursor(aTarget, 0);
    }
  },
  getDetails: function(aNode) {
    var ret = "<div>";
    if (this.root.editor) {
      var edit = this.root.editor;
      // xxx - move this into editor?
      var isFunction = false;//edit.looksLikeDefinition();
      var title = "";
      var fun = "";
      // var vars = edit.getVars();
      if (isFunction) {
        fun = edit.toJSString();
        /*
        title = edit.getJSFor(this.root.editor.lhs);
        ret +=   "<h1>" + title + "</h1>";
        ret +=   "<h3>Function</h3>";
        ret +=   "<code>" + fun + "</code>";
        ret +=   "<h3>Plot</h3>";
        ret +=   "<div class='plotdiv' style='width: 200px; height: 200px;'></div>";
        ret +=   "<h3>Variables</h3>";
        ret +=   "<div>" + vars + "</div>"
        */
      } else if (edit.looksLikeDefinition()) {
        // console.log("Get details");
        title = edit.getJSFor(this.root.editor.rootNode);
        // console.log("Get details", title);
        /*
        ret +=   "<h1>" + title + "</h1>";
        ret +=   "<h3>Variable</h3>";
        ret +=   "<code>" + edit.toJSString() + "</code>";
      } else {
        ret +=   "<h3>Code</h3>";
        ret +=   "<code>" + edit.toJSString() + "</code>";
        */
      }
    } else {
      ret +=   "<code>No function available</code>";
    }
    ret += "</div>";
    aNode.innerHTML = ret;
    if (isFunction) {
      var plotdiv = aNode.querySelector(".plotdiv");
      if (plotdiv) {
        var plot = new Plot(plotdiv);
        plot.addFunction({label: title, fun: fun + " " + title + ";", lineColor: "red"});
      } else {
        console.log("no plotdiv?");
      }
    }
  }
}

exports.Editor = Editor;
})