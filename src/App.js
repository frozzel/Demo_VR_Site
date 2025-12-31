import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture, Loader, Environment, useFBX, useAnimations, OrthographicCamera } from '@react-three/drei';
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial';
import { OrbitControls } from '@react-three/drei';



import { LinearEncoding, sRGBEncoding } from 'three/src/constants';
import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from 'three';
import ReactAudioPlayer from 'react-audio-player';

import createAnimation from './converter';
import blinkData from './blendDataBlink.json';

import * as THREE from 'three';
import axios from 'axios';
const _ = require('lodash');

const host = process.env.REACT_APP_ROUTER_API;
const host2 = process.env.REACT_APP_ROUTER_BASE;

function Avatar({ avatar_url, speak, setSpeak, text, setAudioSource, playing, intro, message, setIntro }) {

  let gltf = useGLTF(avatar_url);
  let morphTargetDictionaryBody = null;
  let morphTargetDictionaryLowerTeeth = null;

  const [ 
    bodyTexture, 
    eyesTexture, 
    teethTexture, 
    bodySpecularTexture, 
    bodyRoughnessTexture, 
    bodyNormalTexture,
    teethNormalTexture,
    // teethSpecularTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
    ] = useTexture([
    "/images/body.webp",
    "/images/eyes.webp",
    "/images/teeth_diffuse.webp",
    "/images/body_specular.webp",
    "/images/body_roughness.webp",
    "/images/body_normal.webp",
    "/images/teeth_normal.webp",
    // "/images/teeth_specular.webp",
    "/images/h_color.webp",
    "/images/tshirt_diffuseCyrusWt.png",
    "/images/tshirt_normal.webp",
    "/images/tshirt_roughness.webp",
    "/images/h_alpha.webp",
    "/images/h_normal.webp",
    "/images/h_roughness.webp",
  ]);

  _.each([
    bodyTexture, 
    eyesTexture, 
    teethTexture, 
    teethNormalTexture, 
    bodySpecularTexture, 
    bodyRoughnessTexture, 
    bodyNormalTexture, 
    tshirtDiffuseTexture, 
    tshirtNormalTexture, 
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture
  ], t => {
    t.encoding = sRGBEncoding;
    t.flipY = false;
  });

  bodyNormalTexture.encoding = LinearEncoding;
  tshirtNormalTexture.encoding = LinearEncoding;
  teethNormalTexture.encoding = LinearEncoding;
  hairNormalTexture.encoding = LinearEncoding;

  
  gltf.scene.traverse(node => {


    if(node.type === 'Mesh' || node.type === 'LineSegments' || node.type === 'SkinnedMesh') {

      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;

    
      if (node.name.includes("Body")) {

        node.castShadow = true;
        node.receiveShadow = true;

        node.material = new MeshPhysicalMaterial();
        node.material.map = bodyTexture;
        // node.material.shininess = 60;
        node.material.roughness = 1.7;

        // node.material.specularMap = bodySpecularTexture;
        node.material.roughnessMap = bodyRoughnessTexture;
        node.material.normalMap = bodyNormalTexture;
        node.material.normalScale = new Vector2(0.6, 0.6);

        morphTargetDictionaryBody = node.morphTargetDictionary;

        node.material.envMapIntensity = 0.8;
        // node.material.visible = false;

      }

      if (node.name.includes("Eyes")) {
        node.material = new MeshStandardMaterial();
        node.material.map = eyesTexture;
        // node.material.shininess = 100;
        node.material.roughness = 0.1;
        node.material.envMapIntensity = 0.5;


      }

      if (node.name.includes("Brows")) {
        node.material = new LineBasicMaterial({color: 0x000000});
        node.material.linewidth = 1;
        node.material.opacity = 0.5;
        node.material.transparent = true;
        node.visible = false;
      }

      if (node.name.includes("Teeth")) {

        node.receiveShadow = true;
        node.castShadow = true;
        node.material = new MeshStandardMaterial();
        node.material.roughness = 0.1;
        node.material.map = teethTexture;
        node.material.normalMap = teethNormalTexture;

        node.material.envMapIntensity = 0.7;


      }

      if (node.name.includes("Hair")) {
        node.material = new MeshStandardMaterial();
        node.material.map = hairTexture;
        node.material.alphaMap = hairAlphaTexture;
        node.material.normalMap = hairNormalTexture;
        node.material.roughnessMap = hairRoughnessTexture;
        
        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.side = 2;
        node.material.color.setHex(0x000000);
        
        node.material.envMapIntensity = 0.3;

      
      }

      if (node.name.includes("TSHIRT")) {
        node.material = new MeshStandardMaterial();

        node.material.map = tshirtDiffuseTexture;
        node.material.roughnessMap = tshirtRoughnessTexture;
        node.material.normalMap = tshirtNormalTexture;
        node.material.color.setHex(0xffffff);

        node.material.envMapIntensity = 0.5;


      }

      if (node.name.includes("TeethLower")) {
        morphTargetDictionaryLowerTeeth = node.morphTargetDictionary;
      }

    }

  });

  const [clips, setClips] = useState([]);
  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), []);

  useEffect(() => {

    if (speak === false)
      return;

    makeSpeech(text)
    .then( response => {

      let {blendData, filename}= response.data;

      let newClips = [ 
        createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'), 
        createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower') ];

      filename = host2 + filename;
        
      setClips(newClips);
      setAudioSource(filename);

    })
    .catch(err => {
      console.error(err, "Error in making speech");
      setSpeak(false);

    })

  }, [speak]);

  useEffect(() => {

    if (intro === false)
      return;

    makeSpeech2(message)
    .then( response => {

      let {blendData, filename}= response.data;

      let newClips = [ 
        createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'), 
        createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower') ];

      filename = host2 + filename;
        
      setClips(newClips);
      setAudioSource(filename);
      setIntro(false);

    })
    .catch(err => {
      console.error(err, "Error in making speech");
      setIntro(false);
      setSpeak(false);

    })

  }, [speak]);

  let idleFbx = useFBX('/idle.fbx');
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, track => {
    return track.name.includes("Head") || track.name.includes("Neck") || track.name.includes("Spine2");
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, track => {

    if (track.name.includes("Head")) {
      track.name = "head.quaternion";
    }

    if (track.name.includes("Neck")) {
      track.name = "neck.quaternion";
    }

    if (track.name.includes("Spine")) {
      track.name = "spine2.quaternion";
    }

    return track;

  });

  useEffect(() => {

    let idleClipAction = mixer.clipAction(idleClips[0]);
    idleClipAction.play();

    let blinkClip = createAnimation(blinkData, morphTargetDictionaryBody, 'HG_Body');
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();


  }, []);

  // Play animation clips when available
  useEffect(() => {

    if (playing === false)
      return;
    
    _.each(clips, clip => {
        let clipAction = mixer.clipAction(clip);
        clipAction.setLoop(THREE.LoopOnce);
        clipAction.play();

    });

  }, [playing]);

  
  useFrame((state, delta) => {
    mixer.update(delta);
  });


  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}


function makeSpeech(text) {
  return axios.post(host + '/talk', { text });
}

function makeSpeech2(text) {
  return axios.post(host + '/talk2', { text });
}

const STYLES = {
  area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500, display: 'flex', flexDirection: 'column', background: '#222222', padding: '10px',  borderRadius: '5px'},
  text: {margin: '0px', width:'300px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.2em', border: 'none'},
  question: {margin: '0px', width:'300px', padding: '5px', background: 'none', color: '#DC9BD4', fontSize: '1.2em', border: 'none'},
  speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#222222', background: '#ffffff', border: 'None', maxWidth: '80px'},
  area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500},
  label: {color: '#777777', fontSize:'0.8em'}
}

