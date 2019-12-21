const conf = {
    reset:39
}

export default class MidiControllTrait {
    constructor(mh){
        this.mh = mh;
        this.is_reset = false;
    }

    reset(){
        const body = document.body;
        const mh = this.mh;

        if (mh.info.note == conf.reset && mh.info.velocity > 64) {
            body.classList.add("reset");
            this.is_reset = true;
        } else if (mh.info.note == conf.reset && mh.info.velocity < 127) {
            body.classList.remove("reset");
            this.is_reset = false;
        }

        return this.is_reset;
    }
}