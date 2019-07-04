import * as THREE from 'three/build/three.module';
import Stats from 'three/examples/jsm/libs/stats.module';
import {
    FBXLoader
} from 'three/examples/jsm/loaders/FBXLoader';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import "./index.css"

const Index = {

    container: null,
    renderer: null,
    stats: null,
    scene: null,
    clock: new THREE.Clock(),
    bug: null,
    map: null,
    lookPos: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    plugins: [],

    init() {
        this.createRenderer();
        this.createScene();
        this.createCamera();
        this.run();
        this.asyncLoadModel();
    },

    createRenderer: function () {
        let container = document.createElement('div');
        container.className = "container";
        document.body.appendChild(container);

        let renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        let stats = new Stats();
        container.appendChild(stats.dom);

        Index.container = container;
        Index.renderer = renderer;
        Index.stats = stats;
    	Index.plugins.push(stats);
    },

    createScene: function () {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0xa0a0a0);
        scene.fog = new THREE.Fog(0xa0a0a0, 100, 1000);
       
        let light = new THREE.HemisphereLight(0xffffff, 0x444444);
        light.position.set(0, 200, 0);
        scene.add(light);
        
        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(200, 300, 100);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        scene.add(light);

        Index.scene = scene;
    },

    createCamera: function () {
        let container = Index.container;
        let camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 1, 1000);
        let controls = new TrackballControls( camera, Index.renderer.domElement );
        Index.camera = camera;
        Index.controls = controls;
        Index.plugins.push(controls);
    },

    run: function () {
        requestAnimationFrame(Index.run);

        let delta = Index.clock.getDelta();
        Index.plugins.forEach(p=>p.update());
        Index.renderer.render(Index.scene, Index.camera);
        Index.update(delta);
    },

    asyncLoadModel: function () {
        let scene = Index.scene;
        let loader = new FBXLoader();
        loader.load('../model/bug.fbx', function (object) {
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            let head = object.getObjectByName('Head');
            let neck = object.getObjectByName('Neck');
            let foot = object.getObjectByName('Foot');
            let tail = object.getObjectByName('Tail');

            let bugModel = {
                bug: object,
                head, neck, foot, tail,
                rotateOriginal: {
                    head: head.rotation.clone().toVector3(),
                    neck: neck.rotation.clone().toVector3(),
                    foot: foot.rotation.clone().toVector3(),
                    tail: tail.rotation.clone().toVector3()
                },
                directionOriginal: {
                    bug: object.getWorldDirection(new THREE.Vector3())
                },
                positionOriginal:{
                    bug: new THREE.Vector3(0, 0.3, 0)
                },
                rotationModify: {
                    head: new THREE.Euler(0,0,0),
                    neck: new THREE.Euler(0,0,0),
                    foot: new THREE.Euler(0,0,0),
                    tail: new THREE.Euler(0,0,0)
                },
                directionModify: {
                    bug: new THREE.Vector3(0, 0, 0)
                },
                positionModify:{
                    bug: new THREE.Vector3(0, 0, 0)
                },
                footLength: 1.85 / (Math.PI / 4),
                poseAngle: Math.PI / 4
            };
            
            object.scale.multiplyScalar(.003);
            scene.add(object);
            
            Index.bugModel = bugModel;

            Index.bugMoveing();
            Index.updateCameraPosition();
        }, function(e){
            console.log("download " + e.currentTarget.responseURL + ", " + e.loaded + "/" + e.total );
        }, function(e){
            console.error(e);
        });
        loader.load('../model/map.fbx', function (object) {
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.receiveShadow = true;
                }
            });
            object.scale.multiplyScalar(0.1);
            scene.add(object);

            Index.map = object;
        });
    },

    updateCameraPosition: function(){
        let camera = Index.camera;
        let lookPos = Index.lookPos;
        let bug = Index.bugModel.bug;
        // let direction = Index.bugModel.directionOriginal.direction;

        lookPos.copy(bug.position).add(bug.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));
        camera.position.set(8, 8, 8);
        camera.lookAt(lookPos);
    },

    update: function (delta) {
        // Game Logic
        if(Index.bugModel) {

            Index.bugMoveing();

            let bugModel = Index.bugModel;

            let headRotate = bugModel.rotateOriginal.head.clone().add(bugModel.rotationModify.head);
            let neckRotate = bugModel.rotateOriginal.neck.clone().add(bugModel.rotationModify.neck);
            let footRotate = bugModel.rotateOriginal.foot.clone().add(bugModel.rotationModify.foot);
            let tailRotate = bugModel.rotateOriginal.tail.clone().add(bugModel.rotationModify.tail);
            let bugPosition = bugModel.positionOriginal.bug.clone().add(bugModel.positionModify.bug);

            bugModel.head.rotation.setFromVector3(headRotate);
            bugModel.neck.rotation.setFromVector3(neckRotate);
            bugModel.foot.rotation.setFromVector3(footRotate);
            bugModel.tail.rotation.setFromVector3(tailRotate);
            bugModel.bug.position.set(bugPosition.x, bugPosition.y, bugPosition.z);
        }
    },
    setBugPose: function(angle){
        let bugModel = Index.bugModel;
        
        let yFix = (angle * angle * 0.5);
        bugModel.positionModify.bug.y = angle * bugModel.footLength - yFix;

        bugModel.rotationModify.head.x = angle;
        bugModel.rotationModify.neck.x = -angle;
        bugModel.rotationModify.foot.x = angle;
        bugModel.rotationModify.tail.x = -angle;
    },
    bugMoveing: function() {
        let bugModel = Index.bugModel;
        if(bugModel.shrink) {
            bugModel.poseAngle -= Math.PI / 180;
            if(bugModel.poseAngle <= Math.PI / 90) {
                bugModel.shrink = false;
            }
        } else {
            bugModel.poseAngle += Math.PI / 180;
            if(bugModel.poseAngle >= Math.PI / 3) {
                bugModel.shrink = true;
            }
        }
        Index.setBugPose(bugModel.poseAngle);
        bugModel.positionModify.bug.add(bugModel.directionOriginal.bug.clone().multiplyScalar(-0.01));
    }
}

Index.init();