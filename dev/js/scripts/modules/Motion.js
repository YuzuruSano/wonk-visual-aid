export default class Motion {
    /**
     * 緩やかにジャンプする起動でx、y座標を返却する
     * @param {*} param 
     * sk p5オブジェクト
     * x 現在のx座標
     * prevX 前のフレームのx座標
     * y 前のフレームのy座標
     * prevY 前のフレームのy座標
     * r 現在のフレームで参照している角度
     * jumpStartAt ジャンプの基準値
     */
    jump(param){
        const p = {
            sk: param.sk || {},
            x: param.x || 0,
            prevX: param.prevX || 0,
            y: param.y || 0,
            prevY: param.prevY || 0,
            r: param.r || 0,
            jumpStartAt: param.jumpStartAt || 0
        }

        const { sk, x, prevX, y, prevY, r, jumpStartAt} = {...p}
        let jump;

        //右下方向移動中
        if ((x > prevX) && (y > prevY)) {
            jump = r * sk.radians(90) / 3 * -1;
        }
        //右上方向移動中
        if ((x > prevX) && (y < prevY)) {
            jump = sk.radians(90) * r;
            jump += Math.PI;
        }
        //左下方向移動中
        if ((x < prevX) && (y > prevY)) {
            jump = r
        }
        //左上方向移動中
        if ((x < prevX) && (y < prevY)) {
            jump = r * sk.radians(90);
        }
        
        return {
            x : sk.sin(jump) * jumpStartAt,
            y : sk.cos(jump) * jumpStartAt
        }
    }
}