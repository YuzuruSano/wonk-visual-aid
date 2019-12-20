import * as p5 from 'p5';
const staticPath = (process.env.NODE_ENV == 'development') ? '../' : '/assets/'

class Letter {
    constructor(char, x, y, sk){
        this.char = char;
        this.x = x;
        this.y = y;
        this.density = 10;
        this.sk = sk;
        this.shapeColor = sk.color(255);
    }
   
    draw(pathSampleFactor, ribbonWidth, font, fontSize) {
        const sk = this.sk;
        const path = font.textToPoints(this.char, this.x, this.y, fontSize, { sampleFactor: pathSampleFactor });
        sk.stroke(this.shapeColor);

        for (let d = 0; d < ribbonWidth; d += this.density) {
            sk.beginShape();

            for (let i = 0; i < path.length; i++) {
                const pos = path[i];
                const nextPos = path[i + 1];

                if (nextPos) {
                    const p0 = sk.createVector(pos.x, pos.y);
                    const p1 = sk.createVector(nextPos.x, nextPos.y);
                    const v = p5.Vector.sub(p1, p0);
                    v.normalize();
                    v.rotate(sk.HALF_PI);
                    v.mult(d);
                    const pneu = p5.Vector.add(p0, v);
                    sk.curveVertex(pneu.x, pneu.y);
                }
            }

            sk.endShape(sk.CLOSE);
        }
    };
}

export default function effFonts(mh, fft) {
    if ($('#canvas4').length > 0) {
        let s = (sk) => {
            let letters = [];
            let fontSize = 800;
            let pathSimplification = 0;

            let textTyped = ':)1/K';

            let font;

            sk.preload = () => {
                font = sk.loadFont(`${staticPath}fonts/NotoSans-Bold.ttf`);
            }

            sk.setup = () => {
                const canvas = sk.createCanvas(sk.windowWidth, sk.windowHeight);
                canvas.parent('canvas4');
                sk.noFill();
                sk.strokeWeight(1);
                createLetters();
            }

            sk.draw = () => {
                sk.clear();
                sk.translate(100, sk.height * 0.75);

                const bass = fft.getEnergy("bass");
                const treble = fft.getEnergy("treble");
                const mid = fft.getEnergy("mid");
                
                const mapMid = sk.map(mid, 0, 255, 1, sk.width);
                const mapTreble = sk.map(treble, 0, 255, 0, sk.height * sk.map(bass, 0, 255, 1, 4));

                const pathSampleFactor = 0.1 * sk.pow(0.02, mapMid / sk.width);
                const ribbonWidth = sk.map(mapTreble, 0, sk.height, 1, treble);

                for (var i = 0; i < letters.length; i++) {
                    letters[i].draw(pathSampleFactor, ribbonWidth, font, fontSize);
                }
            }

            const createLetters = () => {
                letters = [];
                const chars = textTyped.split('');
                
                let x = 0;
                for (let i = 0; i < chars.length; i++) {
                    if (i > 0) {
                        const charsBefore = textTyped.substring(0, i);
                        x = font.textBounds(charsBefore, 0, 0, fontSize).w;
                    }
                    const newLetter = new Letter(chars[i], x, 0, sk);
                    letters.push(newLetter);
                }
            }
        }

        const P5 = new p5(s);
    }
}