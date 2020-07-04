import * as p5 from 'p5';
const staticPath = (process.env.NODE_ENV == 'development') ? '../' : '/assets/'

class Letter {
    constructor(char, x, y, sk){
        this.char = char;
        this.x = x;
        this.y = y;
        this.density = 10;
        this.sk = sk;
    }
   
    draw(pathSampleFactor, ribbonWidth, font, fontSize, color = 255) {
        const sk = this.sk;
        const path = font.textToPoints(this.char, this.x, this.y, fontSize, { sampleFactor: pathSampleFactor });
        sk.stroke(color);

        for (let d = 0; d < ribbonWidth; d += this.density) {
            sk.beginShape();

            for (let i = 0; i < path.length; i++) {
                if(i % 2 == 0){
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
                
            }

            sk.endShape(sk.CLOSE);
        }
    };
}

export default function effFonts(mh, fft, mct) {
    if ($('#canvas4').length > 0) {
        let globalTypeIndex = 0;
        let s = (sk) => {
            let fontSize = 800;
            let fontColor = 255;
            let pathSimplification = 0;
            
            const types = [];
            let textTypes = [
                ':)1/K','AXIS','BIAS','sINe'
            ];

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
                if (mct.is_reset) {
                    fontSize = 850;
                    fontColor = 0;
                }else{
                    fontSize = 800;
                    fontColor = 255;
                }

                sk.clear();
                sk.translate(100, sk.height * 0.75);

                const bass = fft.getEnergy("bass");
                const treble = fft.getEnergy("treble");
                const mid = fft.getEnergy("mid");
                
                const mapMid = sk.map(mid, 0, 255, 1, sk.width);
                const mapTreble = sk.map(treble, 0, 255, 0, sk.height * sk.map(bass, 0, 255, 1, 4));

                const pathSampleFactor = 0.03 * sk.pow(0.02, mapMid / sk.width);
                const ribbonWidth = sk.map(mapTreble, 0, sk.height, 1, treble);

                let TypeIndex = globalTypeIndex;
                switch (mh.info.note) {
                    case 33:
                        TypeIndex = 0;
                        break;
                    case 34:
                        TypeIndex = 1;
                        break;
                    case 35:
                        TypeIndex = 2;
                        break;
                    case 36:
                        TypeIndex = 3;
                        break;
                    default:
                        break;
                }
                globalTypeIndex = TypeIndex;
                for (var i = 0; i < types[TypeIndex].length; i++) {
                    types[TypeIndex][i].draw(pathSampleFactor, ribbonWidth, font, fontSize, fontColor);
                }
            }

            const createLetters = () => {
                for (let index = 0; index < textTypes.length; index++) {
                    const chars = textTypes[index];
                    //let x = -sk.width * 0.1;
                    let x = -100;
                    let letters = [];
                    
                    for (let i = 0; i < chars.length; i++) {
                        if (i > 0) {
                            const charsBefore = chars.substring(0, i);
                            x = font.textBounds(charsBefore, 0, 0, fontSize).w;
                        }
                        
                        const newLetter = new Letter(chars[i], x - 50, sk.random(-100, 100), sk);
                        letters.push(newLetter);
                    }

                    types.push(letters);
                }
            }
        }

        const P5 = new p5(s);
    }
}