import Entry from "entry";
import BrowserDetect from "modules/BrowserDetect";
import { $wrap, size, animation, wWidth, wheight, aiueo, midiDevices} from "modules/Defines";
import MidiHandler from "modules/midiHandler";
import LoadImg from "modules/LoadImg";
import effLines from "modules/effLines";
import effPulse from "modules/effPulse";
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
        const mapVelocity = sk.map(velocity, 0, 127, 0.01, 0.9);
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

if ($('#canvas3').length > 0) {
  let sss = (sk) => {
    let layer1Images = [];
    let layer2Images = [];
    let layer3Images = [];

    let layer1Items = [];
    let layer2Items = [];
    let layer3Items = [];
    sk.preload = () => {
      layer1Images.push(sk.loadImage('../images/collage/layer1_01.png'));
      layer1Images.push(sk.loadImage('../images/collage/layer1_02.png'));
      layer1Images.push(sk.loadImage('../images/collage/layer1_03.png'));
      layer1Images.push(sk.loadImage('../images/collage/layer1_04.png'));
      layer1Images.push(sk.loadImage('../images/collage/layer1_05.png'));

      layer2Images.push(sk.loadImage('../images/collage/layer2_01.png'));
      layer2Images.push(sk.loadImage('../images/collage/layer2_02.png'));
      
      layer3Images.push(sk.loadImage('../images/collage/layer3_01.png'));
      layer3Images.push(sk.loadImage('../images/collage/layer3_02.png'));
      layer3Images.push(sk.loadImage('../images/collage/layer3_03.png'));
      layer3Images.push(sk.loadImage('../images/collage/layer3_04.png'));
      layer3Images.push(sk.loadImage('../images/collage/layer3_05.png'));
      layer3Images.push(sk.loadImage('../images/collage/layer3_06.png'));
      layer3Images.push(sk.loadImage('../images/collage/layer3_07.png'));
    }

    sk.setup = async () => {
      const canvas = sk.createCanvas(sk.windowWidth, sk.windowHeight);
      canvas.parent('canvas3');
      sk.imageMode(sk.CENTER);

      layer1Items = generateCollageItems(layer1Images, 100, sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.5, 0, 0);
      layer2Items = generateCollageItems(layer2Images, 150, sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.3, -sk.HALF_PI, sk.HALF_PI);
      layer3Items = generateCollageItems(layer3Images, 110, sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.4, -sk.HALF_PI, sk.HALF_PI);

      drawCollageItems(layer1Items);
      drawCollageItems(layer2Items);
      drawCollageItems(layer3Items);
    }

    sk.draw = () => {
      const velocity = (mh.info.velocity) ? mh.info.velocity : 0.01;

      if (mh.info.note === 7) {
        const mapVelocity = sk.map(velocity, 0, 127, 1, 4);
        if (mapVelocity > 1 || 2 >= mapVelocity) layer1Items = generateCollageItems(layer1Images, sk.random(5, 15), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.5, 0, 0);
        if (mapVelocity > 2 || 3 >= mapVelocity) layer2Items = generateCollageItems(layer2Images, sk.random(5, 8), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, sk.random(0.3, 0.8), -sk.HALF_PI, sk.HALF_PI);
        if ( 3 <= mapVelocity) layer3Items = generateCollageItems(layer3Images, sk.random(10, 60), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, sk.random(0.2, 0.6), -sk.HALF_PI, sk.HALF_PI);

        sk.clear();

        drawCollageItems(layer1Items);
        drawCollageItems(layer2Items);
        drawCollageItems(layer3Items);
      }
    }

    sk.keyReleased = (key) => {
      if (key.key == 's' || key.key == 'S') saveCanvas(gd.timestamp(), 'png');
      if (key.key == '1') layer1Items = generateCollageItems(layer1Images, sk.random(5, 15), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.5, 0, 0);
      if (key.key == '2') layer2Items = generateCollageItems(layer2Images, sk.random(5, 8), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, sk.random(0.3, 0.8), -sk.HALF_PI, sk.HALF_PI);
      if (key.key == '3') layer3Items = generateCollageItems(layer3Images, sk.random(10, 60), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, sk.random(0.2, 0.6), -sk.HALF_PI, sk.HALF_PI);

      sk.clear();

      drawCollageItems(layer1Items);
      drawCollageItems(layer2Items);
      drawCollageItems(layer3Items);
    }

    function generateCollageItems(layerImages, count, posX, posY, rangeX, rangeY, scaleStart, scaleEnd, rotationStart, rotationEnd) {
      var layerItems = [];
      for (var i = 0; i < count; i++) {
        var index = i % layerImages.length;
        var item = new CollageItem(layerImages[index]);
        item.x = posX + sk.random(-rangeX / 2, rangeX / 2);
        item.y = posY + sk.random(-rangeY / 2, rangeY / 2);
        item.scaling = sk.random(scaleStart, scaleEnd);
        item.rotation = sk.random(rotationStart, rotationEnd);
        layerItems.push(item);
      }
      return layerItems;
    }

    function CollageItem(image) {
      this.image = image;
      this.x = 0;
      this.y = 0;
      this.rotation = 0;
      this.scaling = 1;
    }

    function drawCollageItems(layerItems) {
      for (var i = 0; i < layerItems.length; i++) {
        sk.push();
        sk.translate(layerItems[i].x, layerItems[i].y);
        sk.rotate(layerItems[i].rotation);
        sk.scale(layerItems[i].scaling);
        sk.image(layerItems[i].image, 0, 0);
        sk.pop();
      }
    }
  }

  const P5_3 = new p5(sss);
}


if (module.hot) {
  module.hot.accept();
}
