/**
 * 各種canvasで共通して差し込みたいエフェクト
 */


const conf = {
    reset:39
}

export default class MidiControllTrait {
    /**
     * 
     * @param {Object} mh midiHandlerを受け取る 
     */
    constructor(mh){
        this.mh = mh;
        this.is_reset = false;
    }

    /**
     * 画面全域をホワイトアウトさせるリセット処理
     * scssに描画サポートの記述あり
     * @return {Boolean}
     */
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