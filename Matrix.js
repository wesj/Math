define(function (require, exports, module) {

if (window.__Matrix__) {
    for (var i in window.__Matrix__) {
        exports[i] = window.__Matrix__[i];
    }
    return;
}

var tests = require('tests');
var precision = 1e-15;

function Matrix(rows, vals) {
    var vals = vals;

    this.rows = rows;
    this.cols = vals.length / this.rows;

    var cache = {};
    function getCache(key, foo, self) {
      var res = cache[key];
      if (res) {
        return res;
      }
       
      res = foo.call(self);
      cache[key] = res;
      return res;
    }

    function setVal(i, j, x) {
        vals[i * this.cols + j] = x;
    }

    function setRow(a, values) {
        for (var i = 0; i < this.cols; i++) {
            setVal(a, i, values[i]);
        }
    }

    function addRows(a, b, scale) {
        var res = [];
        for (var i = 0; i < this.cols; i++) {
            res.push(this.value(a, i) + this.value(b, i) * scale)
        }
        return res;
    }

    function scaleRow(a, scale) {
        var res = [];
        for (var i = 0; i < this.cols; i++) {
            res.push(this.value(a, i) * scale)
        }
        return res;
    }

    function filter(row, col) {
        var key = "filter" + row + "," + col;
        return getCache(key, function() {
            var res = [];
            for (var i = 0; i < this.rows; i++) {
                for (var j = 0; j < this.cols; j++) {
                    if (i != row && j != col) {
                        res.push(this.value(i, j));
                    }
                }
            }
            return new Matrix(this.rows - 1, res);
        }, this);
    }

    function subMatrix(start, end) {
        var key = "sub" + start.join(",") + "," + end.join(",");
        return getCache(key, function() {
            var rows = end[0] - start[0];
            var res = [];
            for (var i = start[0]; i < end[0]; i++) {
                for (var j = start[1]; j < end[1]; j++) {
                    res.push(this.value(i, j))
                }
            }
            return new Matrix(rows, res);
        }, this);
    }

    function matrixMultiply(val) {
      if (val.rows != this.cols) {
        throw "Matricies are wrong size to multiply";
      }

      var res = new Array(this.rows * val.cols);
      for (var i = 0; i < val.cols; i++) {
        for (var j = 0; j < this.rows; j++) {

          var newVal = 0;
          for (var k = 0; k < this.cols; k++) {
            var me = this.value(j, k);
            var them = val.value(k, i);
            newVal += me * them;
          }

          if (Math.abs(newVal) < precision) {
            res[j * this.rows + i] = 0;
          } else {
            res[j * this.rows + i] = newVal;
          }
        }
      }
      return new Matrix(this.rows, res);
    }

    this.adjoint = function() {
      return getCache("adjoint", function() {
        var newVals = new Array(this.rows * this.cols);
        for (var i = 0; i < this.rows; i++) {
          for (var j = 0; j < this.cols; j++) {
            newVals[j * this.cols + i] = this.value(i, j);
          }
        }
        return new Matrix(this.cols, newVals);
      }, this);
    }
    this.transpose = this.adjoint;

    function scale(scale) {
      return map.call(this, function(val, i) {
        return scale * val;
      })
    }

    function addConstant(c) {
      return map.call(this, function(val, i) {
        var row = Math.floor(i / this.cols);
        var col = i % this.cols;
        if (row == col) {
          return val + c;
        }
        return val;
      });
    }

    function addMatrix(c) {
      if (this.rows != c.rows || this.cols != c.cols) {
        throw "Matrix dimensions must match to add them";
      }

      return map.call(this, function(val, i) {
        var row = Math.floor(i / this.cols);
        var col = i % this.cols;
        return val + c.value(row, col);
      });
    }

    this.minors = function() {
      return getCache("minors", function() {
        var res = [];
        for (var i = 0; i < this.rows; i++) {
          for (var j = 0; j < this.cols; j++) {
            var filtered = filter.call(this, i, j)
            res.push(filtered.determinant());
          }
        }
        return new Matrix(this.rows, res);
      }, this);
    }

    function map(foo, context) {
      context = context || this;
      var newVals = [];
      for (var i = 0; i < vals.length; i++) {
        var newVal = foo.call(context, vals[i], i);
        if (Math.abs(newVal) < precision) {
          newVals.push(0);
        } else {
          newVals.push(newVal);
        }
      }
      return new Matrix(this.rows, newVals);
    }

    this.cofactors = function() {
      return getCache("cofactors", function() {
        return map.call(this, function(val, i) {
          var scale = 1;

          var row = Math.floor(i / this.cols);
          if (row % 2 == 1) {
            scale = (i - row * this.cols) % 2 == 0 ? -1 : 1;
          } else {
            scale = (i - row * this.cols) % 2 == 0 ? 1 : -1;
          }

          return scale * val;
        });
      }, this);
    }

    this.value = function value(i, j) {
        return vals[i * this.cols + j];
    }

    this.invert = function() {
        return getCache("invert", function() {
            var det = this.determinant();
            if (det == 0) {
              throw "Matrix has no inverse";
            }

            // TODO: We can probably do this in one step/inplace
            // and skip a lot of copies.
            var inv = this.minors();
            inv = inv.cofactors();
            inv = inv.adjoint();
            inv = inv.multiply(1/det);
            return inv;
        }, this);
    }

    this.toString = function() {
        return getCache("string", function() {
            var ret = "";
            for (var i = 0; i < this.rows; i++) {
                for (var j = 0; j < this.cols; j++) {
                    ret += this.value(i, j) + ", ";
                }
                // ret += "\n"
            }
            return ret;
        }, this);
    }

    this.multiply = function(val) {
        if (!isNaN(val)) {
            // TODO: Handle MSet
            return scale.call(this, val);
        } else if (val instanceof Matrix) {
            return matrixMultiply.call(this, val);
        } else {
            // 
        }
    }
    this.times = this.multiply;

    this.determinant = function() {
      return getCache("determinant", function() {
        if (this.rows == 2 && this.cols == 2) {
          return vals[0] * vals[3] - vals[1] * vals[2];
        }

        var res = 0;
        for (var i = 0; i < this.cols; i++) {
          var filtered = filter.call(this, 0, i)
          if (i %2 == 0) {
            res += this.value(0, i) * filtered.determinant();
          } else {
            res -= this.value(0, i) * filtered.determinant();
          }
        }

        return res;
      }, this)
    }

    this.log = function() {
        var self = this;
        var map = [];
        for (var i = 0; i < this.rows; i++) {
            var start = i * this.cols
            map.push(vals.slice(start, start + this.cols));
        }
        console.table(map);
    }

    this.add = function(val) {
      if (!isNaN(val)) {
        return addConstant.call(this, val);
      } else if (val instanceof Matrix) {
        return addMatrix.call(this, val);
      } else {
        // ?
      }
    }

    this.subtract = function(val) {
      if (!isNaN(val)) {
        return addConstant.call(this, -val);
      } else if (val instanceof Matrix) {
        return addMatrix.call(this, val.multiply(-1));
      } else {
        // ?
      }
    }

    this.equals = function(m) {
      if (!this.rows == m.rows && this.cols == m.cols) {
        return false;
      }
      
      for (var i = 0; i < vals.length; i++) {
        var row = Math.floor(i / m.cols);
        var col = i % m.cols;
        if (Math.abs(vals[i] - m.value(row, col)) > precision) {
          return false;
        }
      }
      
      return true;
    }

    this.identity = function(size) {
      var res = [];
      for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
          if (i == j) res.push(1);
          else res.push(0);
        }
      }
      return new Matrix(size, res);
    }
}

