/* ============================================================
   VAULT — Beams background (Vanilla Three.js port)
   Original: @react-bits/Beams (React Three Fiber)
   ============================================================ */
(function () {
  'use strict';

  var BEAM_WIDTH      = 2;
  var BEAM_HEIGHT     = 18;
  var BEAM_NUMBER     = 12;
  var LIGHT_COLOR     = '#ffffff';
  var SPEED           = 1.8;
  var NOISE_INTENSITY = 2.5;
  var SCALE           = 0.2;
  var ROTATION_DEG    = -40;

  /* ── GLSL: 3D Perlin noise (vertex shader) ─────────────────── */
  var NOISE_3D_GLSL = [
    'vec4 permute4(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}',
    'vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'vec3 fade3(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}',
    'float cnoise(vec3 P){',
    '  vec3 Pi0=floor(P);vec3 Pi1=Pi0+vec3(1.0);',
    '  Pi0=mod(Pi0,289.0);Pi1=mod(Pi1,289.0);',
    '  vec3 Pf0=fract(P);vec3 Pf1=Pf0-vec3(1.0);',
    '  vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);',
    '  vec4 iy=vec4(Pi0.yy,Pi1.yy);',
    '  vec4 iz0=Pi0.zzzz;vec4 iz1=Pi1.zzzz;',
    '  vec4 ixy=permute4(permute4(ix)+iy);',
    '  vec4 ixy0=permute4(ixy+iz0);vec4 ixy1=permute4(ixy+iz1);',
    '  vec4 gx0=ixy0/7.0;',
    '  vec4 gy0=fract(floor(gx0)/7.0)-0.5;gx0=fract(gx0);',
    '  vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);',
    '  vec4 sz0=step(gz0,vec4(0.0));',
    '  gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);',
    '  vec4 gx1=ixy1/7.0;',
    '  vec4 gy1=fract(floor(gx1)/7.0)-0.5;gx1=fract(gx1);',
    '  vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);',
    '  vec4 sz1=step(gz1,vec4(0.0));',
    '  gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);',
    '  vec3 g000=vec3(gx0.x,gy0.x,gz0.x);vec3 g100=vec3(gx0.y,gy0.y,gz0.y);',
    '  vec3 g010=vec3(gx0.z,gy0.z,gz0.z);vec3 g110=vec3(gx0.w,gy0.w,gz0.w);',
    '  vec3 g001=vec3(gx1.x,gy1.x,gz1.x);vec3 g101=vec3(gx1.y,gy1.y,gz1.y);',
    '  vec3 g011=vec3(gx1.z,gy1.z,gz1.z);vec3 g111=vec3(gx1.w,gy1.w,gz1.w);',
    '  vec4 norm0=taylorInvSqrt4(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));',
    '  g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;',
    '  vec4 norm1=taylorInvSqrt4(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));',
    '  g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;',
    '  float n000=dot(g000,Pf0);float n100=dot(g100,vec3(Pf1.x,Pf0.yz));',
    '  float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));float n110=dot(g110,vec3(Pf1.xy,Pf0.z));',
    '  float n001=dot(g001,vec3(Pf0.xy,Pf1.z));float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));',
    '  float n011=dot(g011,vec3(Pf0.x,Pf1.yz));float n111=dot(g111,Pf1);',
    '  vec3 fade_xyz=fade3(Pf0);',
    '  vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);',
    '  vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);',
    '  return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);',
    '}'
  ].join('\n');

  var VERTEX_UNIFORMS_AND_HELPERS = [
    'uniform float time;',
    'uniform float uSpeed;',
    'uniform float uScale;',
    NOISE_3D_GLSL,
    'float getPos(vec3 pos){',
    '  vec3 noisePos=vec3(pos.x*0.0,pos.y-uv.y,pos.z+time*uSpeed*3.0)*uScale;',
    '  return cnoise(noisePos);',
    '}',
    'vec3 getCurrentPos(vec3 pos){',
    '  vec3 np=pos; np.z+=getPos(pos); return np;',
    '}',
    'vec3 getBeamNormal(vec3 pos){',
    '  vec3 cur=getCurrentPos(pos);',
    '  vec3 nx=getCurrentPos(pos+vec3(0.01,0.0,0.0));',
    '  vec3 nz=getCurrentPos(pos+vec3(0.0,-0.01,0.0));',
    '  return normalize(cross(normalize(nz-cur),normalize(nx-cur)));',
    '}'
  ].join('\n');

  /* ── GLSL: 2D noise (fragment grain) ──────────────────────── */
  var FRAG_UNIFORMS_AND_NOISE = [
    'uniform float uNoiseIntensity;',
    'float rnd2(in vec2 st){return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);}',
    'float noise2(in vec2 st){',
    '  vec2 i=floor(st);vec2 f=fract(st);',
    '  float a=rnd2(i);float b=rnd2(i+vec2(1.0,0.0));',
    '  float c=rnd2(i+vec2(0.0,1.0));float d=rnd2(i+vec2(1.0,1.0));',
    '  vec2 u=f*f*(3.0-2.0*f);',
    '  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;',
    '}'
  ].join('\n');

  /* ── Geometry (direct port of createStackedPlanesBufferGeometry) */
  function createGeometry(n, width, height, spacing, heightSegments) {
    var geo         = new THREE.BufferGeometry();
    var numVerts    = n * (heightSegments + 1) * 2;
    var numFaces    = n * heightSegments * 2;
    var positions   = new Float32Array(numVerts * 3);
    var indices     = new Uint32Array(numFaces * 3);
    var uvs         = new Float32Array(numVerts * 2);
    var vOff = 0, iOff = 0, uOff = 0;
    var totalW      = n * width + (n - 1) * spacing;
    var xBase       = -totalW / 2;

    for (var i = 0; i < n; i++) {
      var xOff  = xBase + i * (width + spacing);
      var uvX   = Math.random() * 300;
      var uvY   = Math.random() * 300;
      for (var j = 0; j <= heightSegments; j++) {
        var y = height * (j / heightSegments - 0.5);
        positions[vOff * 3]     = xOff;           positions[vOff * 3 + 1] = y; positions[vOff * 3 + 2] = 0;
        positions[(vOff+1)*3]   = xOff + width;   positions[(vOff+1)*3+1] = y; positions[(vOff+1)*3+2] = 0;
        var uvj = j / heightSegments;
        uvs[uOff]   = uvX;     uvs[uOff+1] = uvj + uvY;
        uvs[uOff+2] = uvX + 1; uvs[uOff+3] = uvj + uvY;
        if (j < heightSegments) {
          var a = vOff, b = vOff+1, c = vOff+2, d = vOff+3;
          indices[iOff] = a; indices[iOff+1] = b; indices[iOff+2] = c;
          indices[iOff+3] = c; indices[iOff+4] = b; indices[iOff+5] = d;
          iOff += 6;
        }
        vOff += 2; uOff += 4;
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    return geo;
  }

  /* ── Main init ─────────────────────────────────────────────── */
  function initBeams() {
    if (typeof THREE === 'undefined') {
      console.warn('[VAULT Beams] Three.js not loaded.');
      return;
    }

    var bgLayer = document.querySelector('.bg-layer');
    if (!bgLayer) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'beams-canvas';
    bgLayer.insertBefore(canvas, bgLayer.firstChild);

    var w = window.innerWidth, h = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    var camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 0, 20);

    scene.add(new THREE.AmbientLight(0xffffff, 1));
    var dirLight = new THREE.DirectionalLight(LIGHT_COLOR, 1);
    dirLight.position.set(0, 3, 10);
    scene.add(dirLight);

    var shaderUniforms = null;

    var material = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, metalness: 0.3 });

    material.onBeforeCompile = function (shader) {
      shader.uniforms.time            = { value: 0 };
      shader.uniforms.uSpeed          = { value: SPEED };
      shader.uniforms.uScale          = { value: SCALE };
      shader.uniforms.uNoiseIntensity = { value: NOISE_INTENSITY };
      if (shader.uniforms.envMapIntensity) shader.uniforms.envMapIntensity.value = 10;

      /* vertex */
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\n' + VERTEX_UNIFORMS_AND_HELPERS
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed.z += getPos(transformed.xyz);'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        'vec3 objectNormal = getBeamNormal(position.xyz);'
      );

      /* fragment */
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\n' + FRAG_UNIFORMS_AND_NOISE
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.rgb -= noise2(gl_FragCoord.xy) / 15.0 * uNoiseIntensity;'
      );

      shaderUniforms = shader.uniforms;
    };

    var geometry = createGeometry(BEAM_NUMBER, BEAM_WIDTH, BEAM_HEIGHT, 0, 100);
    var mesh     = new THREE.Mesh(geometry, material);
    var group    = new THREE.Group();
    group.rotation.z = ROTATION_DEG * (Math.PI / 180);
    group.add(mesh);
    scene.add(group);

    var then = performance.now() / 1000;
    function animate() {
      requestAnimationFrame(animate);
      var now = performance.now() / 1000;
      if (shaderUniforms) shaderUniforms.time.value += 0.1 * (now - then);
      then = now;
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', function () {
      var nw = window.innerWidth, nh = window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBeams);
  } else {
    initBeams();
  }
}());
