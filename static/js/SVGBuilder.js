/* class SVGElement ***************************************************************************************************************************/

class SVGElement {
  // Base class for all svg elements
  constructor() {
    this.attrList = [
      "id", "style", "class",
      "onclick", "onmousedown", "onmouseup", "onmousemove", "onmouseenter", "onmouseleave"
    ];
  }

  createElement(elementName, attr, nodeValue) {
    this.element = document.createElementNS("http://www.w3.org/2000/svg", elementName);
    this.setAttributes(attr);
    this.setValue(nodeValue);
    return this.element;
  }

  setAttributes(attr, force) {
    if (!attr) attr = {};
    if (!this.attrList) return;
    for (let attrName in attr) {
      if (force || this.attrList.includes(attrName)) {
        let attrValue = attr[attrName];
        if (attrValue === null) {
          this.element.removeAttribute(attrName);
          continue;
        }
        if (attrName == "style" && typeof attrValue == "object") {
          this.setStyle(attrValue, true);
        } else {
          if (typeof(attrValue) === 'function') {
            this.element[attrName] = attrValue;
            continue;
          }
          this.element.setAttribute(attrName, attrValue);
        }
      } else {
        console.log("Warning: unsupported attribute", attrName);
      }
    }
  }

  setStyle(styleObj, wipe) {
    if (!styleObj) {
      if (!wipe) return;
      this.setAttributes({style:null});
    }
    if (wipe) {
      this.setAttributes({style:null});
    }
    for (let stylePty in styleObj) {
      this.element.style[stylePty] = styleObj[stylePty];
    }
  }

  setValue(nodeValue) {
    if (nodeValue !== undefined) this.element.innerHTML = nodeValue;
  }

  init(elementName, attr, attrList, nodeValue) {
    if (!attrList) attrList = [];
    this.attrList.push(...attrList);
    if (elementName === undefined) return;
    this.createElement(elementName, attr, nodeValue);
  }

  insert(container, wipe) {
    if (wipe) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
    container.appendChild(this.element);
  }

  remove() {
    this.element.parentNode.removeChild(this.element);
  }

  clone() {
    if (!this.element) return null;
    var c = new this.constructor();
    c.element = this.element.cloneNode();
    return c;
  }

  wrap(targetNode) {
    this.element = targetNode;
  }

  getTransform(template) {
    //console.log(this.element);
    if (!this.transform) this.transform = new SVGTransform(this.element, template);
    return this.transform;
  }

  translate(x, y, relative) {
    var t = this.getTransform("TRS"); // Tranlate+Rotate+Scale
    //console.log(this);
    //console.log(this.element);
    if (t.template == "TRS") {
      var params = t.list[0].params;
      if (relative) {
        params[0] += x;
        params[1] += y;
      } else {
        params[0] = x;
        params[1] = y;
      }
      t.apply();
    }
  }

  rotate(angle, cx, cy, relative) {
    if (typeof cx == "undefined") cx = 0;
    if (typeof cy == "undefined") cy = 0;
    var t = this.getTransform("TRS");
    if (t.template == "TRS") {
      var params = t.list[1].params;
      if (relative) {
        params[0] += angle;
        params[1] = cx;
        params[2] = cy;
      } else {
        params[0] = angle;
        params[1] = cx;
        params[2] = cy;
      }
      t.apply();
    }
  }

  scale(sx, sy) {
    var t = this.getTransform("TRS");
    if (t.template == "TRS") {
      t.list[2].params = [sx, sy];
      t.apply();
    }
  }

  setClip(clipPathId) {
    if (clipPathId) {
      //this.setAttributes({"clip-path": "url(#" + SVGUtils.htmlEncode(clipPathId) + ")"}, true);
      this.setAttributes({"clip-path": "url(#" + clipPathId + ")"}, true);
    } else {
      this.setAttributes({"clip-path": null}, true);
    }
  }
}

/* class SVGTransform *********************************************************************************************************************/

class SVGTransform {
  constructor(targetNode, template) {
    this.targetNode = targetNode;
    this.list = []; // List of transform definitions
    switch (template) {
      case "TRS":
        this.addDefinition("translate", [0, 0]);
        this.addDefinition("rotate", [0, 0, 0]);
        this.addDefinition("scale", [1, 1]);
      break;
    }
    this.template = template ? template : null;
  }

