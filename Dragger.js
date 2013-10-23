function Dragger(aElt, aEvent) {
  this.node = aElt;

  var r = aElt.getBoundingClientRect();
  this.offsetX = r.left - aEvent.clientX;
  this.offsetY = r.top  - aEvent.clientY;

  window.addEventListener("mousemove", this);
  this.node.addEventListener("mouseup", this);
}

Dragger.prototype = {
  handleEvent: function(aEvent) {
    aEvent.stopPropagation();
    aEvent.preventDefault();
    switch(aEvent.type) {
      case "mousemove" :
        this.moveElt(aEvent.clientX, aEvent.clientY);
        break;
      case "mouseup" :
        this.endDrag();
        break;
    }
  },
  moveElt: function(x, y) {
    this.node.style.left = x + this.offsetX;
    this.node.style.top  = y + this.offsetY;
  },
  endDrag: function() {
    window.removeEventListener("mousemove", this);
    this.node.removeEventListener("mouseup", this);
  }
}