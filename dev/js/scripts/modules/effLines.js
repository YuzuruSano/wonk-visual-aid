let N = 5;
let R = 180;

export default class effLines {
    constructor(mh) {
        this.mh = mh;
        this.is_fill = false;
    }

    exec(bass, mid, treble, spectrum, sk){
        if (this.mh.info.note == 69 && this.mh.info.velocity > 0) {
            this.is_fill = true;
        } else if (this.mh.info.note == 69 && this.mh.info.velocity <= 0) {
            this.is_fill = false;
        }

        const mapBass = sk.map(bass, 0, 255, 0, sk.width);
        const mapMid = sk.map(mid, 0, 255, 1, 2);
        const mapTreble = sk.map(treble, 0, 255, 2, 6);
        
        const mapMidWeight = sk.map(mid, 0, 255, 0.2, 1);
        const mapTrebleWeight = sk.map(treble, 0, 255, 0.2, 1);

        const mapMidOP = sk.map(mid, 0, 255, 0.8, 1);
        const mapTrebleOP = sk.map(treble, 0, 255, 0.8, 1);

        //circle1
        if (this.is_fill){
            sk.fill('#333'); // spectrum is green
        }else{
            sk.fill(`rgba(0, 0, 0, 0)`);
        }
        
        const trebleN = sk.map(treble, 0, 255, 5, 30);
        N = sk.map(bass, 0, 255, 0, mapTreble);
        sk.push();
        sk.translate(sk.width / 2, sk.height / 2);
        sk.rotate(-90);
        sk.stroke('yellow');
        sk.strokeWeight(mapMid);
        sk.beginShape();
        for (let theta = 0; theta < 360; theta++) {
            let pos = this.calcPos(R, theta, sk);

            let x = pos[0];
            let y = pos[1];
            sk.vertex(x, y);
        }
        sk.endShape(sk.CLOSE);
        sk.pop();

        /**
         * spectrum
         */
        for (var i = 0; i < 100; i++) {
            let x = sk.map(i, 0, spectrum.length * 1.5, 0, sk.width * 2);
            let h = - sk.height + sk.map(spectrum[i], 0, 255, sk.height, 0);

            //line1
            sk.push();
            if (this.is_fill) {
                sk.fill(`rgba(255, 255, 255, ${mapTrebleOP})`);
            }else{
                sk.fill(`rgba(0, 0, 0, 0)`);
            }
            sk.translate(mapTreble, h);
            sk.rotate(sk.PI / mapTreble);
            sk.stroke('#ccc');
            sk.strokeWeight(mapTrebleWeight);
            sk.rect(x, sk.height, sk.width / spectrum.length, h * mapTreble);
            sk.pop();

            //line2
            if (this.is_fill) {
                sk.fill(`rgba(214, 18, 4, ${mapMidOP})`);
            } else {
                sk.fill(`rgba(0, 0, 0, 0)`);
            }

            sk.translate(mapBass, h);
            sk.translate(h, mapBass);
            sk.rotate(sk.PI / mapMid);
            sk.stroke('red');
            sk.strokeWeight(mapMidWeight);
            sk.rect(x, sk.height, sk.width / spectrum.length, h * mapMid)
        }
    }

    calcPos(r, t, sk){
        let x = r * sk.cos(t) * this.func(t, sk);
        let y = r * sk.sin(t) * this.func(t, sk);

        return [x, y];
    }

    func(t, sk){
        let a = 360 / N;
        let A = sk.cos(a);
        let B = sk.cos(a - sk.acos(sk.cos(N * t)) / N);

        return A / B;
    }
}