  addDefinition(fn, params, apply) {
    if (this.template) return;
    if (!["matrix", "translate", "scale", "rotate", "skewX", "skewY"].includes(fn)) return;
    this.list.push({
      fn    : fn,
      params: params
    });
    if (apply) this.apply();
  }

  clear(apply) {
    this.list = [];
    this.template = null;
    if (apply) this.apply();
  }

  apply() {
    var transformList = [];
    this.list.forEach(function(definition) {
      transformList.push(definition.fn + "(" + definition.params.join(" ") + ")");
    });
    this.targetNode.setAttribute("transform", transformList.join(" "));
  }
}

/* class SVGRect **************************************************************************************************************************/

class SVGRect extends SVGElement {
  constructor(attr) {
    super();
    this.init("rect", attr, ["x", "y", "width", "height", "rx", "ry"]);
  }
}

/* class SVGCircle ************************************************************************************************************************/

class SVGCircle extends SVGElement {
  constructor(attr) {
    super();
    this.init("circle", attr, ["cx", "cy", "r"]);
  }
}

/* class SVGEllipse ***********************************************************************************************************************/

class SVGEllipse extends SVGElement {
  constructor(attr) {
    super();
    this.init("ellipse", attr, ["cx", "cy", "rx", "ry"]);
  }
}

/* class SVGLine **************************************************************************************************************************/

class SVGLine extends SVGElement {
  constructor(attr) {
    super();
    this.init("line", attr, ["x1", "y1", "x2", "y2"]);
  }
}

/* class SVGPolyline **********************************************************************************************************************/

class SVGPolyline extends SVGElement {
  constructor(attr, points) {
    super();
    this.init("polyline", attr);
    this.points = (typeof points == "undefined") ? [] : points;
    this.update();
  }

  addPoint(pointData) {
    // pointData: an object with x and y properties
    this.points.push(pointData);
  }

  update() {
    var pointsAttr = this.points.map((pointData) => {
      var x = ("x" in pointData) ? pointData.x : 0;
      var y = ("y" in pointData) ? pointData.y : 0;
      return x + " " + y;
    }).join(" ");
    this.element.setAttribute("points", pointsAttr);
  }

  clone() {
    var c = super.clone();
    c.points = this.points.slice();
    return c;
  }

  wrap(targetNode) {
    super.wrap(targetNode);
    // TODO: parse the "points" attribute
  }
}

/* class SVGPolygon ***********************************************************************************************************************/

class SVGPolygon extends SVGPolyline {
  constructor(attr, points) {
    super();
    this.init("polygon", attr);
    this.points = (typeof points == "undefined") ? [] : points;
    this.update();
  }
}

/* class SVGPath **************************************************************************************************************************/

// Reference: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths

class SVGPath extends SVGElement  {
  constructor(attr, points) {
    super();
    this.init("path", attr);
    this.points = (typeof points == "undefined") ? [] : points;
    this.update();
  }

