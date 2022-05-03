AFRAME.registerComponent("hide-in-ar-mode", {
    // Set this object invisible while in AR mode.
    // TODO: could this be replaced with bind="visible: !ar-mode"
    // with https://www.npmjs.com/package/aframe-state-component ?
    init: function() {
      this.el.sceneEl.addEventListener("enter-vr", ev => {
        if (this.el.sceneEl.is("ar-mode")) {
          this.el.setAttribute("visible", false);
        }
      });
      this.el.sceneEl.addEventListener("exit-vr", ev => {
        this.el.setAttribute("visible", true);
      });
    }
  });

  AFRAME.registerComponent('ar-shadows', {
    schema: {
      opacity: {default: 0.3}
    },
    init: function () {
      this.el.sceneEl.addEventListener('enter-vr', (ev) => {
        this.wasVisible = this.el.getAttribute('visible');
        if (this.el.sceneEl.is('ar-mode')) {
          this.savedMaterial = this.el.object3D.children[0].material;
          this.el.object3D.children[0].material = new THREE.ShadowMaterial();
          this.el.object3D.children[0].material.opacity = this.data.opacity;
          this.el.setAttribute('visible', true);
        }
      });
      this.el.sceneEl.addEventListener('exit-vr', (ev) => {
        if (this.savedMaterial) {
          this.el.object3D.children[0].material = this.savedMaterial;
          this.savedMaterial = null;
        }
        if (!this.wasVisible) this.el.setAttribute('visible', false);
      });
    }
  });    
  
  AFRAME.registerComponent('occlusion-material', {
    update: function () {
      this.el.components.material.material.colorWrite = false;
    }
  });
  
  AFRAME.registerComponent("ar-hit-test", {
    
    schema: {
      offset: {type: 'vec2', default: {x: 0, y: 0}}
    },
  
    init: function() {
      this.xrHitTestSource = null;
  
      this.el.sceneEl.renderer.xr.addEventListener("sessionend", ev => {
        this.xrHitTestSource = null;
      });
  
      this.el.sceneEl.renderer.xr.addEventListener("sessionstart", ev => {
        this.session = this.el.sceneEl.renderer.xr.getSession();
        this.session.addEventListener('select', event => {
          this.el.emit('select', {
            frame: event.frame,
            inputSource: event.inputSource
          });
        });
        this.update();
      });
    },
    update: async function () {
      if (!this.session) return;
      const viewerSpace = await this.session.requestReferenceSpace('viewer');
      const hitTestSource = await this.session.requestHitTestSource({
        space: viewerSpace,
        // offsetRay: window.XRRay && new XRRay(this.data.offset)
      });
      this.xrHitTestSource = hitTestSource;
    },
    doHit: function (frame) {
      if (this.el.sceneEl.is("ar-mode")) {
        const refSpace = document.querySelector('a-scene').renderer.xr.getReferenceSpace();
        const xrViewerPose = frame.getViewerPose(refSpace);
  
        if (this.xrHitTestSource && xrViewerPose) {
          const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
          if (hitTestResults.length > 0) {
            this.el.emit('hit', {
              results: hitTestResults
            });
            this.el.setAttribute('visible', 'true');
            const pose = hitTestResults[0].getPose(refSpace);
            this.el.setAttribute("position", pose.transform.position);
          } else {
            this.el.setAttribute('visible', 'false');
          }
        }
      }
    },
    tick: function() {
      const frame = this.el.sceneEl.frame;
      this.doHit(frame);
    }
  });
  