import ImgPos from "modules/ImgPos";
import Motion from "modules/Motion";

const imgPos = new ImgPos();
const motion = new Motion();

export default class ImgInstance {
    setInstance(sk, obj){
        const settings = {
            currentImg: obj.currentImg || {},
            svgInfo:obj.svgInfo || {},
            nowPathPosition: obj.nowPathPosition || 0,
            prevX: obj.prevX || 0,
            prevY: obj.prevY || 0,
            isJumping: obj.isJumping || false,
            up: obj.up !== false || true,
            jumpStartAt: obj.jumpStartAt || 0,
            jumpMax: (obj.jumpMax != null) ? obj.jumpMax : 300,
            ...obj
        }
        
        let { currentImg, svgInfo, nowPathPosition, prevX, prevY, isJumping, jumpStartAt, jumpMax } = { ...settings};
        
        if (currentImg.height <= 0 ) return;
        
        const xoff = sk.random(0.5, 10);
        let n = sk.noise(xoff) * sk.random(200, 600);
        const speed = n;

        let currentX = 0;
        let currentY = 0;

        //現在の座標がpathの全長を越していたら0に初期化
        nowPathPosition = (nowPathPosition + speed / 100);
        if (nowPathPosition > obj.maxPathLength) {
            nowPathPosition = 0;
        }

        //画像の現在位置と傾きを取得
        const p = imgPos.getNowImgPosition(currentImg, svgInfo, nowPathPosition, prevX, prevY, speed);
        let { x, y, r, originX, originY } = { ...p };
        
        sk.push();
        currentImg.style('transform', `rotate(${r}rad) `);
        currentImg.style('transform-origin', `center`);
        
        //jump
        if(isJumping) {
            const param = {
                sk: sk,
                x: x,
                prevX: prevX,
                y: y,
                prevY: prevY,
                r: r,
                jumpStartAt: jumpStartAt
            }
            const jumpPos = motion.jump(param);
            const jumpX = jumpPos.x;
            const jumpY = jumpPos.y;
            
            if (jumpStartAt > jumpMax) {
                obj.up = false; 
            }
            
            if (obj.up) {
                jumpStartAt = jumpStartAt + (30 * 0.8);
            } else {
                jumpStartAt = jumpStartAt - (80 * 1.2);
            }
            
            if (jumpStartAt < 0) {
                obj.isJumping = false;
                obj.up = true;
                obj.jumpStartAt = 0;
            }else{
                obj.jumpStartAt = jumpStartAt;
            }

            currentX = (prevX < x) ? x - jumpX : x + jumpX;
            currentY = (prevY < y) ? y - jumpY : y + jumpY;
        } else {
            currentX = x;
            currentY = y;
        }
        
        currentImg.position(currentX, currentY);
        sk.pop();

        obj.nowPathPosition = nowPathPosition;
        obj.prevX = originX;
        obj.prevY = originY;
        obj.currentX = currentX;
        obj.currentY = currentY;
        obj.r = r;
        return obj;
    }
}