  addPoint(pointData) {
    // pointData: an object with properties
    var point;
    if (pointData.cmd == "M") {
      // Move to, absolute coordinates. Parameters: x, y
      point = {
        cmd: "M",
        x  : ("x" in pointData) ? pointData.x : 0,
        y  : ("y" in pointData) ? pointData.y : 0
      }
    } else if (pointData.cmd == "m") {
      // Move to, relative coordinates. Parameters: dx, dy
      point = {
        cmd: "m",
        dx : ("dx" in pointData) ? pointData.dx : 0,
        dy : ("dy" in pointData) ? pointData.dy : 0
      }
    } else if (pointData.cmd == "L") {
      // Line to, absolute coordinates. Parameters: x, y
      point = {
        cmd: "L",
        x  : ("x" in pointData) ? pointData.x : 0,
        y  : ("y" in pointData) ? pointData.y : 0
      }
    } else if (pointData.cmd == "l") {
      // Line to, relative coordinates. Parameters: dx, dy
      point = {
        cmd: "l",
        dx : ("dx" in pointData) ? pointData.dx : 0,
        dy : ("dy" in pointData) ? pointData.dy : 0
      }
    } else if (pointData.cmd == "H") {
      // Horizontal line to, absolute coordinates. Parameters: x
      point = {
        cmd: "H",
        x  : ("x" in pointData) ? pointData.x : 0
      }
    } else if (pointData.cmd == "h") {
      // Horizontal line to, relative coordinates. Parameters: dx
      point = {
        cmd: "h",
        dx : ("dx" in pointData) ? pointData.dx : 0
      }
    } else if (pointData.cmd == "V") {
      // Vertical line to, absolute coordinates. Parameters: y
      point = {
        cmd: "V",
        y  : ("y" in pointData) ? pointData.y : 0
      }
    } else if (pointData.cmd == "v") {
      // Vertical line to, relative coordinates. Parameters: dy
      point = {
        cmd: "v",
        dy : ("dy" in pointData) ? pointData.dy : 0
      }
    } else if (pointData.cmd == "C") {
      // Cubic bezier curve to, absolute coordinates. Parameters: x1, y1, x2, y2, x, y
      point = {
        cmd: "C",
        x1 : ("x1" in pointData) ? pointData.x1 : 0,
        y1 : ("y1" in pointData) ? pointData.y1 : 0,
        x2 : ("x2" in pointData) ? pointData.x2 : 0,
        y2 : ("y2" in pointData) ? pointData.y2 : 0,
        x  : ("x"  in pointData) ? pointData.x  : 0,
        y  : ("y"  in pointData) ? pointData.y  : 0
      }
    } else if (pointData.cmd == "c") {
      // Cubic bezier curve to, relative coordinates. Parameters: dx1, dy1, dx2, dy2, dx, dy
      point = {
        cmd: "c",
        dx1: ("dx1" in pointData) ? pointData.dx1 : 0,
        dy1: ("dy1" in pointData) ? pointData.dy1 : 0,
        dx2: ("dx2" in pointData) ? pointData.dx2 : 0,
        dy2: ("dy2" in pointData) ? pointData.dy2 : 0,
        dx : ("dx"  in pointData) ? pointData.dx  : 0,
        dy : ("dy"  in pointData) ? pointData.dy  : 0
      }
    } else if (pointData.cmd == "S") {
      // Smooth cubic bezier curve to, absolute coordinates. Parameters: x2, y2, x, y
      point = {
        cmd: "S",
        x2 : ("x2" in pointData) ? pointData.x2 : 0,
        y2 : ("y2" in pointData) ? pointData.y2 : 0,
        x  : ("x"  in pointData) ? pointData.x  : 0,
        y  : ("y"  in pointData) ? pointData.y  : 0
      }
    } else if (pointData.cmd == "s") {
      // Smooth cubic bezier curve to, relative coordinates. Parameters: dx2, dy2, dx, dy
      point = {
        cmd: "s",
        dx2: ("dx2" in pointData) ? pointData.dx2 : 0,
        dy2: ("dy2" in pointData) ? pointData.dy2 : 0,
        dx : ("dx"  in pointData) ? pointData.dx  : 0,
        dy : ("dy"  in pointData) ? pointData.dy  : 0
      }
    } else if (pointData.cmd == "Q") {
      // Quadratic bezier curve to, absolute coordinates. Parameters: x1, y1, x, y
      point = {
        cmd: "Q",
        x1 : ("x1" in pointData) ? pointData.x1 : 0,
        y1 : ("y1" in pointData) ? pointData.y1 : 0,
        x  : ("x"  in pointData) ? pointData.x  : 0,
        y  : ("y"  in pointData) ? pointData.y  : 0
      }
    } else if (pointData.cmd == "q") {
      // Quadratic bezier curve to, relative coordinates. Parameters: dx1, dy1, dx, dy
      point = {
        cmd: "q",
        dx1: ("dx1" in pointData) ? pointData.dx1 : 0,
        dy1: ("dy1" in pointData) ? pointData.dy1 : 0,
        dx : ("dx"  in pointData) ? pointData.dx  : 0,
        dy : ("dy"  in pointData) ? pointData.dy  : 0
      }
    } else if (pointData.cmd == "T") {
      // Smooth quadratic bezier curve to, absolute coordinates. Parameters: x, y
      point = {
        cmd: "T",
        x  : ("x"  in pointData) ? pointData.x  : 0,
        y  : ("y"  in pointData) ? pointData.y  : 0,
      }
    } else if (pointData.cmd == "t") {
      // Smooth quadratic bezier curve to, relative coordinates. Parameters: dx, dy
      point = {
        cmd: "t",
        dx : ("dx"  in pointData) ? pointData.dx  : 0,
        dy : ("dy"  in pointData) ? pointData.dy  : 0
      }
    } else if (pointData.cmd == "A") {
      // Arc to, absolute coordinates. Parameters: rx, ry, angle, large, sweep, x, y
      point = {
        cmd: "A",
        rx   : ("rx"    in pointData) ? pointData.rx    : 0, // ellipse x-radius
        ry   : ("ry"    in pointData) ? pointData.ry    : 0, // ellipse y-radius
        angle: ("angle" in pointData) ? pointData.angle : 0, // x-axis rotation angle
        large: ("large" in pointData) ? pointData.large : 0, // large-arc-flag: 0 for <180 degrees arc, 1 for >180 degrees arc.
        sweep: ("sweep" in pointData) ? pointData.sweep : 0, // sweep-flag: 0 for left-bending arc, 1 for right-bending arc
        x    : ("x"     in pointData) ? pointData.x     : 0, // end-point x
        y    : ("y"     in pointData) ? pointData.y     : 0  // end-point y
      }
    } else if (pointData.cmd == "a") {
      // Arc to, relative coordinates. Parameters: rx, ry, angle, large, sweep, dx, dy
      point = {
        cmd: "a",
        rx   : ("rx"    in pointData) ? pointData.rx    : 0, // ellipse x-radius
        ry   : ("ry"    in pointData) ? pointData.ry    : 0, // ellipse y-radius
        angle: ("angle" in pointData) ? pointData.angle : 0, // x-axis rotation angle
        large: ("large" in pointData) ? pointData.large : 0, // large-arc-flag: 0 for <180 degrees arc, 1 for >180 degrees arc.
        sweep: ("sweep" in pointData) ? pointData.sweep : 0, // sweep-flag: 0 for left-bending arc, 1 for right-bending arc
        dx   : ("dx"    in pointData) ? pointData.dx    : 0, // end-point relative dx
        dy   : ("dy"    in pointData) ? pointData.dy    : 0  // end-point relative dy
      }

    } else if (pointData.cmd == "Z" || pointData.cmd == "z") {
      // Close path. Parameters: none
      point = {
        cmd: "Z"
      }
    }
    this.points.push(point);
  }

