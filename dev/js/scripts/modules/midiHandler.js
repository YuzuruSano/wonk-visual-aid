
import _ from 'lodash';

export default class MidiHandler {
    constructor() {
        this.requestMIDI = this.requestMIDI.bind(this);
        this.requestSuccess = this.requestSuccess.bind(this);
        this.requested = false;
        this.info = {
            on_off: null,
            note: null,
            velocity: null
        };
        this.getMidiEventVariable = this.getMidiEventVariable.bind(this);
        this.inputEvent = this.inputEvent.bind(this);
        this.midiDevices = {
            inputs:{},
            outputs:{}
        };
    }
    // MIDIデバイスにアクセスする
    async　requestMIDI(){
        if (navigator.requestMIDIAccess) {
            if(this.requested) return false;
            navigator.requestMIDIAccess().then(this.requestSuccess, this.requestError).then(() => {
                this.requested = true;
            });
        } else {
            this.requestError();
        }
    }
    // 成功したときの処理
    async requestSuccess(data){
        // Inputデバイスの配列を作成
        let inputIterator = data.inputs.values();

        let i = 0;
        for (let input = inputIterator.next(); !input.done; input = inputIterator.next()) {
            let value = input.value;
            if(value.manufacturer === 'KORG INC.'){
                // デバイス情報を保存
                this.midiDevices.inputs[i] = value;
                // イベント登録
                value.addEventListener('midimessage', e => this.inputEvent(e));
            };
            
            i++;
        }

        // Outputデバイスの配列を作成
        i = 0;
        let outputIterator = data.outputs.values();
        for (let output = outputIterator.next(); !output.done; output = outputIterator.next()) {
            let value = output.value;
            // デバイス情報を保存
            this.midiDevices.outputs[i] = value;
            i++;
        }
    }
    // 失敗したときの処理
    requestError(error){
        console.error('error!!!', error);
    }

    getMidiEventVariable(event){
        if (typeof event !== 'undefined' && event !== null){
            const target = event.target;
        }
        const on_off = (event.data) ? event.data[0].toString(16).substr(-2) : '';
        const note = (event.data) ? event.data[1]: '';
        const velocity = (event.data) ? event.data[2] : '';
        return {
            on_off : on_off,
            note : note,
            velocity : velocity
        } 
    }

    // Inputを受け取ったときのイベント
    inputEvent(ev){
        const _that = this;
        const event = this.getMidiEventVariable(ev);
        this.info = event;
    }
}