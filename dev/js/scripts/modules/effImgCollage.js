import * as p5 from 'p5';

export default function effImgCollage(mh){
    if ($('#canvas3').length > 0) {
        let s = (sk) => {
            let layer1Images = [];
            let layer2Images = [];
            let layer3Images = [];

            let layer1Items = [];
            let layer2Items = [];
            let layer3Items = [];

            let is_fill = false;
            sk.preload = () => {
                layer1Images.push(sk.loadImage('../images/collage/layer1_01.png'));
                layer1Images.push(sk.loadImage('../images/collage/layer1_02.png'));
                layer1Images.push(sk.loadImage('../images/collage/layer1_03.png'));
                layer1Images.push(sk.loadImage('../images/collage/layer1_04.png'));
                layer1Images.push(sk.loadImage('../images/collage/layer1_05.png'));

                layer2Images.push(sk.loadImage('../images/collage/layer2_01.png'));
                layer2Images.push(sk.loadImage('../images/collage/layer2_02.png'));

                layer3Images.push(sk.loadImage('../images/collage/layer3_01.png'));
                layer3Images.push(sk.loadImage('../images/collage/layer3_02.png'));
                layer3Images.push(sk.loadImage('../images/collage/layer3_03.png'));
                layer3Images.push(sk.loadImage('../images/collage/layer3_04.png'));
            }

            sk.setup = async () => {
                const canvas = sk.createCanvas(sk.windowWidth, sk.windowHeight);
                canvas.parent('canvas3');
                sk.imageMode(sk.CENTER);

                sk.frameRate(30);

                layer1Items = generateCollageItems(layer1Images, 100, sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.5, 0, 0);
                layer2Items = generateCollageItems(layer2Images, 150, sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.3, -sk.HALF_PI, sk.HALF_PI);
                layer3Items = generateCollageItems(layer3Images, 110, sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.4, -sk.HALF_PI, sk.HALF_PI);

                drawCollageItems(layer1Items);
                drawCollageItems(layer2Items);
                drawCollageItems(layer3Items);
            }

            sk.draw = () => {
                if (mh.info.note == 70 && mh.info.velocity == 127) {
                    is_fill = true;
                } else if(mh.info.note == 70 && mh.info.velocity == 0) {
                    is_fill = false;
                }
                
                if (!is_fill){
                    sk.clear();
                    return;
                }

                const velocity = (mh.info.velocity) ? mh.info.velocity : 0.01;

                sk.frameRate(30);
                if (mh.info.note === 22) {
                    const mapVelocity = sk.map(velocity, 0, 127, 1, 4);
                    if (mapVelocity > 1 || 2 >= mapVelocity) layer1Items = generateCollageItems(layer1Images, sk.random(5, 15), sk.width / 2, sk.height / 2, sk.width, sk.height, 0.1, 0.5, 0, 0);
                    if (mapVelocity > 2 || 3 >= mapVelocity) layer2Items = generateCollageItems(layer2Images, sk.random(5, 8), sk.width / 6, sk.height / 6, sk.width, sk.height, 0.1, sk.random(0.3, 0.8), -sk.HALF_PI, sk.HALF_PI);
                    if (3 <= mapVelocity) layer3Items = generateCollageItems(layer3Images, sk.random(10, 60), sk.width / 2, sk.height / 2, sk.width / 2, sk.height / 2, 0.1, sk.random(0.2, 0.6), -sk.HALF_PI, sk.HALF_PI);

                    sk.clear();

                    drawCollageItems(layer1Items);
                    drawCollageItems(layer2Items);
                    drawCollageItems(layer3Items);
                }
            }

            function generateCollageItems(layerImages, count, posX, posY, rangeX, rangeY, scaleStart, scaleEnd, rotationStart, rotationEnd) {
                let layerItems = [];
                for (let i = 0; i < count; i++) {
                    const index = i % layerImages.length;
                    const item = new CollageItem(layerImages[index]);
                    item.x = posX + sk.random(-rangeX / 2, rangeX / 2);
                    item.y = posY + sk.random(-rangeY / 2, rangeY / 2);
                    item.scaling = sk.random(scaleStart, scaleEnd);
                    item.rotation = sk.random(rotationStart, rotationEnd);
                    layerItems.push(item);
                }
                return layerItems;
            }

            function CollageItem(image) {
                this.image = image;
                this.x = 0;
                this.y = 0;
                this.rotation = 0;
                this.scaling = 1;
            }

            function drawCollageItems(layerItems) {
                for (let i = 0; i < layerItems.length; i++) {
                    sk.push();
                    sk.translate(layerItems[i].x, layerItems[i].y);
                    sk.rotate(layerItems[i].rotation);
                    sk.scale(layerItems[i].scaling);
                    sk.image(layerItems[i].image, 0, 0);
                    sk.pop();
                }
            }
        }

        const P5 = new p5(s);
    }
}