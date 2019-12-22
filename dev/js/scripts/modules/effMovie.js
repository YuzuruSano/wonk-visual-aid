import * as p5 from 'p5';
const staticPath = (process.env.NODE_ENV == 'development') ? '../' : '/assets/'

export default function effFonts(mh, fft, mct) {
    if ($('#canvas5').length > 0) {
        let s = (sk) => {

            sk.setup = () => {
                const canvas = sk.createCanvas(sk.windowWidth, sk.windowHeight);
                canvas.parent('canvas5');
                sk.noFill();
                const vid = sk.createVideo(`${staticPath}movie/walk.mp4`, () => {
                    vid.elt.muted = true;
                    vid.loop();
                });
                vid.parent('wrap')
                vid.size(100, 100);
            }

            sk.draw = () => {
                
            }
        }

        const P5 = new p5(s);
    }
}