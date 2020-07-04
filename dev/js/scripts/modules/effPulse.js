let angle = 0;

export default class effPulse {
    constructor(mh){
        this.mh = mh;
        this.is_fill = false;
        this.Velocity1 = 1;
        this.Velocity2 = 1;
        this.Velocity3 = 1;
    }

    exChangeVelocity(note, Velocity, sk){

        if (this.mh.info.note == note) {
            const velocity = (this.mh.info.velocity) ? this.mh.info.velocity : 0.01;
            const mapVelocity = sk.map(velocity, 127, 0, 0.01, 1);

            Velocity = mapVelocity;
        }
        
        return Velocity;
    }

    exec(bass, mid, treble, spectrum, sk, x, y){
        if (this.mh.info.note == 69 && this.mh.info.velocity > 0) {
            this.is_fill = true;
        } else if (this.mh.info.note == 69 && this.mh.info.velocity <= 0){
            this.is_fill = false;
        }
        
        this.Velocity1 = this.exChangeVelocity(1, this.Velocity1, sk);
        this.Velocity2 = this.exChangeVelocity(2, this.Velocity2, sk);
        this.Velocity3 = this.exChangeVelocity(3, this.Velocity3, sk);

        const mapBass = sk.map(bass, 0, 255, 0, sk.width);
        const mapMid = sk.map(mid, 0, 255, 1, 2);
        const mapTreble = sk.map(treble, 0, 255, 0, sk.height);

        let formResolution = sk.map(treble, 0, 255, 20, 100);

        const mapBassR = Math.floor(sk.map(bass, 0, 255, 0, 256));
        const mapMidG = Math.floor(sk.map(mid, 0, 255, 0, 256));
        const mapTrebleB = Math.floor(sk.map(treble, 0, 255, 0, 256));

        // floating towards mouse position
        let centerX = sk.noise(mapBass, sk.width);
        let centerY = sk.noise(mapMid, sk.height);

        // calculate new points
        for (var i = 0; i < formResolution; i++) {
            x[i] = sk.random(-mapBass, mapMidG);
            y[i] = sk.random(-mapTreble, mapTrebleB);
        }
    
        sk.stroke(`rgba(${mapTrebleB}, ${mapMidG}, ${mapBassR}, ${this.Velocity1})`);

        if (this.is_fill){
            sk.fill(`rgba(0, 0 , 0, ${this.Velocity1})`);
        } else {
            sk.fill(`rgba(0, 0, 0, 0)`);
        }

        
        sk.translate(sk.random(-100, sk.width + sk.width), mapTreble * mapMid);
        sk.beginShape();
        // first controlpoint
        sk.curveVertex(x[formResolution - 1] + centerX, y[formResolution - 1] + centerY);

        // only these points are drawn
        for (var i = 0; i < formResolution; i++) {
            sk.curveVertex(x[i] + centerX, y[i] + centerY * mapTrebleB);
        }
        sk.curveVertex(x[0] + centerX, y[0] + centerY);

        // end controlpoint
        sk.curveVertex(x[1] + centerX, y[1] + centerY);
        sk.endShape();

        sk.translate(sk.width / 4, sk.height / 4);
        sk.rotate(sk.radians(angle));
        sk.stroke(`rgba(${mapBassR}, ${mapTrebleB}, ${mapBassR}, ${this.Velocity2})`);

        if (this.is_fill) {
            sk.fill(`rgba(0, 0 , 0, ${this.Velocity2})`);
        } else {
            sk.fill(`rgba(0, 0, 0, 0)`);
        }

        
        sk.strokeWeight(sk.random(1, 2));
        sk.beginShape();
        // first controlpoint
        sk.curveVertex(x[formResolution - 1] + centerX, y[formResolution - 1] + centerY);

        // only these points are drawn
        for (var i = 0; i < 100; i++) {
            sk.curveVertex(x[i] + centerX, y[i] + centerY * mapTrebleB);
        }
        sk.curveVertex(x[0] + centerX, y[0] + centerY);

        // end controlpoint
        sk.curveVertex(x[1] + centerX, y[1] + centerY);
        sk.endShape();

        sk.translate(sk.width / 4, sk.height / 4);
        sk.rotate(sk.radians(angle) * 180 / sk.PI);
        sk.stroke(`rgba(227, 209, 14, ${this.Velocity3})`);

        if (this.is_fill) {
            sk.fill(`rgba(0, 0 , 0, ${this.Velocity3})`);
        } else {
            sk.fill(`rgba(0, 0, 0, 0)`);
        }
        
        sk.strokeWeight(sk.random(1, 2));
        sk.beginShape();
        // first controlpoint
        sk.curveVertex(x[formResolution - 1] + centerX, y[formResolution - 1] + centerY);

        // only these points are drawn
        for (var i = 0; i < 50; i++) {
            sk.curveVertex(x[i] + centerX, y[i] + centerY * mapTrebleB);
        }
        sk.curveVertex(x[0] + centerX, y[0] + centerY);

        // end controlpoint
        sk.curveVertex(x[1] + centerX, y[1] + centerY);
        sk.endShape();

        if (angle < 360) {
            angle = angle + 1;
        }

        if (angle == 360) {
            angle = 0;
        }
    }
}