  update() {
    var pointsAttr = this.points.map((pointData) => {
      var output = ""
      if (pointData.cmd == "M") {
        output = [pointData.cmd, pointData.x, pointData.y];
      } else if (pointData.cmd == "m") {
        output = [pointData.cmd, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "L") {
        output = [pointData.cmd, pointData.x, pointData.y];
      } else if (pointData.cmd == "l") {
        output = [pointData.cmd, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "H") {
        output = [pointData.cmd, pointData.x];
      } else if (pointData.cmd == "h") {
        output = [pointData.cmd, pointData.dx];
      } else if (pointData.cmd == "V") {
        output = [pointData.cmd, pointData.y];
      } else if (pointData.cmd == "v") {
        output = [pointData.cmd, pointData.dy];
      } else if (pointData.cmd == "C") {
        output = [pointData.cmd, pointData.x1, pointData.y1, pointData.x2, pointData.y2, pointData.x, pointData.y];
      } else if (pointData.cmd == "c") {
        output = [pointData.cmd, pointData.dx1, pointData.dy1, pointData.dx2, pointData.dy2, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "S") {
        output = [pointData.cmd, pointData.x2, pointData.y2, pointData.x, pointData.y];
      } else if (pointData.cmd == "s") {
        output = [pointData.cmd, pointData.dx2, pointData.dy2, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "Q") {
        output = [pointData.cmd, pointData.x1, pointData.y1, pointData.x, pointData.y];
      } else if (pointData.cmd == "q") {
        output = [pointData.cmd, pointData.dx1, pointData.dy1, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "T") {
        output = [pointData.cmd, pointData.x, pointData.y];
      } else if (pointData.cmd == "t") {
        output = [pointData.cmd, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "A") {
        output = [pointData.cmd, pointData.rx, pointData.ry, pointData.angle, pointData.large ? 1 : 0, , pointData.sweep ? 1 : 0, pointData.x, pointData.y];
      } else if (pointData.cmd == "a") {
        output = [pointData.cmd, pointData.rx, pointData.ry, pointData.angle, pointData.large ? 1 : 0, , pointData.sweep ? 1 : 0, pointData.dx, pointData.dy];
      } else if (pointData.cmd == "Z" || pointData.cmd == "z") {
        output = [pointData.cmd];
      }
      return output.join(" ");
    }).join(" ");
    this.element.setAttribute("d", pointsAttr);
  }

  clone() {
    var c = super.clone();
    c.points = this.points.slice();
    return c;
  }

  wrap(targetNode) {
    super.wrap(targetNode);
    // TODO: parse the "d" attribute
  }
}

/* class SVGText **************************************************************************************************************************/

class SVGText extends SVGElement {
  constructor(attr, value) {
    super();
    this.init("text", attr, ["x", "y"], value);
  }
}

/* class SVGUse **************************************************************************************************************************/

class SVGUse extends SVGElement {
  constructor(attr, href) {
    super();
    this.init("use", attr, ["x", "y"]);
    this.setHref(href);
  }

  setHref(href) {
    this.element.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#" + href);
  }
}

/* class SVGFile **************************************************************************************************************************/

class SVGFile extends SVGElement {
  constructor(attr, svgURL) {
    super();
    this.attr = attr;
    this.svgURL = svgURL;
    this.loaded = false;
    // Note: can't call the init() method because the element does not exist yet! It will be created only when the load() method results in successfully loaded svg document
  }

  load(onLoaded, onError) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4 && xhr.status >= 400) {
        // File not found
        if (typeof onError === "function") {
          onError.call(self, xhr);
        }
      }
      if (xhr.readyState == 4 && xhr.status == 200) {
        self.element = xhr.responseXML.getElementsByTagName('svg')[0];
        self.setAttributes(self.attr);
        self.loaded = true;
        if (typeof onLoaded === "function") {
          onLoaded.call(self);
        }
      }
    }
    xhr.open('GET', this.svgURL, true);
    xhr.send(null);
  }

  getElement(id) {
    // Find an element with corresponding id attribute and return a corresponding SVGElement instance
    if (!this.element) return null;

    var node = this.element.querySelector('#' + id);
    if (!node) return null;

    var nodeName = node.nodeName.toLowerCase();
    var svgObject;
    if (nodeName == "rect") {
      svgObject = new SVGRect();
    } else if (nodeName == "circle") {
      svgObject = new SVGCircle();
    } else if (nodeName == "ellipse") {
      svgObject = new SVGEllipse();
    } else if (nodeName == "line") {
      svgObject = new SVGLine();
    } else if (nodeName == "polyline") {
      svgObject = new SVGPolyline();
    } else if (nodeName == "polygon") {
      svgObject = new SVGPolygon();
    } else if (nodeName == "path") {
      svgObject = new SVGPath();
    } else if (nodeName == "text") {
      svgObject = new SVGText();
    } else if (nodeName == "g") {
      svgObject = new SVGGroup();
    } else if (nodeName == "defs") {
      svgObject = new SVGDefs();
    } else if (nodeName == "clipPath") {
      svgObject = new SVGClipPath();
    } else {
      svgObject = new SVGElement();
    }
    svgObject.wrap(node);
    return svgObject;
  }
}

/* class SVGContainer *************************************************************************************************************************/

class SVGContainer extends SVGElement {
  constructor() {
    // Superclass constructor
    super();
  }

  addRect(attr) {
    // Add new rect element
    console.log("Adding rect element, attr=", attr);
    var svgObject = new SVGRect(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addCircle(attr) {
    // Add new circle element
    console.log("Adding circle element, attr=", attr);
    var svgObject = new SVGCircle(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addEllipse(attr) {
    // Add new ellipse element
    console.log("Adding ellipse element, attr=", attr);
    var svgObject = new SVGEllipse(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addLine(attr) {
    // Add new line element
    console.log("Adding line element, attr=", attr);
    var svgObject = new SVGLine(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addPolyline(attr, points) {
    // Add new plolyline element
    console.log("Adding polyline element, attr=", attr, " points=", points);
    var svgObject = new SVGPolyline(attr, points);
    svgObject.insert(this.element);
    return svgObject;
  }

  addPolygon(attr, points) {
    // Add new plolygon element
    console.log("Adding polygon element, attr=", attr, " points=", points);
    var svgObject = new SVGPolygon(attr, points);
    svgObject.insert(this.element);
    return svgObject;
  }

  addPath(attr, points) {
    // Add new plolygon element
    console.log("Adding path element, attr=", attr, " points=", points);
    var svgObject = new SVGPath(attr, points);
    svgObject.insert(this.element);
    return svgObject;
  }

  addText(attr, value) {
    var svgObject = new SVGText(attr, value);
    svgObject.insert(this.element);
    return svgObject;
  }

  addGroup(attr) {
    var svgObject = new SVGGroup(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addDefs(attr) {
    var svgObject = new SVGDefs(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addUse(attr, href) {
    var svgObject = new SVGUse(attr, href);
    svgObject.insert(this.element);
    return svgObject;
  }

  addClipPath(attr) {
    var svgObject = new SVGClipPath(attr);
    svgObject.insert(this.element);
    return svgObject;
  }

  addSVGFile(attr, svgURL, onLoaded, onError) {
    var svgObject = new SVGFile(attr, svgURL);
    var container = this.element;
    svgObject.load(function() {
      this.insert(container);
      if (typeof onLoaded !== "function") return;
      onLoaded.call(this);
    }, function(xhr) {
      if (typeof onError !== "function") return;
      onError.call(this, xhr);
    });
    return svgObject;
  }
}

/* class SVGBuilder ***********************************************************************************************************************/

class SVGBuilder extends SVGContainer {
  constructor(attr) {
    super();
    this.init("svg", attr, ["viewBox"]);
  }

  setViewBox(params) {
    /*
    Set the viewbox, aspect ratio and alignment properties
    params: object {
      x
      y
      width
      height
      xAlign: min | mid | max
      yAlign: min | mid | max
      fit: meet (default) | slice | stretch
    }
    if some parameters are missing, read them from the current viewBox attribute, if available
    if params is null or missing - the viewbox and preserveAspectRatio parameters are removed
    https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
    https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio
    */
    if (!params || typeof params != "object") {
      this.setAttributes({viewBox:null, preserveAspectRatio: null}, true);
      return;
    }
    // Get the current properties by reading and parsing the element's viewBox and preserveAspectRatio attributes
    var currentViewBox = this.element.getAttribute("viewBox");
    var currentPreserveAspectRatio = this.element.getAttribute("preserveAspectRatio");
    //console.log("currentViewBox=", currentViewBox, "; currentPreserveAspectRatio=", currentPreserveAspectRatio);
    var parseViewBox = /^(-?\d*\.?\d*) (-?\d*\.?\d*) (\d*\.?\d*) (\d*\.?\d*)$/.exec(currentViewBox);
    if (parseViewBox) {
      if (params.x === undefined) params.x = parseViewBox[1];
      if (params.y === undefined) params.y = parseViewBox[2];
      if (params.width === undefined) params.width = parseViewBox[3];
      if (params.height === undefined) params.height = parseViewBox[4];
    }
    var parsePreserveAspectRatio = /^(none|x(Min|Mid|Max)Y(Min|Mid|Max))( (meet|slice))?$/.exec(currentPreserveAspectRatio);
    if (parsePreserveAspectRatio) {
      if (parsePreserveAspectRatio[1] == "none") {
        if (params.fit === undefined) params.fit = "stretch";
      } else {
        if (params.xAlign === undefined) params.xAlign = parsePreserveAspectRatio[2].toLowerCase();
        if (params.yAlign === undefined) params.yAlign = parsePreserveAspectRatio[3].toLowerCase();
        if (params.fit === undefined && parsePreserveAspectRatio[4]) params.fit = parsePreserveAspectRatio[5].toLowerCase() == "slice" ? "slice" : "meet";
      }
    }
    // Fill in the defaults for the missing parameters
    if (params.x === undefined) params.x = 0;
    if (params.y === undefined) params.y = 0;
    if (params.width === undefined) params.width = this.element.clientWidth;
    if (params.height === undefined) params.height = this.element.clientHeight;
    if (params.xAlign === undefined) params.xAlign = "mid";
    if (params.yAlign === undefined) params.yAlign = "mid";
    if (params.fit === undefined) params.fit = "meet";
    // Set the new attribute values
    var newViewBox = `${params.x} ${params.y} ${params.width} ${params.height}`;
    var newPreserveAspectRatio = params.fit == "stretch" ? "none" : "xM" + params.xAlign.slice(1) + "YM" + params.yAlign.slice(1) + " " + params.fit;
    //console.log("viewBox =", newViewBox, "; preserveAspectRatio =", newPreserveAspectRatio)
    this.setAttributes({viewBox:newViewBox, preserveAspectRatio:newPreserveAspectRatio}, true);
  }

  draggable(handle, callback, body) {
    // handle   - the object that captures the mousedown event
    // callback - optional function(state, body, dragInfo) called when the dragging takes place
    // body     - optional object that is dragged around. By default, it's the handle. But it can be another element, for example a group object that contains the handle object

    if (!this.draggableStore) {
      this.draggableStore = {
        selected: null, // The object currently being dragged
        callback: null, // The callback function to be called when dragging takes place
        xStart  : 0, // Start point x, at screen coordinates
        yStart  : 0, // Start point y, at screen coordinates
        dxScreen: 0, // X distance dragged, at screen coordinates
        dyScreen: 0, // Y distance dragged, at screen coordinates
        xLocal  : 0, // Pointer x, at local coordinates
        yLocal  : 0, // Pointer y, at local coordinates
        dxLocal : 0, // Horizontal distance dragged, at local coordinates
        dyLocal : 0, // Y distance dragged, at local coordinates
        xTOffset: 0, // X translation, at drag start
        yTOffset: 0, // Y translation, at drag start
      }
    }

    var startDrag = (evt) => {
      var ds = this.draggableStore;
      evt.preventDefault();

      var mousePos = {
        x: evt.clientX,
        y: evt.clientY
      };
      ds.selected = body ? body : handle;
      ds.xStart = mousePos.x;
      ds.yStart = mousePos.y;

      // Retrieve the current translation
      var t = ds.selected.getTransform("TRS");
      if (t.template != "TRS") {
        ds.selected = null;
        throw new Error("This SVGBuilder object has custom transform definitions. Drag is not enabled.");
      }
      var txParams = t.list[0].params;
      ds.xTOffset = txParams[0];
      ds.yTOffset = txParams[1];

      var xform = ds.selected.element.parentNode.getScreenCTM().inverse();
      ds.xLocal = xform.a * mousePos.x + xform.c * mousePos.y + xform.e;
      ds.yLocal = xform.b * mousePos.x + xform.d * mousePos.y + xform.f;

      ds.callback = callback ? callback : null;
      if (ds.callback) {
        var dragInfo = {
          xScreen : mousePos.x,
          yScreen : mousePos.y,
          dxScreen: 0,
          dyScreen: 0,
          xLocal  : ds.xLocal,
          yLocal  : ds.yLocal,
          dxLocal : 0,
          dyLocal : 0,
          xObject : ds.xTOffset,
          yObject : ds.yTOffset
        }
        ds.callback("start", ds.selected, dragInfo);
      }
    }

    var drag = (evt) => {
      var ds = this.draggableStore;
      if (ds.selected) {
        evt.preventDefault();
        // Estimate the drag distance, in the screen coordinate space
        var mousePos = {
          x: evt.clientX,
          y: evt.clientY
        };
        ds.dxScreen = mousePos.x - ds.xStart;
        ds.dyScreen = mousePos.y - ds.yStart;
        // Calculate the pointer coors in the draggable object coordinate space
        var xform = ds.selected.element.parentNode.getScreenCTM().inverse();
        ds.xLocal = xform.a * mousePos.x + xform.c * mousePos.y + xform.e;
        ds.yLocal = xform.b * mousePos.x + xform.d * mousePos.y + xform.f;
        // Calculate the drag vector in the draggable object coordinate space
        ds.dxLocal = xform.a * ds.dxScreen + xform.c * ds.dyScreen;
        ds.dyLocal = xform.b * ds.dxScreen + xform.d * ds.dyScreen;
        var localPos = {
          x: ds.xTOffset + ds.dxLocal,
          y: ds.yTOffset + ds.dyLocal
        }
        // Call the optional callback, it has power to change (constrain) the local translation
        var dragInfo = {
          xScreen : mousePos.x,
          yScreen : mousePos.y,
          dxScreen: ds.dxScreen,
          dyScreen: ds.dyScreen,
          xLocal  : ds.xLocal,
          yLocal  : ds.yLocal,
          dxLocal : ds.dxLocal,
          dyLocal : ds.dyLocal,
          xObject : ds.xTOffset + ds.dxLocal,
          yObject : ds.yTOffset + ds.dyLocal
        }
        if (ds.callback) {
          ds.callback("move", ds.selected, dragInfo);
        }
        // Move the draggable object
        ds.selected.translate(dragInfo.xObject, dragInfo.yObject);
      }
    }
    var endDrag = (evt) => {
      var ds = this.draggableStore;
      if (ds.selected) {
        if (ds.callback) {
          var dragInfo = {
            xScreen : evt.clientX,
            yScreen : evt.clientY,
            dxScreen: ds.dxScreen,
            dyScreen: ds.dyScreen,
            xLocal  : ds.xLocal,
            yLocal  : ds.yLocal,
            dxLocal : ds.dxLocal,
            dyLocal : ds.dyLocal,
            xObject : ds.xTOffset + ds.dxLocal,
            yObject : ds.yTOffset + ds.dyLocal
          }
          ds.callback("end", ds.selected, dragInfo);
        }
        // Clear the selected draggable
        ds.selected = null;
        ds.callback = null;
      }
    }

    if (!this.element.getAttribute("draggable-init")) {
      // This is the first time draggable() is called: register the onmousemove, onmouseup and onmouseleave events on the main svg element
      this.element.setAttribute("draggable-init", 1);
      this.element.addEventListener("mousemove", drag);
      this.element.addEventListener("mouseleave", endDrag);
      this.element.addEventListener("mouseup", endDrag);
    }

    handle.element.addEventListener("mousedown", startDrag);
  }
}

/* class SVGGroup *************************************************************************************************************************/

class SVGGroup extends SVGContainer {
  constructor(attr) {
    super();
    this.init("g", attr);
  }
}

/* class SVGClipPath *************************************************************************************************************************/

class SVGClipPath extends SVGContainer {
  constructor(attr) {
    super();
    this.init("clipPath", attr);
  }
}

/* class SVGDefs *************************************************************************************************************************/

class SVGDefs extends SVGContainer {
  constructor(attr) {
    super();
    this.init("defs", attr);
  }
}

/* SVGSprite and SVGSpriteInstance *************************************************************************************************************************/

class SVGSprite {
  constructor(svg, spriteWidth, spriteHeight) {
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
    this.id = Math.floor(Math.random() * 1000000);

    var defs = svg.element.ownerDocument.getElementById("defs-" + this.id);
    if (defs) {
      this.defs = new SVGDefs();
      this.defs.wrap(defs);
    } else {
      this.defs = svg.addDefs({id:"defs-" + this.id});
    }

    var clip = this.defs.addClipPath({id:"clip-" + this.id});
    clip.addRect({x:0, y:0, width:this.spriteWidth, height:this.spriteHeight});

    this.loaded = false;
  }

  loadSpritesheet(svgFileURL, cols, frames) {
    this.cols = cols;
    this.frames = frames;
    if (this.spriteSheet) this.spriteSheet.remove();
    this.spriteSheet = this.defs.addGroup({id:"spriteSheet-" + this.id});
    this.spriteSheet.addSVGFile({}, svgFileURL, () => this.loaded = true);
  }

  create(container, x, y) {
    var instance = new SVGSpriteInstance(container, this);
    instance.translate(x, y);
    return instance;
  }
}

class SVGSpriteInstance extends SVGGroup {

  constructor(container, source) {
    super();
    this.source = source;
    this.insert(container.element);
    this.setClip("clip-" + source.id);
    this.spriteSheet = this.addUse({x:0, y:0}, "spriteSheet-" + source.id);
    this.frame = 0;
    this.framerate = 1;
    this.looping = false;
  }

  setFrame(frame) {
    frame = frame % this.source.frames;
    this.frame = frame;
    var row = Math.floor(frame / this.source.cols);
    var col = frame % this.source.cols;
    this.spriteSheet.translate(-this.source.spriteWidth * col, -this.source.spriteHeight * row);
  }

  nextFrame() {
    this.setFrame(++this.frame);
  }

  loop(framerate) {
    if (!framerate) framerate = 1;
    this.framerate = framerate;
    var looper = () => {
      if (!document.getElementById("clip-" + this.source.id)) return;
      if (!this.looping) return;
      this.nextFrame();
      window.setTimeout(looper, 1000 / this.framerate);
    }
    this.looping = true;
    looper();
  }

  stop() {
    this.looping = false;
  }
}
