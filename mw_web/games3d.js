var MWO = MWO || {};

(function() {
  'use strict';

  // =========================================================================
  // 1. SMALL SHARED 3D ENGINE (G3D)
  // WebGL Renderer + 2D Canvas Software Fallback (Same API)
  // Target: mid-range mobile devices (mobile GPU)
  // =========================================================================

  var G3D = (function() {
    // --- Column-Major mat4 Math Library ---
    var mat4 = {
      create: function() {
        var m = new Float32Array(16);
        m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
        return m;
      },
      identity: function(out) {
        out.fill(0);
        out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
        return out;
      },
      perspective: function(out, fovRad, aspect, near, far) {
        out.fill(0);
        var f = 1.0 / Math.tan(fovRad / 2);
        var nf = 1.0 / (near - far);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = (2 * far * near) * nf;
        return out;
      },
      lookAt: function(out, eye, center, up) {
        var ex = eye[0], ey = eye[1], ez = eye[2];
        var cx = center[0], cy = center[1], cz = center[2];
        var z0 = ex - cx, z1 = ey - cy, z2 = ez - cz;
        var len = 1 / (Math.hypot(z0, z1, z2) || 1);
        z0 *= len; z1 *= len; z2 *= len;

        var ux = up[0], uy = up[1], uz = up[2];
        var x0 = uy * z2 - uz * z1;
        var x1 = uz * z0 - ux * z2;
        var x2 = ux * z1 - uy * z0;
        len = 1 / (Math.hypot(x0, x1, x2) || 1);
        x0 *= len; x1 *= len; x2 *= len;

        var y0 = z1 * x2 - z2 * x1;
        var y1 = z2 * x0 - z0 * x2;
        var y2 = z0 * x1 - z1 * x0;

        out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
        out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
        out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
        out[12] = -(x0 * ex + x1 * ey + x2 * ez);
        out[13] = -(y0 * ex + y1 * ey + y2 * ez);
        out[14] = -(z0 * ex + z1 * ey + z2 * ez);
        out[15] = 1;
        return out;
      },
      multiply: function(out, a, b) {
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
        out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        return out;
      },
      translate: function(out, a, v) {
        var x = v[0], y = v[1], z = v[2];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        if (out !== a) {
          for (var i = 0; i < 12; i++) out[i] = a[i];
        }
        return out;
      },
      rotateX: function(out, a, rad) {
        var s = Math.sin(rad), c = Math.cos(rad);
        var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        if (out !== a) {
          out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
          out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        }
        out[4] = a10 * c + a20 * s;
        out[5] = a11 * c + a21 * s;
        out[6] = a12 * c + a22 * s;
        out[7] = a13 * c + a23 * s;
        out[8] = a20 * c - a10 * s;
        out[9] = a21 * c - a11 * s;
        out[10] = a22 * c - a12 * s;
        out[11] = a23 * c - a13 * s;
        return out;
      },
      rotateY: function(out, a, rad) {
        var s = Math.sin(rad), c = Math.cos(rad);
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        if (out !== a) {
          out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
          out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        }
        out[0] = a00 * c - a20 * s;
        out[1] = a01 * c - a21 * s;
        out[2] = a02 * c - a22 * s;
        out[3] = a03 * c - a23 * s;
        out[8] = a00 * s + a20 * c;
        out[9] = a01 * s + a21 * c;
        out[10] = a02 * s + a22 * c;
        out[11] = a03 * s + a23 * c;
        return out;
      },
      rotateZ: function(out, a, rad) {
        var s = Math.sin(rad), c = Math.cos(rad);
        var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        if (out !== a) {
          out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
          out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        }
        out[0] = a00 * c + a10 * s;
        out[1] = a01 * c + a11 * s;
        out[2] = a02 * c + a12 * s;
        out[3] = a03 * c + a13 * s;
        out[4] = a10 * c - a00 * s;
        out[5] = a11 * c - a01 * s;
        out[6] = a12 * c - a02 * s;
        out[7] = a13 * c - a03 * s;
        return out;
      },
      scale: function(out, a, v) {
        var x = v[0], y = v[1], z = v[2];
        out[0] = a[0] * x; out[1] = a[1] * x; out[2] = a[2] * x; out[3] = a[3] * x;
        out[4] = a[4] * y; out[5] = a[5] * y; out[6] = a[6] * y; out[7] = a[7] * y;
        out[8] = a[8] * z; out[9] = a[9] * z; out[10] = a[10] * z; out[11] = a[11] * z;
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
        return out;
      },
      fromTRS: function(out, pos, rotY, scaleVec) {
        mat4.identity(out);
        if (pos) mat4.translate(out, out, pos);
        if (rotY) mat4.rotateY(out, out, rotY);
        if (scaleVec) mat4.scale(out, out, scaleVec);
        return out;
      }
    };

    // --- Interleaved Geometry Helper (pos, norm, col -> 9 floats per vertex) ---
    function addTri(arr, p0, p1, p2, col) {
      var ax = p1[0]-p0[0], ay = p1[1]-p0[1], az = p1[2]-p0[2];
      var bx = p2[0]-p0[0], by = p2[1]-p0[1], bz = p2[2]-p0[2];
      var nx = ay*bz - az*by;
      var ny = az*bx - ax*bz;
      var nz = ax*by - ay*bx;
      var len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      var r = col[0], g = col[1], b = col[2];
      arr.push(
        p0[0], p0[1], p0[2], nx, ny, nz, r, g, b,
        p1[0], p1[1], p1[2], nx, ny, nz, r, g, b,
        p2[0], p2[1], p2[2], nx, ny, nz, r, g, b
      );
    }

    function addQuad(arr, p0, p1, p2, p3, col) {
      addTri(arr, p0, p1, p2, col);
      addTri(arr, p0, p2, p3, col);
    }

    function createMesh(arr) {
      return {
        data: new Float32Array(arr),
        count: Math.floor(arr.length / 9),
        buffer: null
      };
    }

    // --- Low-Poly Geometry Generators ---
    var Mesh = {
      box: function(w, h, d, color) {
        var hw = w / 2, hh = h / 2, hd = d / 2;
        var arr = [];
        addQuad(arr, [-hw,-hh, hd], [ hw,-hh, hd], [ hw, hh, hd], [-hw, hh, hd], color); // Front
        addQuad(arr, [ hw,-hh,-hd], [-hw,-hh,-hd], [-hw, hh,-hd], [ hw, hh,-hd], color); // Back
        addQuad(arr, [-hw, hh, hd], [ hw, hh, hd], [ hw, hh,-hd], [-hw, hh,-hd], color); // Top
        addQuad(arr, [-hw,-hh,-hd], [ hw,-hh,-hd], [ hw,-hh, hd], [-hw,-hh, hd], color); // Bottom
        addQuad(arr, [ hw,-hh, hd], [ hw,-hh,-hd], [ hw, hh,-hd], [ hw, hh, hd], color); // Right
        addQuad(arr, [-hw,-hh,-hd], [-hw,-hh, hd], [-hw, hh, hd], [-hw, hh,-hd], color); // Left
        return createMesh(arr);
      },

      planeXZ: function(w, d, color) {
        var hw = w / 2, hd = d / 2;
        var arr = [];
        addQuad(arr, [-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd], color);
        return createMesh(arr);
      },

      sphere: function(r, color, latSeg, lonSeg) {
        latSeg = latSeg || 6;
        lonSeg = lonSeg || 8;
        var arr = [];
        for (var i = 0; i < latSeg; i++) {
          var theta1 = (i / latSeg) * Math.PI;
          var theta2 = ((i + 1) / latSeg) * Math.PI;
          for (var j = 0; j < lonSeg; j++) {
            var phi1 = (j / lonSeg) * Math.PI * 2;
            var phi2 = ((j + 1) / lonSeg) * Math.PI * 2;

            var p0 = [r * Math.sin(theta1) * Math.cos(phi1), r * Math.cos(theta1), r * Math.sin(theta1) * Math.sin(phi1)];
            var p1 = [r * Math.sin(theta1) * Math.cos(phi2), r * Math.cos(theta1), r * Math.sin(theta1) * Math.sin(phi2)];
            var p2 = [r * Math.sin(theta2) * Math.cos(phi2), r * Math.cos(theta2), r * Math.sin(theta2) * Math.sin(phi2)];
            var p3 = [r * Math.sin(theta2) * Math.cos(phi1), r * Math.cos(theta2), r * Math.sin(theta2) * Math.sin(phi1)];

            if (i === 0) {
              addTri(arr, p0, p2, p3, color);
            } else if (i === latSeg - 1) {
              addTri(arr, p0, p1, p2, color);
            } else {
              addQuad(arr, p0, p1, p2, p3, color);
            }
          }
        }
        return createMesh(arr);
      },

      cylinder: function(r1, r2, h, color, seg) {
        seg = seg || 8;
        var hh = h / 2;
        var arr = [];
        for (var i = 0; i < seg; i++) {
          var a1 = (i / seg) * Math.PI * 2;
          var a2 = ((i + 1) / seg) * Math.PI * 2;

          var x1 = Math.cos(a1), z1 = Math.sin(a1);
          var x2 = Math.cos(a2), z2 = Math.sin(a2);

          var p0 = [x1 * r1, hh, z1 * r1];
          var p1 = [x2 * r1, hh, z2 * r1];
          var p2 = [x2 * r2, -hh, z2 * r2];
          var p3 = [x1 * r2, -hh, z1 * r2];

          if (r1 > 0 && r2 > 0) {
            addQuad(arr, p0, p1, p2, p3, color);
          } else if (r1 === 0) {
            addTri(arr, p0, p2, p3, color);
          } else {
            addTri(arr, p0, p1, p2, color);
          }

          if (r1 > 0) addTri(arr, [0, hh, 0], p0, p1, color);
          if (r2 > 0) addTri(arr, [0, -hh, 0], p3, p2, color);
        }
        return createMesh(arr);
      },

      cone: function(r, h, color, seg) {
        return Mesh.cylinder(0, r, h, color, seg || 8);
      },

      combine: function(meshList) {
        var totalFloats = 0;
        for (var i = 0; i < meshList.length; i++) totalFloats += meshList[i].data.length;
        var arr = new Float32Array(totalFloats);
        var offset = 0;
        for (var j = 0; j < meshList.length; j++) {
          arr.set(meshList[j].data, offset);
          offset += meshList[j].data.length;
        }
        return createMesh(arr);
      }
    };

    // --- Scene Engine (WebGL + Canvas2D Fallback) ---
    function Scene(canvas) {
      var gl = null;
      try {
        gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true }) ||
             canvas.getContext('experimental-webgl', { alpha: false, antialias: true, depth: true });
      } catch (e) {}

      // Mobile resolution cap for smooth performance on low-power phones
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var maxPixels = 600000;
      var w = canvas.clientWidth || canvas.width || 600;
      var h = canvas.clientHeight || canvas.height || 400;
      if (w * h * dpr * dpr > maxPixels) {
        dpr = Math.sqrt(maxPixels / (w * h));
      }
      canvas.width = Math.max(320, Math.floor(w * dpr));
      canvas.height = Math.max(240, Math.floor(h * dpr));

      var clearColor = [0.08, 0.08, 0.16];
      var lightDir = [0.5, 1.0, 0.7];
      var fov = 60 * Math.PI / 180;
      var eye = [0, 5, 10], lookAt = [0, 0, 0], up = [0, 1, 0];

      var viewMatrix = mat4.create();
      var projMatrix = mat4.create();
      var vpMatrix = mat4.create();
      var mvpMatrix = mat4.create();

      var objects = [];
      var program = null, uMVP = null, uModel = null, uLightDir = null;
      var aPos = -1, aNorm = -1, aCol = -1;

      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        var vsSource =
          'attribute vec3 aPos;\n' +
          'attribute vec3 aNorm;\n' +
          'attribute vec3 aCol;\n' +
          'uniform mat4 uMVP;\n' +
          'uniform mat4 uModel;\n' +
          'uniform vec3 uLightDir;\n' +
          'varying vec3 vColor;\n' +
          'varying float vLight;\n' +
          'void main() {\n' +
          '  gl_Position = uMVP * vec4(aPos, 1.0);\n' +
          '  vec3 n = normalize(mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz) * aNorm);\n' +
          '  float diff = max(dot(n, uLightDir), 0.0);\n' +
          '  vLight = 0.35 + 0.65 * diff;\n' +
          '  vColor = aCol;\n' +
          '}\n';

        var fsSource =
          'precision mediump float;\n' +
          'varying vec3 vColor;\n' +
          'varying float vLight;\n' +
          'void main() {\n' +
          '  gl_FragColor = vec4(vColor * vLight, 1.0);\n' +
          '}\n';

        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);

        var fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        uMVP = gl.getUniformLocation(program, 'uMVP');
        uModel = gl.getUniformLocation(program, 'uModel');
        uLightDir = gl.getUniformLocation(program, 'uLightDir');

        aPos = gl.getAttribLocation(program, 'aPos');
        aNorm = gl.getAttribLocation(program, 'aNorm');
        aCol = gl.getAttribLocation(program, 'aCol');
      }

      var ctx2d = gl ? null : canvas.getContext('2d');

      return {
        isWebGL: !!gl,
        canvas: canvas,
        setClearColor: function(r, g, b) {
          clearColor = [r, g, b];
        },
        setCamera: function(fDeg, e, l) {
          fov = fDeg * Math.PI / 180;
          eye = e; lookAt = l;
        },
        setLightDir: function(ld) {
          var len = Math.hypot(ld[0], ld[1], ld[2]) || 1;
          lightDir = [ld[0]/len, ld[1]/len, ld[2]/len];
        },
        clear: function() {
          objects = [];
        },
        add: function(mesh, modelMat) {
          if (!mesh) return;
          objects.push({ mesh: mesh, matrix: modelMat || mat4.create() });
        },
        render: function() {
          var cw = canvas.clientWidth || canvas.width || 600;
          var ch = canvas.clientHeight || canvas.height || 400;
          var targetW = Math.max(320, Math.floor(cw * dpr));
          var targetH = Math.max(240, Math.floor(ch * dpr));
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
            if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
          }

          var aspect = canvas.width / (canvas.height || 1);
          mat4.perspective(projMatrix, fov, aspect, 0.1, 500.0);
          mat4.lookAt(viewMatrix, eye, lookAt, up);
          mat4.multiply(vpMatrix, projMatrix, viewMatrix);

          var lLen = Math.hypot(lightDir[0], lightDir[1], lightDir[2]) || 1;
          var lNorm = [lightDir[0]/lLen, lightDir[1]/lLen, lightDir[2]/lLen];

          if (gl) {
            gl.clearColor(clearColor[0], clearColor[1], clearColor[2], 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(program);
            gl.uniform3fv(uLightDir, lNorm);

            for (var i = 0; i < objects.length; i++) {
              var item = objects[i];
              var mesh = item.mesh;
              var M = item.matrix;

              if (!mesh.buffer) {
                mesh.buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
                gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
              } else {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
              }

              mat4.multiply(mvpMatrix, vpMatrix, M);
              gl.uniformMatrix4fv(uMVP, false, mvpMatrix);
              gl.uniformMatrix4fv(uModel, false, M);

              var stride = 36;
              gl.enableVertexAttribArray(aPos);
              gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
              gl.enableVertexAttribArray(aNorm);
              gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, stride, 12);
              gl.enableVertexAttribArray(aCol);
              gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, stride, 24);

              gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
            }
          } else if (ctx2d) {
            // Software Painter's Fallback
            ctx2d.fillStyle = 'rgb(' + Math.floor(clearColor[0]*255) + ',' + Math.floor(clearColor[1]*255) + ',' + Math.floor(clearColor[2]*255) + ')';
            ctx2d.fillRect(0, 0, canvas.width, canvas.height);

            var trisToDraw = [];
            var W = canvas.width, H = canvas.height;

            for (var j = 0; j < objects.length; j++) {
              var itm = objects[j];
              var msh = itm.mesh;
              var mat = itm.matrix;
              mat4.multiply(mvpMatrix, vpMatrix, mat);

              var data = msh.data;
              var count = msh.count * 9;

              for (var t = 0; t < count; t += 27) {
                var x0 = data[t],    y0 = data[t+1],  z0 = data[t+2];
                var x1 = data[t+9],  y1 = data[t+10], z1 = data[t+11];
                var x2 = data[t+18], y2 = data[t+19], z2 = data[t+20];

                var w0 = mvpMatrix[3]*x0 + mvpMatrix[7]*y0 + mvpMatrix[11]*z0 + mvpMatrix[15];
                var w1 = mvpMatrix[3]*x1 + mvpMatrix[7]*y1 + mvpMatrix[11]*z1 + mvpMatrix[15];
                var w2 = mvpMatrix[3]*x2 + mvpMatrix[7]*y2 + mvpMatrix[11]*z2 + mvpMatrix[15];
                if (w0 <= 0.1 || w1 <= 0.1 || w2 <= 0.1) continue;

                var px0 = (mvpMatrix[0]*x0 + mvpMatrix[4]*y0 + mvpMatrix[8]*z0 + mvpMatrix[12]) / w0;
                var py0 = (mvpMatrix[1]*x0 + mvpMatrix[5]*y0 + mvpMatrix[9]*z0 + mvpMatrix[13]) / w0;
                var px1 = (mvpMatrix[0]*x1 + mvpMatrix[4]*y1 + mvpMatrix[8]*z1 + mvpMatrix[12]) / w1;
                var py1 = (mvpMatrix[1]*x1 + mvpMatrix[5]*y1 + mvpMatrix[9]*z1 + mvpMatrix[13]) / w1;
                var px2 = (mvpMatrix[0]*x2 + mvpMatrix[4]*y2 + mvpMatrix[8]*z2 + mvpMatrix[12]) / w2;
                var py2 = (mvpMatrix[1]*x2 + mvpMatrix[5]*y2 + mvpMatrix[9]*z2 + mvpMatrix[13]) / w2;

                var sx0 = (px0 * 0.5 + 0.5) * W, sy0 = (-py0 * 0.5 + 0.5) * H;
                var sx1 = (px1 * 0.5 + 0.5) * W, sy1 = (-py1 * 0.5 + 0.5) * H;
                var sx2 = (px2 * 0.5 + 0.5) * W, sy2 = (-py2 * 0.5 + 0.5) * H;

                var cross = (sx1 - sx0) * (sy2 - sy0) - (sy1 - sy0) * (sx2 - sx0);
                if (cross <= 0) continue;

                var nx = data[t+3], ny = data[t+4], nz = data[t+5];
                var tnx = mat[0]*nx + mat[4]*ny + mat[8]*nz;
                var tny = mat[1]*nx + mat[5]*ny + mat[9]*nz;
                var tnz = mat[2]*nx + mat[6]*ny + mat[10]*nz;
                var nlen = Math.hypot(tnx, tny, tnz) || 1;
                var diff = Math.max(0, (tnx/nlen)*lNorm[0] + (tny/nlen)*lNorm[1] + (tnz/nlen)*lNorm[2]);
                var light = 0.35 + 0.65 * diff;

                var r = Math.min(255, Math.floor(data[t+6] * 255 * light));
                var g = Math.min(255, Math.floor(data[t+7] * 255 * light));
                var b = Math.min(255, Math.floor(data[t+8] * 255 * light));

                trisToDraw.push({
                  sx0: sx0, sy0: sy0, sx1: sx1, sy1: sy1, sx2: sx2, sy2: sy2,
                  color: 'rgb(' + r + ',' + g + ',' + b + ')',
                  depth: (w0 + w1 + w2) / 3
                });
              }
            }

            trisToDraw.sort(function(a, b) { return b.depth - a.depth; });

            for (var k = 0; k < trisToDraw.length; k++) {
              var tri = trisToDraw[k];
              ctx2d.fillStyle = tri.color;
              ctx2d.beginPath();
              ctx2d.moveTo(tri.sx0, tri.sy0);
              ctx2d.lineTo(tri.sx1, tri.sy1);
              ctx2d.lineTo(tri.sx2, tri.sy2);
              ctx2d.closePath();
              ctx2d.fill();
            }
          }
        }
      };
    }

    // --- Touch Control Helper (Virtual Joystick + Drag Look) ---
    function TouchPad(element) {
      var state = { mx: 0, my: 0, lookX: 0, lookY: 0, isTouching: false };
      var keys = {};
      var touchIdLeft = null, touchIdRight = null;
      var startLeft = { x: 0, y: 0 };
      var lastRight = { x: 0, y: 0 };

      function onKeyDown(e) {
        keys[e.code] = true;
      }
      function onKeyUp(e) {
        keys[e.code] = false;
      }

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      function updateKeys() {
        var kx = 0, ky = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) kx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) kx += 1;
        if (keys['KeyW'] || keys['ArrowUp']) ky -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) ky += 1;
        if (kx !== 0 || ky !== 0) {
          state.mx = kx;
          state.my = ky;
        }
      }

      function handlePointerDown(e) {
        var rect = element.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        if (x < rect.width * 0.5) {
          touchIdLeft = e.pointerId || 'mouse';
          startLeft = { x: x, y: y };
          state.isTouching = true;
        } else {
          touchIdRight = e.pointerId || 'mouse';
          lastRight = { x: x, y: y };
        }
        element.setPointerCapture && element.setPointerCapture(e.pointerId);
      }

      function handlePointerMove(e) {
        var pid = e.pointerId || 'mouse';
        var rect = element.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        if (pid === touchIdLeft) {
          var dx = x - startLeft.x;
          var dy = y - startLeft.y;
          var R = 45;
          state.mx = Math.max(-1, Math.min(1, dx / R));
          state.my = Math.max(-1, Math.min(1, dy / R));
        } else if (pid === touchIdRight) {
          state.lookX += (x - lastRight.x) * 0.005;
          state.lookY += (y - lastRight.y) * 0.005;
          lastRight = { x: x, y: y };
        }
      }

      function handlePointerUp(e) {
        var pid = e.pointerId || 'mouse';
        if (pid === touchIdLeft) {
          touchIdLeft = null;
          state.mx = 0;
          state.my = 0;
          state.isTouching = false;
        }
        if (pid === touchIdRight) {
          touchIdRight = null;
        }
      }

      element.addEventListener('pointerdown', handlePointerDown);
      element.addEventListener('pointermove', handlePointerMove);
      element.addEventListener('pointerup', handlePointerUp);
      element.addEventListener('pointercancel', handlePointerUp);

      return {
        getState: function() {
          updateKeys();
          return state;
        },
        resetLook: function() {
          state.lookX = 0;
          state.lookY = 0;
        },
        destroy: function() {
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
        }
      };
    }

    return {
      mat4: mat4,
      Mesh: Mesh,
      Scene: Scene,
      TouchPad: TouchPad
    };
  })();

  // =========================================================================
  // 2. HIGH SCORE PERSISTENCE HELPER
  // Path: /Documents/highscores.json
  // =========================================================================

  function loadHighScores(cb) {
    if (MWO.fs && MWO.fs.readFile) {
      MWO.fs.readFile('/Documents/highscores.json').then(function(res) {
        try {
          var parsed = typeof res === 'string' ? JSON.parse(res) : (res || {});
          cb(parsed);
        } catch(e) { cb({}); }
      }).catch(function() { cb({}); });
    } else {
      cb({});
    }
  }

  function saveHighScore(key, val, lowerIsBetter) {
    loadHighScores(function(scores) {
      var oldVal = scores[key];
      var isNewRecord = false;
      if (oldVal === undefined || oldVal === null) {
        isNewRecord = true;
      } else if (lowerIsBetter ? (val < oldVal) : (val > oldVal)) {
        isNewRecord = true;
      }
      if (isNewRecord) {
        scores[key] = val;
        if (MWO.fs && MWO.fs.writeFile) {
          MWO.fs.writeFile('/Documents/highscores.json', JSON.stringify(scores, null, 2)).catch(function(){});
        }
      }
    });
  }


  // =========================================================================
 // 3. GAME 1: Sky Racers 3D (WebGL Kart Racer)
  // =========================================================================

  MWO.registerApp({
    id: 'skyracers3d',
    name: 'Sky Racers 3D',
    description: 'High-speed 3D kart racing circuit with AI & boost pads',
    icon: 'sky-racers-3d',
    category: 'game',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({
        id: 'skyracers-' + Date.now(),
 title: 'Sky Racers 3D ',
        icon: 'sky-racers-3d',
        width: 640,
        height: 440,
        resizable: true
      });

      win.innerHTML =
        '<div style="position:relative;width:100%;height:100%;background:#0a0a1a;overflow:hidden;font-family:sans-serif;user-select:none;">' +
          '<canvas id="sky-canvas" style="width:100%;height:100%;display:block;touch-action:none;"></canvas>' +
          '<div id="sky-hud" style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none;color:#fff;font-size:0.9em;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,0.8);">' +
            '<div>LAP: <span id="sky-lap" style="color:#e94560;">1/3</span></div>' +
            '<div>SPEED: <span id="sky-speed" style="color:#4e4;">0</span> km/h</div>' +
            '<div>TIME: <span id="sky-time" style="color:#ec4;">0.0s</span> (BEST: <span id="sky-best">--</span>)</div>' +
          '</div>' +
          '<div id="sky-touch-controls" style="position:absolute;bottom:12px;left:12px;right:12px;display:flex;justify-content:space-between;pointer-events:auto;">' +
            '<div style="display:flex;gap:6px;">' +
              '<button id="sky-btn-left" class="mw-btn" style="width:54px;height:54px;font-size:1.4em;background:rgba(255,255,255,0.15);border-radius:50%;color:#fff;">◀</button>' +
              '<button id="sky-btn-right" class="mw-btn" style="width:54px;height:54px;font-size:1.4em;background:rgba(255,255,255,0.15);border-radius:50%;color:#fff;">Run</button>' +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
              '<button id="sky-btn-brake" class="mw-btn" style="width:54px;height:54px;font-size:0.85em;background:rgba(233,69,96,0.3);border-radius:50%;color:#fff;font-weight:700;">BRAKE</button>' +
              '<button id="sky-btn-accel" class="mw-btn" style="width:54px;height:54px;font-size:0.85em;background:rgba(46,204,113,0.4);border-radius:50%;color:#fff;font-weight:700;">GAS</button>' +
            '</div>' +
          '</div>' +
          '<div id="sky-overlay" style="position:absolute;inset:0;background:rgba(10,10,26,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:10;">' +
            '<h1 style="font-size:2em;color:#e94560;margin-bottom:6px;">Sky Racers 3D</h1>' +
            '<p style="color:#aaa;font-size:0.9em;margin-bottom:16px;">3 Laps to Victory! Touch Controls or WASD / Arrow Keys</p>' +
 '<button id="sky-start-btn" class="mw-btn primary" style="padding:12px 28px;font-size:1.1em;border-radius:8px;">Tap to Start </button>' +
          '</div>' +
        '</div>';

      var canvas = win.querySelector('#sky-canvas');
      var scene = G3D.Scene(canvas);
      scene.setClearColor(0.12, 0.18, 0.28);
      scene.setLightDir([0.6, 1.0, 0.5]);

      // --- Track Spline (40 Control Points Loop) ---
      var numPoints = 40;
      var trackControl = [];
      for (var i = 0; i < numPoints; i++) {
        var ang = (i / numPoints) * Math.PI * 2;
        var rad = 75 + Math.sin(ang * 3) * 20 + Math.cos(ang * 5) * 12;
        trackControl.push([Math.cos(ang) * rad, 0, Math.sin(ang) * rad]);
      }

      function catmull(p0, p1, p2, p3, t) {
        var t2 = t * t, t3 = t2 * t;
        return [
          0.5 * ((2*p1[0]) + (-p0[0] + p2[0])*t + (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0])*t2 + (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0])*t3),
          0,
          0.5 * ((2*p1[2]) + (-p0[2] + p2[2])*t + (2*p0[2] - 5*p1[2] + 4*p2[2] - p3[2])*t2 + (-p0[2] + 3*p1[2] - 3*p2[2] + p3[2])*t3)
        ];
      }

      var splineSamples = [];
      var numSamples = 160;
      for (var s = 0; s < numSamples; s++) {
        var floatIdx = (s / numSamples) * numPoints;
        var idx1 = Math.floor(floatIdx) % numPoints;
        var idx0 = (idx1 - 1 + numPoints) % numPoints;
        var idx2 = (idx1 + 1) % numPoints;
        var idx3 = (idx1 + 2) % numPoints;
        var localT = floatIdx - Math.floor(floatIdx);
        splineSamples.push(catmull(trackControl[idx0], trackControl[idx1], trackControl[idx2], trackControl[idx3], localT));
      }

      // --- Build Meshes ---
      var meshesToCombine = [];
      var roadWidth = 9.0;
      for (var r = 0; r < numSamples; r++) {
        var pCurrent = splineSamples[r];
        var pNext = splineSamples[(r + 1) % numSamples];
        var dx = pNext[0] - pCurrent[0], dz = pNext[2] - pCurrent[2];
        var len = Math.hypot(dx, dz) || 1;
        var rx = -dz / len, rz = dx / len; // perpendicular right vector

        var roadColor = (r % 4 < 2) ? [0.22, 0.22, 0.25] : [0.25, 0.25, 0.28];
        var curbColor = (r % 2 === 0) ? [0.9, 0.1, 0.1] : [0.95, 0.95, 0.95];

        // Road segment
        meshesToCombine.push(G3D.Mesh.planeXZ(roadWidth, len, roadColor));
        // Curbs
        meshesToCombine.push(G3D.Mesh.box(0.8, 0.3, len, curbColor));
      }

      var groundMesh = G3D.Mesh.planeXZ(350, 350, [0.15, 0.45, 0.18]);
      var treeTrunk = G3D.Mesh.cylinder(0.3, 0.4, 1.8, [0.35, 0.2, 0.1], 6);
      var treeFoliage = G3D.Mesh.cone(1.8, 3.5, [0.1, 0.6, 0.2], 6);
      var boostMesh = G3D.Mesh.box(5.0, 0.1, 3.0, [0.1, 0.9, 0.3]);
      var kartBodyRed = G3D.Mesh.box(1.2, 0.6, 2.2, [0.9, 0.15, 0.15]);
      var kartBodyBlue = G3D.Mesh.box(1.2, 0.6, 2.2, [0.15, 0.4, 0.9]);
      var kartBodyYellow = G3D.Mesh.box(1.2, 0.6, 2.2, [0.9, 0.8, 0.1]);
      var kartBodyCyan = G3D.Mesh.box(1.2, 0.6, 2.2, [0.1, 0.85, 0.85]);
      var wheelMesh = G3D.Mesh.cylinder(0.35, 0.35, 0.3, [0.1, 0.1, 0.1], 8);

      // Boost Pad Indices
      var boostIndices = [20, 60, 100, 140];

      // Static Trees positioning
      var treeTransforms = [];
      for (var t = 0; t < 30; t++) {
        var sIdx = Math.floor((t / 30) * numSamples);
        var pCenter = splineSamples[sIdx];
        var side = (t % 2 === 0) ? 12 : -12;
        treeTransforms.push([pCenter[0] + side + (Math.sin(t)*4), 0, pCenter[2] + side + (Math.cos(t)*4)]);
      }

      // --- State Variables ---
      var player = { x: splineSamples[0][0], z: splineSamples[0][2], angle: 0, speed: 0, lap: 1, checkpoint: 0, boostTimer: 0 };
      var aiKarts = [
        { x: splineSamples[0][0] - 2, z: splineSamples[0][2] - 2, angle: 0, speed: 0, lap: 1, checkpoint: 0, targetIdx: 5, color: kartBodyBlue },
        { x: splineSamples[0][0] + 2, z: splineSamples[0][2] - 2, angle: 0, speed: 0, lap: 1, checkpoint: 0, targetIdx: 5, color: kartBodyYellow },
        { x: splineSamples[0][0], z: splineSamples[0][2] - 4, angle: 0, speed: 0, lap: 1, checkpoint: 0, targetIdx: 5, color: kartBodyCyan }
      ];

      var keys = { left: false, right: false, accel: false, brake: false };
      var gameState = 'title'; // 'title', 'playing', 'finished'
      var startTime = 0, lapTime = 0, bestLap = null;

      // Touch Buttons Setup
      function setupBtn(id, keyName) {
        var btn = win.querySelector('#' + id);
        if (!btn) return;
        var startHandler = function(e) { e.preventDefault(); keys[keyName] = true; };
        var endHandler = function(e) { e.preventDefault(); keys[keyName] = false; };
        btn.addEventListener('pointerdown', startHandler);
        btn.addEventListener('pointerup', endHandler);
        btn.addEventListener('pointercancel', endHandler);
      }
      setupBtn('sky-btn-left', 'left');
      setupBtn('sky-btn-right', 'right');
      setupBtn('sky-btn-accel', 'accel');
      setupBtn('sky-btn-brake', 'brake');

      window.addEventListener('keydown', function(e) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.accel = true;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.brake = true;
      });
      window.addEventListener('keyup', function(e) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
        if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.accel = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.brake = false;
      });

      loadHighScores(function(scores) {
        if (scores.skyracers_best) {
          bestLap = scores.skyracers_best;
          win.querySelector('#sky-best').textContent = bestLap.toFixed(1) + 's';
        }
      });

      win.querySelector('#sky-start-btn').onclick = function() {
        win.querySelector('#sky-overlay').style.display = 'none';
        gameState = 'playing';
        startTime = performance.now();
      };

      // --- Initial Kart Orientations ---
      var initDir = [splineSamples[1][0] - splineSamples[0][0], splineSamples[1][2] - splineSamples[0][2]];
      player.angle = Math.atan2(initDir[0], initDir[1]);

      // --- Main Render & Physics Loop ---
      var rafId = null;
      function loop() {
        if (!win.isConnected) return;

        if (gameState === 'playing') {
          var now = performance.now();
          lapTime = (now - startTime) / 1000;
          win.querySelector('#sky-time').textContent = lapTime.toFixed(1) + 's';

          // Player Physics
          var maxSpeed = player.boostTimer > 0 ? 0.95 : 0.65;
          if (player.boostTimer > 0) player.boostTimer--;

          if (keys.accel) player.speed = Math.min(maxSpeed, player.speed + 0.02);
          else if (keys.brake) player.speed = Math.max(-0.2, player.speed - 0.03);
          else player.speed *= 0.97;

          if (keys.left) player.angle += 0.045 * (player.speed / 0.65);
          if (keys.right) player.angle -= 0.045 * (player.speed / 0.65);

          player.x += Math.sin(player.angle) * player.speed;
          player.z += Math.cos(player.angle) * player.speed;

          // Check distance to spline (Off-track Grass Slowdown)
          var closestDist = 999;
          var closestIdx = 0;
          for (var c = 0; c < numSamples; c++) {
            var d = Math.hypot(player.x - splineSamples[c][0], player.z - splineSamples[c][2]);
            if (d < closestDist) { closestDist = d; closestIdx = c; }
          }
          if (closestDist > roadWidth * 0.5) {
            player.speed *= 0.88; // grass friction
          }

          // Check Boost Pads
          for (var b = 0; b < boostIndices.length; b++) {
            var bPos = splineSamples[boostIndices[b]];
            if (Math.hypot(player.x - bPos[0], player.z - bPos[2]) < 3.5) {
              player.boostTimer = 45; // boost frames
            }
          }

          // Check Lap Progress
          if (closestIdx > player.checkpoint && closestIdx - player.checkpoint < 20) {
            player.checkpoint = closestIdx;
          } else if (player.checkpoint > numSamples - 30 && closestIdx < 15) {
            player.checkpoint = closestIdx;
            player.lap++;
            if (player.lap > 3) {
              gameState = 'finished';
              MWO.notif.show('Sky Racers 3D', 'Race Finished! Time: ' + lapTime.toFixed(1) + 's');
              saveHighScore('skyracers_best', lapTime, true);
              win.querySelector('#sky-overlay').style.display = 'flex';
              win.querySelector('#sky-overlay').innerHTML =
                '<h1 style="color:#e94560;">FINISH! WIN</h1>' +
                '<p style="margin:12px 0;">Total Time: ' + lapTime.toFixed(1) + 's</p>' +
                '<button class="mw-btn primary mw-restart" data-app="skyracers3d">Play Again</button>';
            } else {
              win.querySelector('#sky-lap').textContent = player.lap + '/3';
            }
          }

          win.querySelector('#sky-speed').textContent = Math.floor(Math.abs(player.speed) * 160);

          // AI Karts Update
          for (var a = 0; a < aiKarts.length; a++) {
            var ai = aiKarts[a];
            var targetP = splineSamples[ai.targetIdx];
            var adx = targetP[0] - ai.x, adz = targetP[2] - ai.z;
            var targetAngle = Math.atan2(adx, adz);
            ai.angle += (targetAngle - ai.angle) * 0.1;
            ai.speed = 0.55 + (a * 0.03);
            ai.x += Math.sin(ai.angle) * ai.speed;
            ai.z += Math.cos(ai.angle) * ai.speed;
            if (Math.hypot(adx, adz) < 4.0) {
              ai.targetIdx = (ai.targetIdx + 4) % numSamples;
            }
          }
        }

        // --- Render 3D Scene ---
        scene.clear();

        // 1. Ground Plane
        var mGround = G3D.mat4.create();
        scene.add(groundMesh, mGround);

        // 2. Track Curbs & Road (Sampled)
        for (var s = 0; s < numSamples; s += 2) {
          var p0 = splineSamples[s];
          var p1 = splineSamples[(s + 1) % numSamples];
          var mSeg = G3D.mat4.fromTRS(G3D.mat4.create(), p0, Math.atan2(p1[0]-p0[0], p1[2]-p0[2]), [1,1,1]);
          scene.add(groundMesh, mSeg);
        }

        // 3. Boost Pads
        for (var bp = 0; bp < boostIndices.length; bp++) {
          var bpPos = splineSamples[boostIndices[bp]];
          var mBoost = G3D.mat4.fromTRS(G3D.mat4.create(), [bpPos[0], 0.05, bpPos[2]], 0, [1,1,1]);
          scene.add(boostMesh, mBoost);
        }

        // 4. Scenery Trees
        for (var tr = 0; tr < treeTransforms.length; tr++) {
          var tp = treeTransforms[tr];
          var mTrunk = G3D.mat4.fromTRS(G3D.mat4.create(), [tp[0], 0.9, tp[2]], 0, [1,1,1]);
          var mTop = G3D.mat4.fromTRS(G3D.mat4.create(), [tp[0], 3.2, tp[2]], 0, [1,1,1]);
          scene.add(treeTrunk, mTrunk);
          scene.add(treeFoliage, mTop);
        }

        // 5. Player Kart
        var mPlayer = G3D.mat4.fromTRS(G3D.mat4.create(), [player.x, 0.4, player.z], player.angle, [1,1,1]);
        scene.add(kartBodyRed, mPlayer);

        // 6. AI Karts
        for (var ak = 0; ak < aiKarts.length; ak++) {
          var aiK = aiKarts[ak];
          var mAI = G3D.mat4.fromTRS(G3D.mat4.create(), [aiK.x, 0.4, aiK.z], aiK.angle, [1,1,1]);
          scene.add(aiK.color, mAI);
        }

        // Camera Chase Cam
        var camEye = [
          player.x - Math.sin(player.angle) * 8.5,
          player.y + 4.2 || 4.2,
          player.z - Math.cos(player.angle) * 8.5
        ];
        var camLook = [player.x, 1.2, player.z];
        scene.setCamera(60, camEye, camLook);
        scene.render();

        rafId = requestAnimationFrame(loop);
      }

      rafId = requestAnimationFrame(loop);
    }
  });


  // =========================================================================
  // 4. GAME 2: Star Fighter 3D  (WebGL Space Dogfight)
  // =========================================================================

  MWO.registerApp({
    id: 'starfighter3d',
    name: 'Star Fighter 3D',
    description: '3D WebGL space dogfight with enemies, asteroids & waves',
    icon: 'star-fighter-3d',
    category: 'game',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({
        id: 'starfighter-' + Date.now(),
        title: 'Star Fighter 3D ',
        icon: 'star-fighter-3d',
        width: 640,
        height: 440,
        resizable: true
      });

      win.innerHTML =
        '<div style="position:relative;width:100%;height:100%;background:#03030c;overflow:hidden;font-family:sans-serif;user-select:none;">' +
          '<canvas id="sf-canvas" style="width:100%;height:100%;display:block;touch-action:none;"></canvas>' +
          '<div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none;color:#fff;font-size:0.85em;font-weight:700;">' +
            '<div style="display:flex;flex-direction:column;gap:4px;">' +
              '<div>SHIELD: <div style="display:inline-block;width:90px;height:10px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;"><div id="sf-shield-bar" style="width:100%;height:100%;background:#3498db;"></div></div></div>' +
              '<div>HULL: <div style="display:inline-block;width:90px;height:10px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;"><div id="sf-hull-bar" style="width:100%;height:100%;background:#e94560;"></div></div></div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<div>WAVE: <span id="sf-wave" style="color:#f1c40f;">1</span></div>' +
              '<div>KILLS: <span id="sf-kills" style="color:#2ecc71;">0</span></div>' +
            '</div>' +
          '</div>' +
          '<div style="position:absolute;bottom:12px;right:12px;display:flex;gap:10px;pointer-events:auto;">' +
            '<button id="sf-fire-btn" class="mw-btn" style="width:64px;height:64px;font-size:1.1em;background:rgba(233,69,96,0.6);border-radius:50%;color:#fff;font-weight:700;">FIRE X</button>' +
          '</div>' +
          '<div id="sf-overlay" style="position:absolute;inset:0;background:rgba(3,3,12,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:10;">' +
            '<h1 style="font-size:2.2em;color:#3498db;margin-bottom:6px;">Star Fighter 3D</h1>' +
            '<p style="color:#aaa;font-size:0.9em;margin-bottom:16px;">Destroy enemy space fighters! Drag right side or WASD to fly.</p>' +
            '<button id="sf-start-btn" class="mw-btn primary" style="padding:12px 28px;font-size:1.1em;border-radius:8px;">Launch Mission </button>' +
          '</div>' +
        '</div>';

      var canvas = win.querySelector('#sf-canvas');
      var scene = G3D.Scene(canvas);
      scene.setClearColor(0.02, 0.02, 0.06);
      scene.setLightDir([0.5, 0.8, 0.6]);

      var touchPad = G3D.TouchPad(canvas);

      // --- Low-Poly Meshes ---
      var playerShipMesh = G3D.Mesh.combine([
        G3D.Mesh.box(0.8, 0.5, 2.2, [0.8, 0.85, 0.9]), // Fuselage
        G3D.Mesh.cone(1.2, 1.8, [0.2, 0.5, 0.9], 6),  // Left Wing
        G3D.Mesh.box(0.4, 0.3, 0.7, [0.1, 0.7, 0.9])   // Cockpit
      ]);

      var enemyShipMesh = G3D.Mesh.combine([
        G3D.Mesh.box(0.9, 0.5, 1.8, [0.9, 0.2, 0.2]),
        G3D.Mesh.cone(1.0, 1.4, [0.6, 0.1, 0.1], 6)
      ]);

      var asteroidMesh = G3D.Mesh.sphere(2.5, [0.5, 0.42, 0.38], 5, 6);
      var laserMesh = G3D.Mesh.cylinder(0.08, 0.08, 1.2, [0.2, 0.95, 0.3], 6);
      var enemyLaserMesh = G3D.Mesh.cylinder(0.08, 0.08, 1.2, [0.95, 0.2, 0.2], 6);

      // --- Game State ---
      var player = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, shield: 100, hull: 100 };
      var lasers = [];
      var enemyLasers = [];
      var enemies = [];
      var asteroids = [];
      var wave = 1, kills = 0;
      var isPlaying = false;

      // Spawn Asteroids
      for (var a = 0; a < 15; a++) {
        asteroids.push({
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 100,
          z: (Math.random() - 0.5) * 200,
          rotX: Math.random() * 3, rotY: Math.random() * 3
        });
      }

      function spawnWave(w) {
        enemies = [];
        var count = 6 + w * 2;
        for (var i = 0; i < count; i++) {
          enemies.push({
            x: (Math.random() - 0.5) * 120,
            y: (Math.random() - 0.5) * 40,
            z: -60 - Math.random() * 80,
            hp: 30 + w * 10,
            cooldown: Math.random() * 60
          });
        }
      }

      function firePlayerLaser() {
        if (!isPlaying) return;
        var dirX = Math.sin(player.yaw) * Math.cos(player.pitch);
        var dirY = Math.sin(player.pitch);
        var dirZ = -Math.cos(player.yaw) * Math.cos(player.pitch);

        lasers.push({ x: player.x - 0.6, y: player.y, z: player.z, dx: dirX * 2.2, dy: dirY * 2.2, dz: dirZ * 2.2, life: 60 });
        lasers.push({ x: player.x + 0.6, y: player.y, z: player.z, dx: dirX * 2.2, dy: dirY * 2.2, dz: dirZ * 2.2, life: 60 });
      }

      win.querySelector('#sf-fire-btn').onclick = firePlayerLaser;
      window.addEventListener('keydown', function(e) {
        if (e.code === 'Space') firePlayerLaser();
      });

      win.querySelector('#sf-start-btn').onclick = function() {
        win.querySelector('#sf-overlay').style.display = 'none';
        isPlaying = true;
        spawnWave(wave);
      };

      // Loop
      function loop() {
        if (!win.isConnected) return;

        if (isPlaying) {
          var padState = touchPad.getState();
          player.yaw += padState.mx * 0.035;
          player.pitch = Math.max(-1.1, Math.min(1.1, player.pitch - padState.my * 0.035));

          var speed = 0.6;
          var forwardX = Math.sin(player.yaw) * Math.cos(player.pitch);
          var forwardY = Math.sin(player.pitch);
          var forwardZ = -Math.cos(player.yaw) * Math.cos(player.pitch);

          player.x += forwardX * speed;
          player.y += forwardY * speed;
          player.z += forwardZ * speed;

          // Shield Regen
          if (player.shield < 100) player.shield = Math.min(100, player.shield + 0.05);

          // Update Lasers
          for (var l = lasers.length - 1; l >= 0; l--) {
            var lsr = lasers[l];
            lsr.x += lsr.dx; lsr.y += lsr.dy; lsr.z += lsr.dz;
            lsr.life--;

            // Hit test vs enemies
            for (var e = enemies.length - 1; e >= 0; e--) {
              var en = enemies[e];
              if (Math.hypot(lsr.x - en.x, lsr.y - en.y, lsr.z - en.z) < 2.5) {
                en.hp -= 20;
                lsr.life = 0;
                if (en.hp <= 0) {
                  enemies.splice(e, 1);
                  kills++;
                  win.querySelector('#sf-kills').textContent = kills;
                  if (enemies.length === 0) {
                    wave++;
                    win.querySelector('#sf-wave').textContent = wave;
                    spawnWave(wave);
                  }
                }
                break;
              }
            }

            if (lsr.life <= 0) lasers.splice(l, 1);
          }

          // Enemy AI
          for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            var edx = player.x - enemy.x, edy = player.y - enemy.y, edz = player.z - enemy.z;
            var elen = Math.hypot(edx, edy, edz) || 1;
            enemy.x += (edx / elen) * 0.3;
            enemy.y += (edy / elen) * 0.3;
            enemy.z += (edz / elen) * 0.3;

            enemy.cooldown--;
            if (enemy.cooldown <= 0 && elen < 70) {
              enemy.cooldown = 90;
              enemyLasers.push({
                x: enemy.x, y: enemy.y, z: enemy.z,
                dx: (edx / elen) * 1.5, dy: (edy / elen) * 1.5, dz: (edz / elen) * 1.5,
                life: 70
              });
            }
          }

          // Enemy Lasers Update
          for (var el = enemyLasers.length - 1; el >= 0; el--) {
            var elsr = enemyLasers[el];
            elsr.x += elsr.dx; elsr.y += elsr.dy; elsr.z += elsr.dz;
            elsr.life--;
            if (Math.hypot(elsr.x - player.x, elsr.y - player.y, elsr.z - player.z) < 2.0) {
              elsr.life = 0;
              if (player.shield > 0) player.shield -= 15;
              else player.hull -= 15;

              if (player.hull <= 0) {
                isPlaying = false;
                MWO.notif.show('Star Fighter 3D', 'Game Over! Kills: ' + kills);
                saveHighScore('starfighter_kills', kills, false);
                win.querySelector('#sf-overlay').style.display = 'flex';
                win.querySelector('#sf-overlay').innerHTML =
                  '<h1 style="color:#e94560;">DEFEATED! X</h1>' +
                  '<p>Total Kills: ' + kills + ' | Wave: ' + wave + '</p>' +
                  '<button class="mw-btn primary mw-restart" data-app="starfighter3d">Restart</button>';
              }
            }
            if (elsr.life <= 0) enemyLasers.splice(el, 1);
          }

          win.querySelector('#sf-shield-bar').style.width = Math.max(0, player.shield) + '%';
          win.querySelector('#sf-hull-bar').style.width = Math.max(0, player.hull) + '%';
        }

        // Render 3D
        scene.clear();

        // Player Ship
        var mPlayer = G3D.mat4.fromTRS(G3D.mat4.create(), [player.x, player.y, player.z], player.yaw, [1,1,1]);
        scene.add(playerShipMesh, mPlayer);

        // Enemies
        for (var k = 0; k < enemies.length; k++) {
          var enm = enemies[k];
          var mEnemy = G3D.mat4.fromTRS(G3D.mat4.create(), [enm.x, enm.y, enm.z], 0, [1,1,1]);
          scene.add(enemyShipMesh, mEnemy);
        }

        // Asteroids
        for (var ast = 0; ast < asteroids.length; ast++) {
          var aObj = asteroids[ast];
          var mAst = G3D.mat4.fromTRS(G3D.mat4.create(), [aObj.x, aObj.y, aObj.z], aObj.rotY, [1,1,1]);
          scene.add(asteroidMesh, mAst);
        }

        // Lasers
        for (var l = 0; l < lasers.length; l++) {
          var mLsr = G3D.mat4.fromTRS(G3D.mat4.create(), [lasers[l].x, lasers[l].y, lasers[l].z], 0, [1,1,1]);
          scene.add(laserMesh, mLsr);
        }
        for (var el = 0; el < enemyLasers.length; el++) {
          var mELsr = G3D.mat4.fromTRS(G3D.mat4.create(), [enemyLasers[el].x, enemyLasers[el].y, enemyLasers[el].z], 0, [1,1,1]);
          scene.add(enemyLaserMesh, mELsr);
        }

        var camEye = [
          player.x - Math.sin(player.yaw) * 7,
          player.y + 2.5,
          player.z + Math.cos(player.yaw) * 7
        ];
        scene.setCamera(65, camEye, [player.x, player.y, player.z]);
        scene.render();

        requestAnimationFrame(loop);
      }

      requestAnimationFrame(loop);
    }
  });


  // =========================================================================
 // 5. GAME 3: Crimson Depths (WebGL First-Person Dungeon Shooter)
  // =========================================================================

  MWO.registerApp({
    id: 'crimsondepths',
    name: 'Crimson Depths 3D',
    description: 'First-person dungeon crawler shooter with 16x16 maze, DDA raycasting & minimap',
    icon: 'crimson',
    category: 'game',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({
        id: 'crimson-' + Date.now(),
 title: 'Crimson Depths 3D ',
        icon: 'crimson-depths-3d',
        width: 640,
        height: 480,
        resizable: true
      });

      win.innerHTML =
        '<div style="position:relative;width:100%;height:100%;background:#050205;overflow:hidden;font-family:sans-serif;user-select:none;">' +
          '<canvas id="cd-canvas" style="width:100%;height:100%;display:block;touch-action:none;"></canvas>' +
          '<canvas id="cd-minimap" width="90" height="90" style="position:absolute;top:10px;right:10px;border:2px solid rgba(255,255,255,0.2);border-radius:6px;background:rgba(0,0,0,0.7);pointer-events:none;"></canvas>' +
          '<div style="position:absolute;top:10px;left:10px;pointer-events:none;color:#fff;font-size:0.85em;font-weight:700;">' +
            '<div>HEALTH: <span id="cd-hp" style="color:#e94560;">100</span></div>' +
            '<div>AMMO: <span id="cd-ammo" style="color:#f1c40f;">20</span></div>' +
            '<div>FLOOR: <span id="cd-floor" style="color:#3498db;">1/5</span></div>' +
          '</div>' +
          '<div style="position:absolute;bottom:12px;right:12px;display:flex;gap:8px;pointer-events:auto;">' +
            '<button id="cd-btn-weapon" class="mw-btn" style="width:50px;height:50px;font-size:0.75em;background:rgba(255,255,255,0.15);border-radius:50%;color:#fff;font-weight:700;">GUN/XBOW</button>' +
 '<button id="cd-btn-fire" class="mw-btn" style="width:60px;height:60px;font-size:1.1em;background:rgba(233,69,96,0.7);border-radius:50%;color:#fff;font-weight:700;">SHOOT </button>' +
          '</div>' +
          '<div id="cd-overlay" style="position:absolute;inset:0;background:rgba(5,2,5,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:10;">' +
            '<h1 style="font-size:2.2em;color:#e94560;margin-bottom:6px;">Crimson Depths</h1>' +
            '<p style="color:#aaa;font-size:0.85em;margin-bottom:16px;">Escape 5 Floors of Crawlers & Spitters. Look: Touch Drag | Move: Joystick/WASD</p>' +
 '<button id="cd-start-btn" class="mw-btn primary" style="padding:12px 28px;font-size:1.1em;border-radius:8px;">Enter Dungeon </button>' +
          '</div>' +
        '</div>';

      var canvas = win.querySelector('#cd-canvas');
      var miniCanvas = win.querySelector('#cd-minimap');
      var miniCtx = miniCanvas.getContext('2d');

      var scene = G3D.Scene(canvas);
      scene.setClearColor(0.04, 0.02, 0.04);
      scene.setLightDir([0.3, 1.0, 0.4]);

      var touchPad = G3D.TouchPad(canvas);

      // --- Maze Generator (16x16 Backtracker) ---
      var GRID_SZ = 16;
      var maze = [];
      for (var r = 0; r < GRID_SZ; r++) {
        maze[r] = [];
        for (var c = 0; c < GRID_SZ; c++) maze[r][c] = 1; // 1 = wall, 0 = path
      }

      function generateMaze() {
        for (var r = 0; r < GRID_SZ; r++) {
          for (var c = 0; c < GRID_SZ; c++) maze[r][c] = 1;
        }
        function carve(x, y) {
          maze[y][x] = 0;
          var dirs = [[0,-2],[0,2],[-2,0],[2,0]].sort(function() { return Math.random() - 0.5; });
          for (var i = 0; i < dirs.length; i++) {
            var nx = x + dirs[i][0], ny = y + dirs[i][1];
            if (nx > 0 && nx < GRID_SZ-1 && ny > 0 && ny < GRID_SZ-1 && maze[ny][nx] === 1) {
              maze[y + dirs[i][1]/2][x + dirs[i][0]/2] = 0;
              carve(nx, ny);
            }
          }
        }
        carve(1, 1);
        maze[GRID_SZ-2][GRID_SZ-2] = 0; // Exit
      }

      generateMaze();

      // --- Build Optimized Dungeon Meshes ---
      var wallMesh = G3D.Mesh.box(2.0, 2.5, 2.0, [0.4, 0.15, 0.15]);
      var floorMesh = G3D.Mesh.planeXZ(32, 32, [0.15, 0.12, 0.15]);
      var crawlerMesh = G3D.Mesh.sphere(0.6, [0.8, 0.1, 0.1], 5, 6);
      var spitterMesh = G3D.Mesh.cone(0.7, 1.4, [0.1, 0.7, 0.2], 6);
      var keyMesh = G3D.Mesh.box(0.3, 0.3, 0.3, [0.95, 0.8, 0.1]);

      var player = { x: 3.0, z: 3.0, yaw: 0, pitch: 0, hp: 100, ammo: 20, floor: 1, weapon: 'pistol', hasKey: false };
      var enemies = [];
      var keyPos = { x: 27.0, z: 27.0, collected: false };
      var isPlaying = false;

      function spawnFloorEnemies(flr) {
        enemies = [];
        for (var i = 0; i < 4 + flr * 2; i++) {
          var ex = Math.floor(Math.random() * (GRID_SZ - 2)) + 1;
          var ez = Math.floor(Math.random() * (GRID_SZ - 2)) + 1;
          if (maze[ez][ex] === 0 && (ex > 3 || ez > 3)) {
            enemies.push({
              x: ex * 2.0 + 1.0, z: ez * 2.0 + 1.0,
              type: i % 2 === 0 ? 'crawler' : 'spitter',
              hp: 40 + flr * 10
            });
          }
        }
      }

      function shoot() {
        if (!isPlaying) return;
        if (player.weapon === 'crossbow') {
          if (player.ammo <= 0) return;
          player.ammo--;
          win.querySelector('#cd-ammo').textContent = player.ammo;
        }

        // Raycast hitscan vs enemies
        var dirX = Math.sin(player.yaw);
        var dirZ = -Math.cos(player.yaw);
        var dmg = player.weapon === 'crossbow' ? 75 : 30;

        for (var e = enemies.length - 1; e >= 0; e--) {
          var en = enemies[e];
          var edx = en.x - player.x, edz = en.z - player.z;
          var dot = edx * dirX + edz * dirZ;
          if (dot > 0 && dot < 12) {
            var perpDist = Math.hypot(edx - dirX * dot, edz - dirZ * dot);
            if (perpDist < 1.0) {
              en.hp -= dmg;
              if (en.hp <= 0) enemies.splice(e, 1);
              break;
            }
          }
        }
      }

      win.querySelector('#cd-btn-fire').onclick = shoot;
      win.querySelector('#cd-btn-weapon').onclick = function() {
        player.weapon = player.weapon === 'pistol' ? 'crossbow' : 'pistol';
        MWO.notif.show('Crimson Depths', 'Weapon: ' + player.weapon.toUpperCase());
      };

      win.querySelector('#cd-start-btn').onclick = function() {
        win.querySelector('#cd-overlay').style.display = 'none';
        isPlaying = true;
        spawnFloorEnemies(player.floor);
      };

      // Game Loop
      function loop() {
        if (!win.isConnected) return;

        if (isPlaying) {
          var padState = touchPad.getState();
          player.yaw += padState.lookX * 0.5;
          player.pitch = Math.max(-0.8, Math.min(0.8, player.pitch - padState.lookY * 0.5));
          touchPad.resetLook();

          var moveSpeed = 0.08;
          var forwardX = Math.sin(player.yaw) * moveSpeed;
          var forwardZ = -Math.cos(player.yaw) * moveSpeed;
          var sideX = Math.cos(player.yaw) * moveSpeed;
          var sideZ = Math.sin(player.yaw) * moveSpeed;

          var nextX = player.x + (forwardX * (-padState.my) + sideX * padState.mx);
          var nextZ = player.z + (forwardZ * (-padState.my) + sideZ * padState.mx);

          // Grid Wall Collision Check
          var gridX = Math.floor(nextX / 2.0);
          var gridZ = Math.floor(nextZ / 2.0);
          if (gridX >= 0 && gridX < GRID_SZ && gridZ >= 0 && gridZ < GRID_SZ) {
            if (maze[gridZ][gridX] === 0) {
              player.x = nextX;
              player.z = nextZ;
            }
          }

          // Enemy AI
          for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            var dist = Math.hypot(player.x - enemy.x, player.z - enemy.z);
            if (dist < 8.0) {
              enemy.x += ((player.x - enemy.x) / dist) * 0.03;
              enemy.z += ((player.z - enemy.z) / dist) * 0.03;
              if (dist < 1.0) {
                player.hp -= 0.5;
                win.querySelector('#cd-hp').textContent = Math.max(0, Math.floor(player.hp));
                if (player.hp <= 0) {
                  isPlaying = false;
                  MWO.notif.show('Crimson Depths', 'Died on Floor ' + player.floor);
                  saveHighScore('crimson_max_floor', player.floor, false);
                  win.querySelector('#cd-overlay').style.display = 'flex';
                  win.querySelector('#cd-overlay').innerHTML =
 '<h1 style="color:#e94560;">YOU DIED! </h1>' +
                    '<button class="mw-btn primary mw-restart" data-app="crimsondepths">Try Again</button>';
                }
              }
            }
          }

          // Key & Exit Check
          if (Math.hypot(player.x - keyPos.x, player.z - keyPos.z) < 1.5) {
            player.hasKey = true;
            MWO.notif.show('Crimson Depths', 'Golden Key Collected! Find Exit.');
          }

          if (player.hasKey && player.x > (GRID_SZ-2)*2.0 && player.z > (GRID_SZ-2)*2.0) {
            player.floor++;
            if (player.floor > 5) {
              isPlaying = false;
              MWO.notif.show('Crimson Depths', 'VICTORY! Dungeon Cleared!');
              saveHighScore('crimson_max_floor', 5, false);
              win.querySelector('#cd-overlay').style.display = 'flex';
              win.querySelector('#cd-overlay').innerHTML =
                '<h1 style="color:#2ecc71;">DUNGEON ESCAPED! WIN</h1>' +
                '<button class="mw-btn primary mw-restart" data-app="crimsondepths">Main Menu</button>';
            } else {
              win.querySelector('#cd-floor').textContent = player.floor + '/5';
              player.x = 3.0; player.z = 3.0; player.hasKey = false;
              generateMaze();
              spawnFloorEnemies(player.floor);
            }
          }

          // Minimap Render
          miniCtx.fillStyle = '#000';
          miniCtx.fillRect(0, 0, 90, 90);
          var cellW = 90 / GRID_SZ;
          for (var r = 0; r < GRID_SZ; r++) {
            for (var c = 0; c < GRID_SZ; c++) {
              if (maze[r][c] === 1) {
                miniCtx.fillStyle = '#442222';
                miniCtx.fillRect(c * cellW, r * cellW, cellW, cellW);
              }
            }
          }
          // Player dot on minimap
          miniCtx.fillStyle = '#2ecc71';
          miniCtx.beginPath();
          miniCtx.arc((player.x/2.0)*cellW, (player.z/2.0)*cellW, 3, 0, Math.PI*2);
          miniCtx.fill();
        }

        // Render 3D Scene
        scene.clear();
        scene.add(floorMesh, G3D.mat4.fromTRS(G3D.mat4.create(), [16, 0, 16], 0, [1,1,1]));

        for (var r = 0; r < GRID_SZ; r++) {
          for (var c = 0; c < GRID_SZ; c++) {
            if (maze[r][c] === 1) {
              var mWall = G3D.mat4.fromTRS(G3D.mat4.create(), [c*2.0 + 1.0, 1.25, r*2.0 + 1.0], 0, [1,1,1]);
              scene.add(wallMesh, mWall);
            }
          }
        }

        for (var e = 0; e < enemies.length; e++) {
          var enObj = enemies[e];
          var mEn = G3D.mat4.fromTRS(G3D.mat4.create(), [enObj.x, 0.6, enObj.z], 0, [1,1,1]);
          scene.add(enObj.type === 'crawler' ? crawlerMesh : spitterMesh, mEn);
        }

        scene.setCamera(65, [player.x, 1.3, player.z], [
          player.x + Math.sin(player.yaw),
          1.3 + Math.sin(player.pitch),
          player.z - Math.cos(player.yaw)
        ]);
        scene.render();

        requestAnimationFrame(loop);
      }

      requestAnimationFrame(loop);
    }
  });


  // =========================================================================
  // 6. GAME 4: Siege Defense 3D  (WebGL Tower Defense)
  // =========================================================================

  MWO.registerApp({
    id: 'siegedefense3d',
    name: 'Siege Defense 3D',
    description: '3D WebGL tower defense strategy with Goblins, Orcs, Trolls & Castle',
    icon: 'siege-defense-3d',
    category: 'game',
    installed: false,
    launch: function() {
      var win = MWO.wm.create({
        id: 'siegedefense-' + Date.now(),
        title: 'Siege Defense 3D ',
        icon: 'siege-defense-3d',
        width: 640,
        height: 480,
        resizable: true
      });

      win.innerHTML =
        '<div style="position:relative;width:100%;height:100%;background:#0a120a;overflow:hidden;font-family:sans-serif;user-select:none;">' +
          '<canvas id="sd-canvas" style="width:100%;height:100%;display:block;touch-action:none;"></canvas>' +
          '<div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none;color:#fff;font-size:0.85em;font-weight:700;">' +
            '<div>GOLD: $<span id="sd-gold" style="color:#f1c40f;">150</span></div>' +
            '<div>CASTLE HP: <span id="sd-castle-hp" style="color:#e94560;">100</span></div>' +
            '<div>WAVE: <span id="sd-wave" style="color:#3498db;">1/15</span></div>' +
          '</div>' +
          '<div id="sd-tower-menu" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:8px;background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:10px;pointer-events:auto;">' +
            '<button id="sd-btn-archer" class="mw-btn" style="font-size:0.8em;padding:6px 12px;">Bow Archer (50g)</button>' +
            '<button id="sd-btn-cannon" class="mw-btn" style="font-size:0.8em;padding:6px 12px;">■ Cannon (100g)</button>' +
 '<button id="sd-btn-frost" class="mw-btn" style="font-size:0.8em;padding:6px 12px;"> Frost (75g)</button>' +
          '</div>' +
          '<div id="sd-overlay" style="position:absolute;inset:0;background:rgba(10,18,10,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;z-index:10;">' +
            '<h1 style="font-size:2.2em;color:#f1c40f;margin-bottom:6px;">Siege Defense 3D</h1>' +
            '<p style="color:#aaa;font-size:0.85em;margin-bottom:16px;">Protect the Castle! Tap grid cells to place defense towers.</p>' +
            '<button id="sd-start-btn" class="mw-btn primary" style="padding:12px 28px;font-size:1.1em;border-radius:8px;">Start Defense </button>' +
          '</div>' +
        '</div>';

      var canvas = win.querySelector('#sd-canvas');
      var scene = G3D.Scene(canvas);
      scene.setClearColor(0.08, 0.16, 0.08);
      scene.setLightDir([0.5, 1.0, 0.6]);

      // --- Map & Path ---
      var mapPath = [
        {x: 0, z: 2}, {x: 8, z: 2}, {x: 8, z: 6},
        {x: 2, z: 6}, {x: 2, z: 10}, {x: 10, z: 10}
      ];

      var groundMesh = G3D.Mesh.planeXZ(24, 24, [0.18, 0.48, 0.18]);
      var pathMesh = G3D.Mesh.box(1.8, 0.05, 1.8, [0.7, 0.6, 0.4]);
      var castleMesh = G3D.Mesh.box(2.5, 3.0, 2.5, [0.5, 0.5, 0.55]);

      var archerTowerMesh = G3D.Mesh.cylinder(0.6, 0.6, 2.2, [0.2, 0.7, 0.2], 8);
      var cannonTowerMesh = G3D.Mesh.cylinder(0.7, 0.7, 2.0, [0.7, 0.2, 0.2], 8);
      var frostTowerMesh = G3D.Mesh.cylinder(0.6, 0.6, 2.2, [0.2, 0.7, 0.9], 8);

      var goblinMesh = G3D.Mesh.box(0.6, 0.6, 0.6, [0.1, 0.8, 0.2]);
      var orcMesh = G3D.Mesh.box(0.9, 0.9, 0.9, [0.6, 0.4, 0.1]);
      var trollMesh = G3D.Mesh.box(1.4, 1.4, 1.4, [0.3, 0.2, 0.7]);

      var gold = 150, castleHp = 100, wave = 1;
      var towers = [];
      var enemies = [];
      var selectedTowerType = 'archer';
      var isPlaying = false;

      win.querySelector('#sd-btn-archer').onclick = function() { selectedTowerType = 'archer'; };
      win.querySelector('#sd-btn-cannon').onclick = function() { selectedTowerType = 'cannon'; };
      win.querySelector('#sd-btn-frost').onclick = function() { selectedTowerType = 'frost'; };

      canvas.addEventListener('click', function(e) {
        if (!isPlaying) return;
        var rect = canvas.getBoundingClientRect();
        var clickX = (e.clientX - rect.left) / rect.width;
        var clickZ = (e.clientY - rect.top) / rect.height;

        // Map screen to ground coordinates
        var gx = Math.floor((clickX - 0.1) * 12);
        var gz = Math.floor((clickZ - 0.1) * 12);

        var cost = selectedTowerType === 'archer' ? 50 : (selectedTowerType === 'cannon' ? 100 : 75);
        if (gold >= cost && gx >= 0 && gx < 11 && gz >= 0 && gz < 11) {
          gold -= cost;
          win.querySelector('#sd-gold').textContent = gold;
          towers.push({ x: gx * 2.0 - 10.0, z: gz * 2.0 - 10.0, type: selectedTowerType, cooldown: 0 });
        }
      });

      function spawnWaveEnemies(w) {
        enemies = [];
        var numEnemies = 5 + w * 3;
        for (var i = 0; i < numEnemies; i++) {
          var type = i % 8 === 0 ? 'troll' : (i % 3 === 0 ? 'orc' : 'goblin');
          enemies.push({
            type: type,
            hp: type === 'troll' ? 600 : (type === 'orc' ? 120 : 40),
            speed: type === 'troll' ? 0.02 : (type === 'orc' ? 0.035 : 0.06),
            pathIdx: 0,
            x: mapPath[0].x * 2.0 - 10.0,
            z: mapPath[0].z * 2.0 - 10.0,
            delay: i * 35
          });
        }
      }

      win.querySelector('#sd-start-btn').onclick = function() {
        win.querySelector('#sd-overlay').style.display = 'none';
        isPlaying = true;
        spawnWaveEnemies(wave);
      };

      // Loop
      function loop() {
        if (!win.isConnected) return;

        if (isPlaying) {
          // Update Enemies
          for (var e = enemies.length - 1; e >= 0; e--) {
            var en = enemies[e];
            if (en.delay > 0) { en.delay--; continue; }

            var targetWP = mapPath[en.pathIdx + 1];
            if (!targetWP) {
              castleHp -= en.type === 'troll' ? 30 : 10;
              win.querySelector('#sd-castle-hp').textContent = Math.max(0, castleHp);
              enemies.splice(e, 1);

              if (castleHp <= 0) {
                isPlaying = false;
                MWO.notif.show('Siege Defense 3D', 'Castle Destroyed!');
                saveHighScore('siegedefense_max_wave', wave, false);
                win.querySelector('#sd-overlay').style.display = 'flex';
                win.querySelector('#sd-overlay').innerHTML =
                  '<h1 style="color:#e94560;">CASTLE FELL! X</h1>' +
                  '<button class="mw-btn primary mw-restart" data-app="siegedefense3d">Try Again</button>';
              }
              continue;
            }

            var tx = targetWP.x * 2.0 - 10.0, tz = targetWP.z * 2.0 - 10.0;
            var dx = tx - en.x, dz = tz - en.z;
            var dist = Math.hypot(dx, dz);

            if (dist < 0.2) {
              en.pathIdx++;
            } else {
              en.x += (dx / dist) * en.speed;
              en.z += (dz / dist) * en.speed;
            }
          }

          // Update Towers
          for (var t = 0; t < towers.length; t++) {
            var twr = towers[t];
            twr.cooldown--;
            if (twr.cooldown <= 0) {
              for (var k = 0; k < enemies.length; k++) {
                var targetEn = enemies[k];
                if (targetEn.delay > 0) continue;
                if (Math.hypot(targetEn.x - twr.x, targetEn.z - twr.z) < 6.0) {
                  twr.cooldown = twr.type === 'cannon' ? 50 : 25;
                  targetEn.hp -= twr.type === 'cannon' ? 50 : 20;

                  if (targetEn.hp <= 0) {
                    gold += targetEn.type === 'troll' ? 100 : 15;
                    win.querySelector('#sd-gold').textContent = gold;
                    enemies.splice(k, 1);
                  }
                  break;
                }
              }
            }
          }

          // Check Wave End
          if (enemies.length === 0) {
            wave++;
            if (wave > 15) {
              isPlaying = false;
              MWO.notif.show('Siege Defense 3D', 'VICTORY! All 15 Waves Defeated!');
              saveHighScore('siegedefense_max_wave', 15, false);
              win.querySelector('#sd-overlay').style.display = 'flex';
              win.querySelector('#sd-overlay').innerHTML =
                '<h1 style="color:#2ecc71;">VICTORY! WIN</h1>' +
                '<button class="mw-btn primary mw-restart" data-app="siegedefense3d">Play Again</button>';
            } else {
              win.querySelector('#sd-wave').textContent = wave + '/15';
              spawnWaveEnemies(wave);
            }
          }
        }

        // Render 3D Scene
        scene.clear();
        scene.add(groundMesh, G3D.mat4.fromTRS(G3D.mat4.create(), [0, 0, 0], 0, [1,1,1]));

        // Render Path
        for (var p = 0; p < mapPath.length - 1; p++) {
          var wp1 = mapPath[p], wp2 = mapPath[p+1];
          var mPath = G3D.mat4.fromTRS(G3D.mat4.create(), [wp1.x*2.0 - 10.0, 0.05, wp1.z*2.0 - 10.0], 0, [1,1,1]);
          scene.add(pathMesh, mPath);
        }

        // Castle
        var endWP = mapPath[mapPath.length - 1];
        scene.add(castleMesh, G3D.mat4.fromTRS(G3D.mat4.create(), [endWP.x*2.0 - 10.0, 1.5, endWP.z*2.0 - 10.0], 0, [1,1,1]));

        // Towers
        for (var tw = 0; tw < towers.length; tw++) {
          var twrObj = towers[tw];
          var mTwr = G3D.mat4.fromTRS(G3D.mat4.create(), [twrObj.x, 1.0, twrObj.z], 0, [1,1,1]);
          var meshToUse = twrObj.type === 'archer' ? archerTowerMesh : (twrObj.type === 'cannon' ? cannonTowerMesh : frostTowerMesh);
          scene.add(meshToUse, mTwr);
        }

        // Enemies
        for (var enm = 0; enm < enemies.length; enm++) {
          var enemyObj = enemies[enm];
          if (enemyObj.delay > 0) continue;
          var mEnm = G3D.mat4.fromTRS(G3D.mat4.create(), [enemyObj.x, 0.5, enemyObj.z], 0, [1,1,1]);
          var eMesh = enemyObj.type === 'troll' ? trollMesh : (enemyObj.type === 'orc' ? orcMesh : goblinMesh);
          scene.add(eMesh, mEnm);
        }

        scene.setCamera(55, [0, 18, 16], [0, 0, 0]);
        scene.render();

        requestAnimationFrame(loop);
      }

      requestAnimationFrame(loop);
    }
  });

})();

/* Death/finish screens restart the GAME, not the whole OS.
   (location.reload used to wipe the session and force a re-login.) */
document.addEventListener('click', function(e) {
  var t = e.target;
  while (t && t !== document.body && !(t.classList && t.classList.contains('mw-restart'))) t = t.parentElement;
  if (!t || !t.classList || !t.classList.contains('mw-restart')) return;
  var appId = t.getAttribute('data-app');
  var winEl = t.closest ? t.closest('.window') : null;
  if (winEl && winEl.id) { try { MWO.wm.close(winEl.id); } catch (err) {} }
  if (appId && MWO.apps[appId]) MWO.launchApp(appId);
});
