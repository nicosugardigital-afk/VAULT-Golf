/* ============================================================
   VAULT — Beams background (Vanilla Three.js)
   Custom ShaderMaterial — no PBR extension needed.
   Canvas placed after .bg-metal and uses mix-blend-mode:screen
   so black pixels are transparent and bright beams glow over
   the metal background.
   ============================================================ */
(function () {
  'use strict';

  var BEAM_WIDTH      = 2;
  var BEAM_HEIGHT     = 15;
  var BEAM_NUMBER     = 12;
  var SPEED           = 0.9;
  var NOISE_INTENSITY = 1.75;
  var SCALE           = 0.2;
  var ROTATION_DEG    = -15;

  /* ── GLSL snippets ─────────────────────────────────────────── */
  var NOISE_GLSL = [
    'vec4 p4(vec4 x){return mod(((x*34.)+1.)*x,289.);}',
    'vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'vec3 fd(vec3 t){return t*t*t*(t*(t*6.-15.)+10.);}',
    'float cnoise(vec3 P){',
    ' vec3 i0=floor(P),i1=i0+1.;',
    ' i0=mod(i0,289.);i1=mod(i1,289.);',
    ' vec3 f0=fract(P),f1=f0-1.;',
    ' vec4 ix=vec4(i0.x,i1.x,i0.x,i1.x);',
    ' vec4 iy=vec4(i0.yy,i1.yy);',
    ' vec4 iz0=i0.zzzz,iz1=i1.zzzz;',
    ' vec4 ixy=p4(p4(ix)+iy);',
    ' vec4 ixy0=p4(ixy+iz0),ixy1=p4(ixy+iz1);',
    ' vec4 gx0=ixy0/7.,gy0=fract(floor(gx0)/7.)-.5;gx0=fract(gx0);',
    ' vec4 gz0=vec4(.5)-abs(gx0)-abs(gy0);',
    ' vec4 sz0=step(gz0,vec4(0.));',
    ' gx0-=sz0*(step(0.,gx0)-.5);gy0-=sz0*(step(0.,gy0)-.5);',
    ' vec4 gx1=ixy1/7.,gy1=fract(floor(gx1)/7.)-.5;gx1=fract(gx1);',
    ' vec4 gz1=vec4(.5)-abs(gx1)-abs(gy1);',
    ' vec4 sz1=step(gz1,vec4(0.));',
    ' gx1-=sz1*(step(0.,gx1)-.5);gy1-=sz1*(step(0.,gy1)-.5);',
    ' vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y);',
    ' vec3 g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);',
    ' vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y);',
    ' vec3 g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);',
    ' vec4 n0=tis(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));',
    ' g000*=n0.x;g010*=n0.y;g100*=n0.z;g110*=n0.w;',
    ' vec4 n1=tis(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));',
    ' g001*=n1.x;g011*=n1.y;g101*=n1.z;g111*=n1.w;',
    ' float n000=dot(g000,f0),n100=dot(g100,vec3(f1.x,f0.yz));',
    ' float n010=dot(g010,vec3(f0.x,f1.y,f0.z)),n110=dot(g110,vec3(f1.xy,f0.z));',
    ' float n001=dot(g001,vec3(f0.xy,f1.z)),n101=dot(g101,vec3(f1.x,f0.y,f1.z));',
    ' float n011=dot(g011,vec3(f0.x,f1.yz)),n111=dot(g111,f1);',
    ' vec3 fxyz=fd(f0);',
    ' vec4 nz=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fxyz.z);',
    ' vec2 nyz=mix(nz.xy,nz.zw,fxyz.y);',
    ' return 2.2*mix(nyz.x,nyz.y,fxyz.x);',
    '}'
  ].join('\n');

  var VERT = [
    'uniform float time;',
    'uniform float uSpeed;',
    'uniform float uScale;',
    'varying float vLight;',
    NOISE_GLSL,
    'float disp(vec3 p, vec2 uvCoord){',
    '  return cnoise(vec3(p.x*0.,p.y-uvCoord.y,p.z+time*uSpeed*3.)*uScale);',
    '}',
    'void main(){',
    '  vec3 pos=position;',
    '  pos.z+=disp(pos,uv);',
    '  vec3 px=position+vec3(.01,0.,0.); px.z+=disp(px,uv);',
    '  vec3 py=position+vec3(0.,-.01,0.); py.z+=disp(py,uv);',
    '  vec3 tX=normalize(px-pos);',
    '  vec3 tY=normalize(py-pos);',
    '  vec3 norm=normalize(cross(tY,tX));',
    '  vec3 ld=normalize(vec3(0.,3.,10.));',
    '  vLight=max(dot(norm,ld),0.);',
    '  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform float uNoiseIntensity;',
    'varying float vLight;',
    'float rnd(vec2 s){return fract(sin(dot(s,vec2(12.9898,78.233)))*43758.5453);}',
    'float grain(vec2 s){',
    '  vec2 i=floor(s),f=fract(s);',
    '  float a=rnd(i),b=rnd(i+vec2(1.,0.)),c=rnd(i+vec2(0.,1.)),d=rnd(i+vec2(1.,1.));',
    '  vec2 u=f*f*(3.-2.*f);',
    '  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;',
    '}',
    'void main(){',
    '  float b=pow(vLight,0.7)-grain(gl_FragCoord.xy)/15.*uNoiseIntensity;',
    '  gl_FragColor=vec4(vec3(clamp(b,0.,1.)),1.);',
    '}'
  ].join('\n');

  /* ── Geometry ──────────────────────────────────────────────── */
  function createGeometry(n, w, h, spacing, hSeg) {
    var geo    = new THREE.BufferGeometry();
    var nV     = n * (hSeg + 1) * 2;
    var nF     = n * hSeg * 2;
    var pos    = new Float32Array(nV * 3);
    var idx    = new Uint32Array(nF * 3);
    var uvs    = new Float32Array(nV * 2);
    var vO=0, iO=0, uO=0;
    var totalW = n * w + (n - 1) * spacing;
    var xBase  = -totalW / 2;
    for (var i = 0; i < n; i++) {
      var xOff = xBase + i * (w + spacing);
      var ux   = Math.random() * 300;
      var uy   = Math.random() * 300;
      for (var j = 0; j <= hSeg; j++) {
        var y = h * (j / hSeg - 0.5);
        pos.set([xOff, y, 0, xOff + w, y, 0], vO * 3);
        var uvj = j / hSeg;
        uvs.set([ux, uvj + uy, ux + 1, uvj + uy], uO);
        if (j < hSeg) {
          var a=vO, b=vO+1, c=vO+2, d=vO+3;
          idx.set([a,b,c,c,b,d], iO);
          iO += 6;
        }
        vO += 2; uO += 4;
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    return geo;
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function initBeams() {
    if (typeof THREE === 'undefined') {
      console.warn('[VAULT Beams] THREE not found.');
      return;
    }

    var bgLayer = document.querySelector('.bg-layer');
    if (!bgLayer) return;

    /* Insert canvas as FIRST child — behind all background overlays.
       The semi-transparent bg-metal gradient sits on top as shadow. */
    var canvas  = document.createElement('canvas');
    canvas.className = 'beams-canvas';
    bgLayer.insertBefore(canvas, bgLayer.firstChild);

    var w = window.innerWidth, h = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);

    var scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    var camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 0, 20);

    var material = new THREE.ShaderMaterial({
      uniforms: {
        time:           { value: 0 },
        uSpeed:         { value: SPEED },
        uScale:         { value: SCALE },
        uNoiseIntensity:{ value: NOISE_INTENSITY }
      },
      vertexShader:   VERT,
      fragmentShader: FRAG
    });

    var group = new THREE.Group();
    group.rotation.z = ROTATION_DEG * (Math.PI / 180);
    group.add(new THREE.Mesh(createGeometry(BEAM_NUMBER, BEAM_WIDTH, BEAM_HEIGHT, 0, 100), material));
    scene.add(group);

    var then = performance.now() / 1000;
    function animate() {
      requestAnimationFrame(animate);
      var now = performance.now() / 1000;
      material.uniforms.time.value += 0.1 * (now - then);
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