function App() {
  const [message, setMessage] = useState("Hi there! I’m Arwen, your virtual assistant here at Cyrus Group. I can help you explore our web development services, walk you through our design and development process, or gather a few details so our team can provide a tailored solution for your project. How can I assist you today?");
  const audioPlayer = useRef();
  const [intro, setIntro] = useState(true);
  const [speak, setSpeak] = useState(false);
  const [text, setText] = useState("👇👇👇👇");
  const [audioSource, setAudioSource] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState("Requesting...");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  const handleListen = async () => {
    setMessage('Listening...');
    console.log(message)
  
    var quest = null
  
    if (!recognition.running) {
      recognition.start();
      recognition.onstart = () => {
        setMessage('Voice recognition started. Speak into the microphone.');
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage('Voice recognition result:', transcript);
        quest = transcript;
      };
      recognition.onend =  () => {
        setMessage('Voice recognition ended.');
        
        //  setQuestion(quest)
        
        // fetchChatGpt(quest)

        setText(quest);
        setSpeak(true);
  
      };
      
      } else {
        recognition.stop();
        setMessage('Voice recognition stopped. Click on the Microphone logo to start again.');
    }
    
  };

  // End of play
  function playerEnded(e) {
    setAudioSource(null);
    setSpeak(false);
    setPlaying(false);
  }

  // Player is read
  function playerReady(e) {
    audioPlayer.current.audioEl.current.play();
    setPlaying(true);

  }  
  // Request microphone permissions
    const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");

      setPermissionStatus("Microphone access granted. Please accept data collection to continue.");
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setPermissionStatus("Microphone access denied. Please allow it to use voice features.");
    }
  };

  const handleConsent = () => {
    try {
      // Create or resume audio context on Chrome
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      if (ctx.state === "suspended") {
        ctx.resume().then(() => console.log("AudioContext resumed after user gesture"));
      }
    } catch (e) {
      console.warn("Could not initialize audio context:", e);
    }

    localStorage.setItem("userConsent", "true");
    setHasConsent(true);
  };

  useEffect(() => {
    const saved = localStorage.getItem("userConsent");
    if (saved === "true") {
      setHasConsent(true);
    }
  }, []);

  return (
    <div className="full">
      {!hasConsent ? (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          // Background image:
          backgroundImage: "url('/images/office3.jpeg')", // ⬅️ your image here
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 9999
        }}
      >
        {/* Semi-transparent overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)", // black with 75% opacity
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            padding: "2rem",
            color: "#fff"
          }}
        >
            {/* === Logo Section === */}
        <img
          src="/images/cyrusLogoLg.png"    // Adjust path as needed
          alt="Cyrus Group Logo"
          style={{
            width: "600px",
            marginBottom: "1.5rem",
            borderRadius: "8px",            // Optional: rounded logo corners
            objectFit: "contain"
          }}
        />
          <h2>Welcome to Cyrus Group Virtual Assistant</h2>
          <p>
            To continue, please allow access to your microphone and confirm you consent to data collection for improving your experience.
          </p>
          <p style={{ marginTop: "10px" }}>{permissionStatus}</p>

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={requestPermissions}
              style={{
                background: "#f687b3",
                color: "#333",
                border: "none",
                padding: "10px 20px",
                margin: "5px",
                fontSize: "1em",
                cursor: "pointer",
                borderRadius: "16px",   // 👈 Rounded corners here
                
              }}
            >
              Request Microphone Access
            </button>
          </div>

          <div style={{ marginTop: "10px" }}>
            <label style={{ display: "block", marginBottom: "10px" }}>
              <input type="checkbox" id="consentCheck" />{" "}
              I consent to microphone usage and data collection.
            </label>
            <button
              onClick={handleConsent}
              disabled={!document.getElementById("consentCheck")?.checked}
              style={{
                background: "#793ef9",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                fontSize: "1em",
                cursor: "pointer",
                borderRadius: "16px", 
                opacity: document.getElementById("consentCheck")?.checked
                  ? 1
                  : 0.5
              }}
            >
              Continue
            </button>
          </div>
        </div>
  </div>
      ) : (
        <>
          {/* === Your existing UI BELOW === */}
          <div style={STYLES.area}>
            <textarea
              rows={4}
              type="text"
              style={STYLES.text}
              value={message}
              onChange={(e) => setText(e.target.value.substring(0, 200))}
            />
            <textarea
              rows={4}
              type="text"
              style={STYLES.question}
              value={text}
              onChange={(e) => setText(e.target.value.substring(0, 200))}
            />
            <button
              onClick={() => handleListen()}
              style={STYLES.speak}
            >
              {speak ? "Running..." : "Speak"}
            </button>
          </div>

          <ReactAudioPlayer
            src={audioSource}
            ref={audioPlayer}
            onEnded={playerEnded}
            onCanPlayThrough={playerReady}
          />

          <Canvas dpr={2} onCreated={(ctx) => {
              ctx.gl.physicallyCorrectLights = true;
            }}>
            <OrthographicCamera makeDefault zoom={1700} position={[0, 1.65, 1]} />
            <OrbitControls target={[0, 1.65, 0]} />

            <Suspense fallback={null}>
              <Environment
                background={false}
                files="/images/photo_studio_loft_hall_1k.hdr"
              />
            </Suspense>

            <Suspense fallback={null}><Bg /></Suspense>
            <Suspense fallback={null}><Logo /></Suspense>
            <Suspense fallback={null}>
              <Avatar
                avatar_url="/model.glb"
                speak={speak}
                setSpeak={setSpeak}
                text={text}
                setAudioSource={setAudioSource}
                playing={playing}
                intro={intro}
                message={message}
                setIntro={setIntro}
              />
            </Suspense>
          </Canvas>

          <Loader dataInterpolation={(p) => `Please turn your mic and audio on\nLoading... please wait`} />
        </>
      )}
    </div>
  );
}

