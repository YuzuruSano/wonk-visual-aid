import config from 'modules/config';

/**
 * 各種canvasで共通して差し込みたいエフェクト
 */

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
        const v = mh.info.velocity;
        
        switch (mh.info.note) {
            case config.reset_white:
                if (v > 64) {
                    body.classList.add("reset-white");
                    this.is_reset = true;
                } else if (v < 127) {
                    body.classList.remove("reset-white");
                    this.is_reset = false;
                }
                break;
            case config.reset_red:
                if (v > 64) {
                    body.classList.add("reset-red");
                    this.is_reset = true;
                } else if (v < 127) {
                    body.classList.remove("reset-red");
                    this.is_reset = false;
                }
                break;
            case config.reset_yellow:
                if (v > 64) {
                    body.classList.add("reset-yellow");
                    this.is_reset = true;
                } else if (v < 127) {
                    body.classList.remove("reset-yellow");
                    this.is_reset = false;
                }
                break;
            default:
                break;
        }
        

        
        return this.is_reset;
    }
}