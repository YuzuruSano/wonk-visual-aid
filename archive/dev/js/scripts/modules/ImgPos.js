
let frame = 0;
export default class ImgPos {
    /**
    * パスから画像オブジェクトのdocument上の現在座標とパス追従の角度を返却する
    */
    getNowImgPosition(img, svgInfo, nowPathPosition, prevX = 0, prevY = 0, speed = 200){
        const svgViewBox = svgInfo.viewBox;
        const pathElement = svgInfo.element.querySelector('path');
        const maxPathLength = pathElement.getTotalLength();
        const svgClientRect = pathElement.getBoundingClientRect();

        const pt1 = pathElement.getPointAtLength(nowPathPosition);
        let x = (pt1.x * svgClientRect.width / svgViewBox.width);
        let y = (pt1.y * svgClientRect.height / svgViewBox.height);
        const originX = x;
        const originY = y;

        //x = (prevX < x) ? x - (img.width / 2) : x + (img.width / 2);
        //y = (prevY < y) ? y + (img.height / 2) : y - (img.height / 2);
        x = x - (img.width / 2);
        y = y - (img.height / 2)
        
        // if (frame == 200) {
        //     //noLoop();
        // }
        const r = this.getRotate(pathElement, nowPathPosition, maxPathLength, 200);
        frame++;
        return {
            x: x,
            y: y,
            r: r,
            originX: originX,
            originY: originY
        }
    }

    /**
     * パスの傾きを取得する
     * 
     * pathElement パスsvgのdom
     * nowPathPosition 現在のパス位置
     * maxPathLength パスの終点
     * curve 追従する回転角度の緩急
     */
    getRotate(pathElement, nowPathPosition, maxPathLength, curve) {
        //現在の位置からのラジアン計算ポイント1 数値を増やすと緩やかな変化に
        let roatateBase1 = nowPathPosition - curve;
        //現在の位置からのラジアン計算ポイント2 数値を増やすと緩やかな変化に
        let roatateBase2 = nowPathPosition + curve;

        if (roatateBase1 < 0) {
            roatateBase1 = 0;
        }
        if (roatateBase2 > maxPathLength) {
            roatateBase2 = maxPathLength;
        }

        const pt0 = pathElement.getPointAtLength(roatateBase1);
        const pt2 = pathElement.getPointAtLength(roatateBase2);

        const dx = pt2.x - pt0.x;
        const dy = pt2.y - pt0.y;
        let rotate = Math.atan(dy / dx);

        if (dx < 0) {
            rotate += Math.PI;
        }

        return rotate;
    }
}