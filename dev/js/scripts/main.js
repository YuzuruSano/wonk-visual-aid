import Entry from "entry";
import BrowserDetect from "modules/BrowserDetect";
import { $wrap, size, animation, wWidth, wheight, aiueo, midiDevices} from "modules/Defines";
import MidiHandler from "modules/midiHandler";
import LoadImg from "modules/LoadImg";
import effLines from "modules/effLines";
import effPulse from "modules/effPulse";
import effImgCollage from "modules/effImgCollage";
import effFonts from "modules/effFonts";
import MidiControllTrait from "modules/MidiControllTrait";
import 'p5/lib/addons/p5.sound';
import * as p5 from 'p5';

/**
 * 画像ロード
 */
const li = new LoadImg();

/**
 * midiメッセージを受取る
 */

let device;
let mh;
(async () => {
  mh = new MidiHandler();
  
  if ($('#canvas').length > 0) {
    await mh.requestMIDI();
    device = mh.midiDevices.outputs;
  }
})();

let mic;
let fft;

mic = new p5.AudioIn();
mic.start();
fft = new p5.FFT();
fft.setInput(mic);

const lines = new effLines(mh);
const pulse = new effPulse(mh);
let drawLine = false;
let drawPulse = false;

const mct = new MidiControllTrait(mh);

if ($('#canvas').length > 0){
  let s = (sk) => {
    let centerX;
    let centerY;
    let formResolution = 20;
    let x = [], y = [];
    let initRadius = 150;

    sk.setup = async () => {
      const canvas = sk.createCanvas(sk.windowWidth, sk.windowHeight);
      canvas.parent('canvas');
      sk.userStartAudio();

      centerX = sk.width / 2;
      centerY = sk.height / 2;
      const angle = sk.radians(360 / formResolution);
      for (var i = 0; i < formResolution; i++) {
        x.push(sk.cos(angle * i) * initRadius);
        y.push(sk.sin(angle * i) * initRadius);
      }
    }

    sk.draw = () => {
      mct.reset();
      
      if (mh.info.note == 48){
        if(mh.info.velocity == 127){
          drawLine = true;
          drawPulse = false;
        }else{
          drawLine = false;
          drawPulse = true;
        }
      }

      sk.background(0);
      let micLevel = mic.getLevel();
      sk.ellipse(sk.width / 2, sk.constrain(sk.height - micLevel * sk.height * 5, 0, sk.height), 10, 10);

      let spectrum = fft.analyze();
      const bass = fft.getEnergy("bass");
      const treble = fft.getEnergy("treble");
      const mid = fft.getEnergy("mid");

      if(drawLine){
        lines.exec(bass, mid, treble, spectrum, sk);
      }

      if (drawPulse) {
        pulse.exec(bass, mid, treble, spectrum, sk, x , y);
      }
    }
  }

  const P5 = new p5(s);
}

if ($('#canvas2').length > 0) {
  let ss = (sk) => {
    const canvasElem = 'canvas2';
    let centerX;
    let centerY;
    let NORTH = 0;
    let NORTHEAST = 1;
    let EAST = 2;
    let SOUTHEAST = 3;
    let SOUTH = 4;
    let SOUTHWEST = 5;
    let WEST = 6;
    let NORTHWEST = 7;
    let direction;

    let stepSize = 10;
    let diameter = 10;

    let prevVelocity = 0.01;

    sk.setup = async () => {
      const canvas = sk.createCanvas(sk.windowWidth * 1.5, sk.windowHeight);
      canvas.parent(canvasElem);
      sk.userStartAudio();
      sk.background('#280461');
      centerX = sk.width / 2;
      centerY = sk.height / 2;
      sk.frameRate(10);
      document.getElementById(canvasElem).style.opacity = prevVelocity;
    }

    sk.draw = () => {
      const bass = fft.getEnergy("bass");
      const treble = fft.getEnergy("treble");
      const mid = fft.getEnergy("mid");
      
      if (mh.info.note == 32 && mh.info.velocity > 0) {
        sk.clear();
      }
      
      if (mh.info.note === 0){
        const velocity = (mh.info.velocity) ? mh.info.velocity : 0.01;
        const mapVelocity = sk.map(velocity, 0, 127, 0.01, 0.6);
        const mapSkewX = sk.map(bass, 0, 255, -5, 5);

        if (prevVelocity !== mapVelocity){
          document.getElementById("canvas2").style.opacity = mapVelocity;
          document.getElementById("canvas2").style.transform = `skewX(${mapSkewX}deg)`;

          prevVelocity = mapVelocity;
        }

        if (sk.frameCount % 2 > 0) return;

        if (mapVelocity < 0.2) {
          sk.fill('#280461');
          sk.stroke(34, 120, 57, 80);
        } else if (mapVelocity < 0.6) {
          sk.fill(184, 17, 17);
          sk.stroke(34, 120, 57, 80);
        } else {
          sk.fill(34, 120, 57, 80);
          sk.stroke(34, 120, 57, 80);
        }
      }

      const mapTreble = sk.map(treble, 0, 255, 0, sk.width);
      for (var i = 0; i <= mapTreble; i++) {
        direction = sk.int(sk.random(0, 8));
        
        if (direction == NORTH) {
          centerY -= stepSize;
        } else if (direction == NORTHEAST) {
          centerX += stepSize;
          centerY -= stepSize;
        } else if (direction == EAST) {
          centerX += stepSize;
        } else if (direction == SOUTHEAST) {
          centerX += stepSize;
          centerY += stepSize;
        } else if (direction == SOUTH) {
          centerY += stepSize;
        } else if (direction == SOUTHWEST) {
          centerX -= stepSize;
          centerY += stepSize;
        } else if (direction == WEST) {
          centerX -= stepSize;
        } else if (direction == NORTHWEST) {
          centerX -= stepSize;
          centerY -= stepSize;
        }

        if (centerX > sk.width) centerX = 0;
        if (centerX < 0) centerX = sk.width;
        if (centerY < 0) centerY = sk.height;
        if (centerY > sk.height) centerY = 0;

        sk.ellipse(centerX + stepSize / 2, centerY + stepSize / 2, diameter, diameter * sk.noise(1, 3) );
      }
    }
  }

  const P5_2 = new p5(ss);
}

/**
 * img collage
 */
effImgCollage(mh, mct);

effFonts(mh, fft, mct);

if (module.hot) {
  module.hot.accept();
}