if (tests) {
    tests.tests.push({ name: "Matrix tests", run: function() {
        var m = new Matrix(3, [3, 0, 2, 2, 0, -2, 0, 1, 1]);
        tests.is(m, m, "Equals works");
        tests.is(m.minors(), new Matrix(3, [2, 2, 2, -2, 3, 3, 0, -10, 0]), "Minors");
        tests.is(m.cofactors(), new Matrix(3, [3, 0, 2, -2, 0, 2, 0, -1, 1]), "Cofactors");
        tests.is(m.adjoint(), new Matrix(3, [3, 2, 0, 0, 0, 1, 2, -2, 1]), "Adjoint");
        tests.is(m.transpose(), new Matrix(3, [3, 2, 0, 0, 0, 1, 2, -2, 1]), "Transpose");
        tests.is(m.determinant(), 10, "Detrminant");
        tests.is(m.multiply(2), new Matrix(3, [6, 0, 4, 4, 0, -4, 0, 2, 2]), "Multiply scalar");
        // tests.is(m.scale(2), new Matrix(3, [6, 0, 4, 4, 0, -4, 0, 2, 2]), "Scale");
        tests.is(m.invert(), new Matrix(3, [0.2, 0.2, 0, -0.2, 0.3, 1, 0.2, -0.3, 0]), "Scale");

        var a = new Matrix(2, [3,8,4,6]);
        var b = new Matrix(2, [4, 0, 1, -9]);
        tests.is(a.add(2), new Matrix(2, [5,8,4,8]), "Add scalar");
        tests.is(a.add(b), new Matrix(2, [7, 8, 5, -3]), "Add matrix");
        tests.is(a.subtract(2), new Matrix(2, [1, 8, 4, 4]), "Subtract scalar");
        tests.is(a.subtract(b), new Matrix(2, [-1, 8, 3, 15]), "Subtract matrix");

        var c = new Matrix(2, [1,2,3,4,5,6]);
        var d = new Matrix(3, [7,8,9,10,11,12]);
        tests.is(c.multiply(d), new Matrix(2, [58, 64, 139, 154]))
        tests.is(c.identity(2), new Matrix(2, [1, 0, 0, 1]))
    }});
}

exports.Matrix = Matrix;
window.__Matrix__ = exports;

})