function Bg() {
  const {scene} =  useThree();
  const texture = useTexture('/images/office3.jpeg');
  texture.encoding = sRGBEncoding; // Ensure correct color encoding


  // const gltf = useLoader(GLTFLoader, '/images/richards_art_gallery_-_audio_tour.glb');

  scene.background = texture; 

  return(<> 
 
    {/* <primitive object={gltf.scene} dispose={null} scale={[1, 1, 1]} position={[10, 0, 0]} rotation={[0, 0, 0]} /> */}
    {/* <mesh position={[0, 1.5, -2]} scale={[0.8, 0.8, 0.8]}>
      <planeBufferGeometry />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide}/>

    </mesh> */}
    {/* <mesh
    visible
    userData={{ hello: 'world' }}
    position={new THREE.Vector3(0, 1.5, -3)}
    rotation={new THREE.Euler(Math.PI / 2, 0, 0)}
    geometry={new THREE.SphereGeometry(4, 16, 16)}
    // material={new THREE.MeshBasicMaterial({ color: new THREE.Color('hotpink'), transparent: true })}
    material={new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })}
  /> */}
    
  </>)

}

function Logo() {
  const texture = useTexture('/images/cyrusLogoBlk.png');
  texture.encoding = sRGBEncoding; // Ensure correct color encoding

  // Adjust position and scale based on your scene
  return (
    <mesh position={[-.2, 1.8, -0]} scale={[ .2, .04, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent={true} />
    </mesh>
  );
}

export default App;
